import { formatInTimeZone, toZonedTime, format } from "date-fns-tz";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  fetchCalendarEvents, 
  formatCalendarEvents, 
  createCalendarEvent, 
  CreateEventRequest } from "../services/calendarEventsService.js";
import dotenv from 'dotenv';
import ToolResponse from "../interfaces/getCalendarResponse.js";
import CalendarToolArgs from "../interfaces/calendarArgs.js";
import { createEventToolSchema } from "../schemas/createEventSchema.js";
import { fetchCalendarEventsSchema } from "../schemas/fetchCalendarEventsSchema.js";
import { parseDateInput } from "../utils/helpers.js";
dotenv.config();

// Helper function to format date in a specific timezone without timezone offset
const formatInTimeZoneNoOffset = (date: Date | string, timeZone: string, formatStr: string) => {
  const zonedDate = toZonedTime(date, timeZone);
  return format(zonedDate, formatStr, { timeZone });
};

/**
 * Validates and parses date input from the user
 * @param dateStr Date string in YYYY-MM-DD format
 * @param timezone IANA timezone string
 * @returns Date object in the specified timezone
 */

/**
 * Registers the calendar tools with the MCP server
 * @param server The MCP server instance
 */

export function registerCalendarTools(server: McpServer): void {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Register the Get Calendar Events tool with the server
  server.tool(
    "get-calendar-events",
    "Fetch calendar events for a user within a date range",
    fetchCalendarEventsSchema,
    async (args: unknown) => {
      // Get parameters with defaults
      let { 
        user_id = 'me', 
        start_date = today, 
        end_date = tomorrowStr, 
        timezone = 'Asia/Manila' 
      } = args as CalendarToolArgs;
      
      // If user_id is 'me', use the USER_ID from .env
      if (user_id === 'me') {
        if (!process.env.USER_ID) {
          return {
            content: [{
              type: "text",
              text: "Error: USER_ID is not set in .env file"
            }]
          };
        }
        user_id = process.env.USER_ID;
      }
      try {
        // Parse dates with provided or default values
        const startDate = parseDateInput(start_date || today, timezone || 'Asia/Manila');
        const endDate = parseDateInput(end_date || tomorrowStr, timezone || 'Asia/Manila');
        
        // Add one day to end date to include the full day
        endDate.setDate(endDate.getDate() + 1);
        
        // Fetch events from Microsoft Graph
        const events = await fetchCalendarEvents(user_id, startDate, endDate);
        const formattedEvents = formatCalendarEvents(events);
        
        // Format dates in the response to be more readable
        const formatDate = (date: Date) => 
          formatInTimeZone(date, timezone, 'yyyy-MM-dd HH:mm:ss zzz');
        
        // Format events for human-readable display
        const formatEventTime = (dateStr: string) => {
          const date = new Date(dateStr);
          return formatInTimeZone(date, timezone, 'MMM d, yyyy h:mm a');
        };

        // Create a human-readable summary of events
        let eventsSummary = `📅 Found ${formattedEvents.length} events between ${start_date} and ${end_date}\n\n`;
        
        if (formattedEvents.length > 0) {
          eventsSummary += formattedEvents.map((event: any, index) => {
            const startTime = formatEventTime(event.start.dateTime);
            const endTime = formatEventTime(event.end.dateTime);
            const organizerName = event.organizer?.name || 'No organizer';
            const organizerEmail = event.organizer?.email ? ` <${event.organizer.email}>` : '';
            const attendees = event.attendees || [];
            const attendeeCount = attendees.length;
            
            let attendeeList = '';
            if (attendeeCount > 0) {
              attendeeList = '   👥 Attendees:\n' + 
                attendees.map((attendee: { name?: string; email?: string }) => {
                  const name = attendee.name || 'No name';
                  const email = attendee.email ? ` <${attendee.email}>` : '';
                  return `      • ${name}${email}`;
                }).join('\n');
            }
            
            return `${index + 1}. ${event.subject || 'No Subject'}\n` +
                   `   📅 ${startTime} - ${endTime}\n` +
                   `   👤 Organizer: ${organizerName}${organizerEmail}\n` +
                   (attendeeCount > 0 ? `${attendeeList}\n` : '   👥 No attendees\n') +
                   (event.bodyPreview ? `   📝 ${event.bodyPreview.substring(0, 100)}${event.bodyPreview.length > 100 ? '...' : ''}\n` : '') +
                   (event.webLink ? `   🔗 ${event.webLink}\n` : '');
          }).join('\n');
        } else {
          eventsSummary += 'No events found in the specified date range.';
        }

        // Prepare the detailed response data
        const responseData = {
          count: formattedEvents.length,
          events: formattedEvents.map(event => ({
            ...event,
            start: formatDate(new Date(event.start.dateTime)),
            end: formatDate(new Date(event.end.dateTime))
          }))
        };

        // Create response with both human-readable and structured data
        const response: ToolResponse = {
          content: [
            {
              type: "text",
              text: eventsSummary
            },
            {
              type: "resource",
              resource: {
                text: "Detailed Calendar Events",
                uri: `data:application/json,${encodeURIComponent(JSON.stringify(responseData))}`,
                mimeType: "application/json"
              }
            },
            // Add raw events for debugging
            {
              type: "resource",
              resource: {
                text: "Raw Events (Debug)",
                uri: `data:application/json,${encodeURIComponent(JSON.stringify(events, null, 2))}`,
                mimeType: "application/json"
              }
            },
            // Add formatted events for debugging
            {
              type: "resource",
              resource: {
                text: "Formatted Events (Debug)",
                uri: `data:application/json,${encodeURIComponent(JSON.stringify(formattedEvents, null, 2))}`,
                mimeType: "application/json"
              }
            }
          ]
        };
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: "text",
              text: `Error: ${errorMessage}`
            }
          ]
        };
      }
    }
  );

  // Register the create-calendar-event tool
  server.tool(
    'create-calendar-event',
    'Create a new calendar event with the specified parameters',
    createEventToolSchema,
    async (args: any) => {
      try {
        // Handle user_id from .env if 'me' is specified
        let { 
          user_id, 
          is_recurring, 
          recurrence_type, 
          recurrence_interval, 
          recurrence_range_type, 
          recurrence_end_date, 
          recurrence_occurrences,
          ...eventData 
        } = args;
        
        // Initialize event data with days_of_week if provided
        const eventDataWithRecurrence = {
          ...eventData,
          // Add days_of_week to the main event data if it exists
          ...(args.days_of_week?.length && { days_of_week: args.days_of_week })
        };
        
        // Handle recurrence if specified
        if (is_recurring) {
          const recurrence: any = {
            type: recurrence_type,
            interval: recurrence_interval || 1,
            range_type: recurrence_range_type,
            ...(recurrence_range_type === 'endDate' && recurrence_end_date && { end_date: recurrence_end_date }),
            ...(recurrence_range_type === 'numbered' && recurrence_occurrences && { number_of_occurrences: recurrence_occurrences })
          };

          // Add recurrence pattern based on type
          if (recurrence_type === 'weekly' && args.days_of_week?.length) {
            // For weekly recurrence, add days of week
            recurrence.days_of_week = args.days_of_week;
            eventDataWithRecurrence.days_of_week = args.days_of_week;
          } else if (recurrence_type === 'absoluteMonthly' && args.month_day) {
            // For absolute monthly recurrence, add day of month
            recurrence.month_day = args.month_day;
          } else if (recurrence_type === 'relativeMonthly' && args.week_day && args.week_index) {
            // For relative monthly recurrence, add day of week and week index
            recurrence.week_day = args.week_day;
            recurrence.week_index = args.week_index;
          }

          eventDataWithRecurrence.recurrence = recurrence;
        }
        
        // Use the event data with recurrence for the rest of the function
        const finalEventData = eventDataWithRecurrence;
        
        if (user_id === 'me') {
          if (!process.env.USER_ID) {
            return {
              content: [{
                type: "text",
                text: "Error: USER_ID is not set in .env file"
              }]
            };
          }
          user_id = process.env.USER_ID;
        }

        // Process attendees if provided (handle both string and array formats)
        const attendeeList = Array.isArray(finalEventData.attendees) 
          ? finalEventData.attendees.filter((email: any) => typeof email === 'string' && email.includes('@'))
          : [];

        // Prepare the event data for the API
        const cleanEventData = {
          subject: finalEventData.subject,
          start_datetime: finalEventData.start_datetime,
          end_datetime: finalEventData.end_datetime,
          is_online_meeting: finalEventData.is_online_meeting,
          location: finalEventData.location,
          importance: finalEventData.importance,
          body: {
            content: finalEventData.content,
            contentType: 'html'
          },
          ...(attendeeList.length > 0 && { attendees: attendeeList }),
          ...(finalEventData.days_of_week && { days_of_week: finalEventData.days_of_week }),
          ...(finalEventData.recurrence && { recurrence: finalEventData.recurrence })
        };
        
        console.error('Creating event with data:', JSON.stringify(cleanEventData, null, 2));

        // Create the event using the Graph API
        const event = await createCalendarEvent(user_id, cleanEventData);
        
        // Helper function to format date in the event's timezone
        const formatEventDate = (dateTimeStr?: string, timeZone: string = eventData.timezone) => {
          if (!dateTimeStr) return 'Time not specified';
          try {
            const date = new Date(dateTimeStr);
            if (isNaN(date.getTime())) return 'Invalid date';
            // Format as YYYY-MM-DDTHH:MM:SS to match input format
            return formatInTimeZoneNoOffset(date, timeZone, "yyyy-MM-dd'T'HH:mm:ss");
          } catch (error) {
            return 'Invalid date';
          }
        };

        // Format the response
        const formatAttendees = (attendees: any[] = []) => {
          return attendees.map(attendee => {
            const email = attendee.emailAddress?.address || attendee.email_address?.address || 'unknown';
            const name = attendee.emailAddress?.name || attendee.email_address?.name || email.split('@')[0];
            return `   • ${name} <${email}>`;
          });
        };

        // Get location from the response
        const eventLocation = typeof event.location === 'string' 
          ? event.location 
          : event.location?.displayName || 'No location specified';

        // Get online meeting URL if available
        const onlineMeetingUrl = event.onlineMeeting?.joinUrl || 
                               (typeof event.onlineMeeting === 'string' ? event.onlineMeeting : undefined);

        const responseText = [
          "✅ Event created successfully!",
          "",
          `📅 ${event.subject || 'No subject'}`,
          `🕒 ${formatEventDate(event.start?.dateTime)} - ${formatEventDate(event.end?.dateTime)}`,
          `📍 ${eventLocation}`,
          ...(onlineMeetingUrl ? [`🔗 Join: ${onlineMeetingUrl}`] : []),
          ...(event.attendees?.length ? ["", "👥 Attendees:", ...formatAttendees(event.attendees)] : [])
        ].join('\n');

        return {
          content: [{
            type: 'text',
            text: responseText
          }],
          _meta: {
            event: event,
            success: true
          }
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('Error creating calendar event:', error);
        return {
          content: [{
            type: 'text',
            text: `❌ Error creating calendar event: ${errorMessage}`
          }],
          _meta: {
            error: true,
            errorMessage: errorMessage
          }
        };
      }
    }
  );
}
