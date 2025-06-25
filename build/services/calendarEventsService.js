"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatedClient = getAuthenticatedClient;
exports.fetchCalendarEvents = fetchCalendarEvents;
exports.createCalendarEvent = createCalendarEvent;
exports.formatCalendarEvents = formatCalendarEvents;
const microsoft_graph_client_1 = require("@microsoft/microsoft-graph-client");
const authService_js_1 = require("./authService.js");
/**
 * Get an authenticated Microsoft Graph client
 * @returns Authenticated Graph client
 */
function getAuthenticatedClient() {
    const credentials = (0, authService_js_1.getAzureCredentials)();
    // Initialize the client with auth provider
    const client = microsoft_graph_client_1.Client.initWithMiddleware({
        authProvider: {
            getAccessToken: async () => {
                // Request token with the required scopes
                const tokenResponse = await credentials.getToken("https://graph.microsoft.com/.default");
                return tokenResponse.token;
            }
        }
    });
    return client;
}
/**
 * Fetch calendar events for a user within a date range
 * @param userId User ID or 'me' for current user
 * @param startDate Start date for events
 * @param endDate End date for events
 * @returns Array of calendar events
 */
async function fetchCalendarEvents(userId, startDate, endDate) {
    const client = getAuthenticatedClient();
    const allEvents = [];
    let nextLink;
    try {
        // Format dates for the API
        const startDateTime = startDate.toISOString();
        const endDateTime = endDate.toISOString();
        // Initial request
        let response = await client
            .api(`/users/${userId}/calendar/calendarView`)
            .query({
            startDateTime,
            endDateTime,
            $select: 'subject,start,end,organizer,attendees,bodyPreview,webLink',
            $orderby: 'start/dateTime',
            $top: 100
        })
            .get();
        allEvents.push(...response.value);
        nextLink = response["@odata.nextLink"];
        // Handle pagination if there are more events
        while (nextLink) {
            response = await client.api(nextLink).get();
            allEvents.push(...response.value);
            nextLink = response["@odata.nextLink"];
        }
        return allEvents;
    }
    catch (error) {
        console.error('Error fetching calendar events:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch calendar events: ${errorMessage}`);
    }
}
async function createCalendarEvent(userId, eventData) {
    const client = getAuthenticatedClient();
    const timeZone = 'Asia/Manila';
    try {
        // Ensure required fields are present
        if (!eventData.subject) {
            throw new Error('Event subject is required');
        }
        if (!eventData.start_datetime || !eventData.end_datetime) {
            throw new Error('Event start and end times are required');
        }
        // Prepare the event payload for Microsoft Graph API
        const eventPayload = {
            subject: eventData.subject,
            body: {
                contentType: 'html',
                content: eventData.body?.content || ''
            },
            start: {
                dateTime: eventData.start_datetime,
                timeZone: timeZone
            },
            end: {
                dateTime: eventData.end_datetime,
                timeZone: timeZone
            },
            isOnlineMeeting: eventData.is_online_meeting,
            importance: eventData.importance || 'normal',
            responseRequested: true
        };
        // Handle location
        if (eventData.location) {
            eventPayload.location = {
                displayName: eventData.location
            };
        }
        // Handle attendees
        if (eventData.attendees && eventData.attendees.length > 0) {
            eventPayload.attendees = eventData.attendees
                .filter((email) => typeof email === 'string' && email.includes('@'))
                .map(email => {
                const trimmedEmail = email.trim();
                return {
                    emailAddress: {
                        address: trimmedEmail,
                        name: trimmedEmail.split('@')[0]
                    },
                    type: 'required'
                };
            });
        }
        // Handle recurrence if specified
        if (eventData.recurrence) {
            const { type, interval, range_type, end_date, number_of_occurrences } = eventData.recurrence;
            const pattern = {
                type: type,
                interval: interval || 1
            };
            // Get the start date once to use for calculations
            const startDate = new Date(eventData.start_datetime);
            // Handle recurrence patterns based on type
            switch (type) {
                case 'weekly':
                    // Handle weekly recurrence
                    if (eventData.days_of_week?.length) {
                        // Capitalize first letter of each day to match Microsoft Graph API requirements
                        pattern.daysOfWeek = eventData.days_of_week.map((day) => day.charAt(0).toUpperCase() + day.slice(1).toLowerCase());
                    }
                    else {
                        // If no days specified, default to the day of the start date
                        const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][startDate.getDay()];
                        pattern.daysOfWeek = [dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)];
                    }
                    break;
                case 'absoluteMonthly':
                    // For absolute monthly, use the day of the month from the start date
                    // This ensures the event recurs on the same day of the month as the start date
                    pattern.dayOfMonth = startDate.getDate();
                    break;
                case 'relativeMonthly':
                    // For relative monthly, calculate the week day and week index from the start date
                    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][startDate.getDay()];
                    // Calculate which week of the month this date falls on (1-5)
                    const day = startDate.getDate();
                    const weekOfMonth = Math.ceil(day / 7);
                    // Get the last day of the month to check if this is the last week
                    const lastDayOfMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                    // Determine the week index (first, second, third, fourth, or last)
                    let weekIndex;
                    if (day + 7 > lastDayOfMonth) {
                        weekIndex = 'last';
                    }
                    else {
                        const indexMap = ['first', 'second', 'third', 'fourth'];
                        weekIndex = indexMap[weekOfMonth - 1] || 'last';
                    }
                    // Set the pattern properties
                    pattern.daysOfWeek = [dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)];
                    pattern.index = weekIndex;
                    break;
                case 'monthly':
                    // For backward compatibility, treat 'monthly' the same as 'absoluteMonthly'
                    pattern.type = 'absoluteMonthly'; // Explicitly set the type
                    pattern.dayOfMonth = startDate.getDate();
                    break;
            }
            const range = {
                type: range_type,
                startDate: new Date(eventData.start_datetime).toISOString().split('T')[0],
                recurrenceTimeZone: timeZone
            };
            if (range_type === 'endDate' && end_date) {
                range.endDate = end_date;
            }
            else if (range_type === 'numbered' && number_of_occurrences) {
                range.numberOfOccurrences = number_of_occurrences;
            }
            // Log the pattern for debugging
            console.error('Recurrence pattern:', JSON.stringify({
                type: pattern.type,
                interval: pattern.interval,
                daysOfWeek: pattern.daysOfWeek,
                dayOfMonth: pattern.dayOfMonth,
                month: pattern.month,
                firstDayOfWeek: pattern.firstDayOfWeek,
                index: pattern.index
            }, null, 2));
            // Convert to PatternedRecurrence format expected by Microsoft Graph
            eventPayload.recurrence = {
                pattern: {
                    type: pattern.type,
                    interval: pattern.interval,
                    // Include daysOfWeek for weekly patterns
                    ...(pattern.daysOfWeek && { daysOfWeek: pattern.daysOfWeek }),
                    ...(pattern.dayOfMonth && { dayOfMonth: pattern.dayOfMonth }),
                    ...(pattern.month && { month: pattern.month }),
                    ...(pattern.firstDayOfWeek && { firstDayOfWeek: pattern.firstDayOfWeek }),
                    ...(pattern.index && { index: pattern.index })
                },
                range: {
                    type: range.type,
                    startDate: range.startDate,
                    ...(range.endDate && { endDate: range.endDate }),
                    ...(range.numberOfOccurrences && { numberOfOccurrences: range.numberOfOccurrences }),
                    recurrenceTimeZone: range.recurrenceTimeZone
                }
            };
            // Log the full event payload for debugging
            console.error('Sending event payload to Microsoft Graph:', JSON.stringify(eventPayload, null, 2));
        }
        // Create the event using Microsoft Graph API
        const createdEvent = await client
            .api(`/users/${userId}/events`)
            .post(eventPayload);
        return createdEvent;
    }
    catch (error) {
        console.error('Error creating calendar event:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to create calendar event: ${errorMessage}`);
    }
}
/**
 * Format calendar events for the MCP response
 * @param events Array of calendar events
 * @returns Formatted events array
 */
function formatCalendarEvents(events) {
    return events.map(event => {
        // Extract organizer info
        const organizerName = event.organizer?.emailAddress?.name ||
            event.organizer?.email_address?.name || 'Unknown';
        const organizerEmail = event.organizer?.emailAddress?.address ||
            event.organizer?.email_address?.address;
        // Process attendees
        const attendees = event.attendees?.map(attendee => {
            const name = attendee.emailAddress?.name ||
                attendee.email_address?.name || 'Unknown';
            const email = attendee.emailAddress?.address ||
                attendee.email_address?.address;
            return {
                name,
                email,
                type: attendee.type,
                status: attendee.status?.response
            };
        }) || [];
        return {
            id: event.id,
            subject: event.subject || 'No subject',
            start: event.start,
            end: event.end,
            organizer: {
                name: organizerName,
                email: organizerEmail
            },
            attendees,
            bodyPreview: event.bodyPreview,
            webLink: event.webLink
        };
    });
}
