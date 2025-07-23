import { z } from "zod";
import { GraphResponse, Event } from "../interface/calendarInterfaces";

// Shared authentication token
let currentAuthToken: string | undefined;

// Function to set the authentication token
export function setAuthToken(token: string | undefined) {
    currentAuthToken = token;
}

export function getCalendarEvents() {
    return {
        name: "getCalendarEvents",
        schema: {
            startDateTime: z.string().describe("Start date and time in ISO 8601 format (e.g., 2023-01-01T00:00:00)"),
            endDateTime: z.string().describe("End date and time in ISO 8601 format (e.g., 2023-01-31T23:59:59)"),
        },
        handler: async ({ startDateTime, endDateTime }: { startDateTime: string; endDateTime: string }) => {
            try {
                if (!currentAuthToken) {
                    throw new Error("Authentication token not found. Please configure the AUTH_TOKEN environment variable in your MCP server configuration.");
                }

                // Format the API URL with query parameters
                const url = new URL('https://graph.microsoft.com/v1.0/me/calendarView');
                url.searchParams.append('startDateTime', startDateTime);
                url.searchParams.append('endDateTime', endDateTime);
                url.searchParams.append('$select', 'subject,start,end,organizer,location');
                url.searchParams.append('$orderby', 'start/dateTime');

                // Make the API request
                const response = await fetch(url.toString(), {
                    headers: {
                        'Authorization': `Bearer ${currentAuthToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json() as { error?: { message?: string } };
                    throw new Error(`Microsoft Graph API error: ${errorData?.error?.message || response.statusText}`);
                }

                const data = await response.json() as GraphResponse<Event>;

                // Format the events for display
                const events = data.value.map(event => ({
                    subject: event.subject || 'No subject',
                    start: event.start?.dateTime || 'No start time',
                    end: event.end?.dateTime || 'No end time',
                    organizer: event.organizer?.emailAddress?.name || 'Unknown',
                    location: event.location?.displayName || 'No location',
                }));

                return {
                    content: [{
                        type: "text" as const,
                        text: events.length > 0 
                            ? JSON.stringify(events, null, 2)
                            : "No events found in the specified date range.",
                        _meta: {}
                    }]
                };

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                return {
                    content: [{
                        type: "text" as const,
                        text: `Error fetching calendar events: ${errorMessage}`,
                        _meta: {}
                    }],
                    isError: true
                };
            }
        }
    };
}

export function createCalendarEvent() {
    return {
        name: "createCalendarEvent",
        schema: {
            subject: z.string().min(1, "Subject is required"),
            start_datetime: z.string().describe("Start date and time in YYYY-MM-DDTHH:MM:SS format (e.g., 2025-06-20T14:00:00)"),
            end_datetime: z.string().describe("End date and time in YYYY-MM-DDTHH:MM:SS format"),
            timezone: z.string().default("Asia/Manila").describe("IANA timezone string (e.g., Asia/Manila, America/New_York)"),
            content: z.string().optional().default(""),
            is_online_meeting: z.boolean().default(true),
            attendees: z.array(z.string().email()).default(["team@example.com"]),
            location: z.string().default("Microsoft Teams Meeting"),
            importance: z.enum(["Low", "Normal", "High"]).default("Normal"),
            is_recurring: z.boolean().default(false),
            recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
            days_of_week: z.array(z.string()).optional(),
            recurrence_interval: z.number().int().positive().optional(),
            recurrence_range_type: z.enum(['noEnd', 'endDate', 'numbered']).optional(),
            recurrence_end_date: z.string().optional(),
            recurrence_occurrences: z.number().int().positive().optional(),
        },
        handler: async ({
            subject,
            start_datetime,
            end_datetime,
            timezone,
            content,
            is_online_meeting,
            attendees,
            location: locationName,
            importance,
            is_recurring,
            recurrence_type,
            days_of_week,
            recurrence_interval,
            recurrence_range_type,
            recurrence_end_date,
            recurrence_occurrences,
        }: {
            subject: string;
            start_datetime: string;
            end_datetime: string;
            timezone: string;
            content: string;
            is_online_meeting: boolean;
            attendees: string[];
            location: string;
            importance: "Low" | "Normal" | "High";
            is_recurring: boolean;
            recurrence_type?: 'daily' | 'weekly' | 'monthly' | 'yearly';
            days_of_week?: string[];
            recurrence_interval?: number;
            recurrence_range_type?: 'noEnd' | 'endDate' | 'numbered';
            recurrence_end_date?: string;
            recurrence_occurrences?: number;
        }) => {
            try {
                if (!currentAuthToken) {
                    throw new Error("Authentication token not found. Please configure the AUTH_TOKEN environment variable in your MCP server configuration.");
                }

                // Build the event payload
                const eventPayload: any = {
                    subject,
                    body: {
                        contentType: "HTML",
                        content: content || ""
                    },
                    start: {
                        dateTime: start_datetime,
                        timeZone: timezone
                    },
                    end: {
                        dateTime: end_datetime,
                        timeZone: timezone
                    },
                    location: {
                        displayName: locationName
                    },
                    isOnlineMeeting: is_online_meeting,
                    importance,
                    attendees: attendees.map(email => ({
                        emailAddress: {
                            address: email
                        },
                        type: "required"
                    }))
                };

                // Add recurrence if needed
                if (is_recurring && recurrence_type) {
                    const recurrence: any = {
                        pattern: {
                            type: recurrence_type,
                            interval: recurrence_interval || 1
                        },
                        range: {
                            type: recurrence_range_type || "noEnd"
                        }
                    };

                    if (recurrence_type === 'weekly' && days_of_week?.length) {
                        recurrence.pattern.daysOfWeek = days_of_week.map(day => day.toLowerCase());
                    }

                    if (recurrence_range_type === 'endDate' && recurrence_end_date) {
                        recurrence.range.startDate = start_datetime.split('T')[0];
                        recurrence.range.endDate = recurrence_end_date.split('T')[0];
                    } else if (recurrence_range_type === 'numbered' && recurrence_occurrences) {
                        recurrence.range.numberOfOccurrences = recurrence_occurrences;
                    }

                    eventPayload.recurrence = recurrence;
                }

                // Make the API request to create the event
                const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${currentAuthToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(eventPayload)
                });

                if (!response.ok) {
                    const errorData = await response.json() as { error?: { message?: string } };
                    throw new Error(`Microsoft Graph API error: ${errorData?.error?.message || response.statusText}`);
                }

                const createdEvent = await response.json() as {
                    subject: string;
                    start?: { dateTime?: string };
                    end?: { dateTime?: string };
                    onlineMeeting?: { joinUrl?: string };
                };

                return {
                    content: [{
                        type: "text" as const,
                        text: `Event created successfully!\nSubject: ${createdEvent.subject}\nStart: ${createdEvent.start?.dateTime || 'N/A'}\nEnd: ${createdEvent.end?.dateTime || 'N/A'}\nJoin URL: ${createdEvent.onlineMeeting?.joinUrl || 'N/A'}`,
                        _meta: {}
                    }]
                };

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                return {
                    content: [{
                        type: "text" as const,
                        text: `Error creating calendar event: ${errorMessage}`,
                        _meta: {}
                    }],
                    isError: true
                };
            }
        }
    };
}
