import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { getAzureCredentials } from "./authService.js";

// Define interfaces for Graph API responses
interface GraphResponse<T> {
  value: T;
  "@odata.nextLink"?: string;
}

// Interfaces for creating events
export interface EmailAddress {
  address: string;
  name?: string;
}

export interface EventAttendee {
  emailAddress: EmailAddress;
  type?: 'required' | 'optional' | 'resource';
  status?: {
    response: 'none' | 'organizer' | 'tentativelyAccepted' | 'accepted' | 'declined' | 'notResponded';
    time?: string;
  };
}

export interface EventLocation {
  displayName: string;
  locationType?: 'default' | 'conferenceRoom' | 'homeAddress' | 'businessAddress' | 'geoCoordinates' | 'streetAddress' | 'hotel' | 'restaurant' | 'localBusiness' | 'postalAddress';
  uniqueId?: string;
  uniqueIdType?: 'unknown' | 'locationStore' | 'directory' | 'private' | 'bing';
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
  interval: number;
  month?: number;
  dayOfMonth?: number;
  daysOfWeek?: string[];
  firstDayOfWeek?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
}

export interface RecurrenceRange {
  type: 'endDate' | 'noEnd' | 'numbered';
  startDate: string; // ISO date string
  endDate?: string;   // ISO date string
  numberOfOccurrences?: number;
  recurrenceTimeZone?: string;
}

export interface PatternedRecurrence {
  pattern: RecurrencePattern;
  range: RecurrenceRange;
}

export interface DateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface ItemBody {
  contentType: 'text' | 'html';
  content: string;
}

export interface CreateEventRequest {
  subject: string;
  body?: ItemBody;
  start: DateTimeTimeZone;
  end: DateTimeTimeZone;
  location?: EventLocation;
  locations?: EventLocation[];
  attendees?: EventAttendee[];
  isOnlineMeeting?: boolean;
  onlineMeetingProvider?: 'teamsForBusiness' | 'skypeForBusiness' | 'teamsForConsumer';
  isAllDay?: boolean;
  importance?: 'low' | 'normal' | 'high';
  recurrence?: PatternedRecurrence;
  responseRequested?: boolean;
  allowNewTimeProposals?: boolean;
  transactionId?: string;
  originalStartTimeZone?: string;
  originalEndTimeZone?: string;
  iCalUId?: string;
  reminderMinutesBeforeStart?: number;
  isReminderOn?: boolean;
  hasAttachments?: boolean;
  categories?: string[];
  seriesMasterId?: string;
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  type?: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
}

export interface CalendarEvent {
  id: string;
  subject: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  organizer: {
    emailAddress?: {
      address: string;
      name: string;
    };
    email_address?: {
      address: string;
      name: string;
    };
  };
  location?: string | EventLocation | null;
  onlineMeeting?: {
    joinUrl?: string;
    [key: string]: any;
  } | null;
  attendees?: Array<{
    type: string;
    status?: {
      response: string;
      time: string;
    };
    emailAddress?: {
      address: string;
      name: string;
    };
    email_address?: {
      address: string;
      name: string;
    };
  }>;
  bodyPreview?: string;
  webLink?: string;
  [key: string]: any; // Allow additional properties
}

/**
 * Get an authenticated Microsoft Graph client
 * @returns Authenticated Graph client
 */
export function getAuthenticatedClient(): Client {
  const credentials = getAzureCredentials();
  
  // Initialize the client with auth provider
  const client = Client.initWithMiddleware({
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
export async function fetchCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEvent[]> {
  const client = getAuthenticatedClient();
  const allEvents: CalendarEvent[] = [];
  let nextLink: string | undefined;

  try {
    // Format dates for the API
    const startDateTime = startDate.toISOString();
    const endDateTime = endDate.toISOString();

    // Initial request
    let response: GraphResponse<CalendarEvent[]> = await client
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
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to fetch calendar events: ${errorMessage}`);
  }
}

/**
 * Create a new calendar event (supports both regular and recurring events)
 * @param userId User ID or 'me' for current user
 * @param eventData Event data to create
 * @returns The created calendar event
 */
// Extended interface for the event data we expect to receive
export interface CreateEventRequestExtended extends Omit<CreateEventRequest, 'start' | 'end' | 'attendees' | 'location' | 'isOnlineMeeting' | 'importance' | 'body' | 'recurrence'> {
  start_datetime: string;
  end_datetime: string;
  is_online_meeting?: boolean;
  days_of_week?: string[];
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'absoluteMonthly' | 'relativeMonthly' | 'absoluteYearly' | 'relativeYearly';
    interval: number;
    range_type: 'endDate' | 'noEnd' | 'numbered';
    end_date?: string;
    number_of_occurrences?: number;
    month_day?: number;
    week_day?: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
    week_index?: 'first' | 'second' | 'third' | 'fourth' | 'last';
  };
  attendees?: string[];
  importance?: string;
  location?: string; // We'll convert this to EventLocation in the function
  body?: {
    content: string;
    contentType?: 'text' | 'html';
  };
  [key: string]: any; // For any additional properties
}

export async function createCalendarEvent(
  userId: string,
  eventData: CreateEventRequestExtended
): Promise<CalendarEvent> {
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
    const eventPayload: CreateEventRequest = {
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
      importance: (eventData.importance as 'low' | 'normal' | 'high') || 'normal',
      responseRequested: true
    };

    // Handle location
    if (eventData.location) {
      eventPayload.location = {
        displayName: eventData.location as unknown as string
      };
    }

    // Handle attendees
    if (eventData.attendees && eventData.attendees.length > 0) {
      eventPayload.attendees = eventData.attendees
        .filter((email): email is string => typeof email === 'string' && email.includes('@'))
        .map(email => {
          const trimmedEmail = email.trim();
          return {
            emailAddress: {
              address: trimmedEmail,
              name: trimmedEmail.split('@')[0]
            },
            type: 'required' as const
          };
        });
    }

    // Handle recurrence if specified
    if (eventData.recurrence) {
      const { type, interval, range_type, end_date, number_of_occurrences } = eventData.recurrence;
      
      const pattern: RecurrencePattern = {
        type: type as any,
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
            pattern.daysOfWeek = eventData.days_of_week.map((day: string) => 
              day.charAt(0).toUpperCase() + day.slice(1).toLowerCase()
            );
          } else {
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
          let weekIndex: 'first' | 'second' | 'third' | 'fourth' | 'last';
          if (day + 7 > lastDayOfMonth) {
            weekIndex = 'last';
          } else {
            const indexMap = ['first', 'second', 'third', 'fourth'] as const;
            weekIndex = indexMap[weekOfMonth - 1] || 'last';
          }
          
          // Set the pattern properties
          pattern.daysOfWeek = [dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)];
          pattern.index = weekIndex;
          break;
          
        case 'monthly':
          // For backward compatibility, treat 'monthly' the same as 'absoluteMonthly'
          pattern.type = 'absoluteMonthly';  // Explicitly set the type
          pattern.dayOfMonth = startDate.getDate();
          break;
      }

      const range: RecurrenceRange = {
        type: range_type,
        startDate: new Date(eventData.start_datetime).toISOString().split('T')[0],
        recurrenceTimeZone: timeZone
      };

      if (range_type === 'endDate' && end_date) {
        range.endDate = end_date;
      } else if (range_type === 'numbered' && number_of_occurrences) {
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
      } as PatternedRecurrence;

      // Log the full event payload for debugging
      console.error('Sending event payload to Microsoft Graph:', JSON.stringify(eventPayload, null, 2));
    }

    // Create the event using Microsoft Graph API
    const createdEvent = await client
      .api(`/users/${userId}/events`)
      .post(eventPayload);

    return createdEvent;
  } catch (error: unknown) {
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
export function formatCalendarEvents(events: CalendarEvent[]) {
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
