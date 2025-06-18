import { Client } from "@microsoft/microsoft-graph-client";
import { ClientSecretCredential } from "@azure/identity";
import { getAzureCredentials } from "./authService.js";

// Define interfaces for Graph API responses
interface GraphResponse<T> {
  value: T;
  "@odata.nextLink"?: string;
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
  attendees?: Array<{
    type: string;
    status: {
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
