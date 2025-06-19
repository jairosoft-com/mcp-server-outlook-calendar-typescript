import { z } from "zod";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchCalendarEvents, formatCalendarEvents, createCalendarEvent, type CalendarEvent, CreateEventRequest } from "../services/graphService.js";

// Load environment variables
import dotenv from 'dotenv';
import ToolResponse from "../interfaces/getCalendarResponse.js";
dotenv.config();
import CalendarToolArgs from "../interfaces/calendarArgs.js";

/**
 * Validates and parses date input from the user
 * @param dateStr Date string in YYYY-MM-DD format
 * @param timezone IANA timezone string
 * @returns Date object in the specified timezone
 */
function parseDateInput(dateStr: string, timezone: string): Date {
  try {
    // Parse the input date (assumes YYYY-MM-DD format)
    const [year, month, day] = dateStr.split('-').map(Number);
    
    // Create a date in the specified timezone
    const localDate = new Date(Date.UTC(year, month - 1, day));
    
    // Convert to the target timezone
    return toZonedTime(localDate, timezone);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Invalid date format. Please use YYYY-MM-DD format. ${errorMessage}`);
  }
}

/**
 * Registers the calendar tools with the MCP server
 * @param server The MCP server instance
 */
export function registerCalendarTools(server: McpServer): void {
  // Define the schema for the tool parameters with defaults
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const paramsSchema = {
    user_id: z.string().default("me").describe("Microsoft Graph user ID or 'me' to use USER_ID from .env"),
    start_date: z.string().default(today).describe("Start date in YYYY-MM-DD format (default: today)"),
    end_date: z.string().default(tomorrowStr).describe("End date in YYYY-MM-DD format (default: tomorrow)"),
    timezone: z.string().default("Asia/Manila").describe("IANA timezone (default: Asia/Manila)")
  };

  // Register the tool with the server
  server.tool(
    "get-calendar-events",
    "Fetch calendar events for a user within a date range",
    paramsSchema,
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

  // Define the schema for create-calendar-event with simplified JSON input and placeholders
  const createEventSchema = {
    user_id: z.string()
      .default("me")
      .describe("Microsoft Graph user ID or 'me' to use USER_ID from .env"),
    
    subject: z.string()
      .default("Team Sync Meeting")
      .describe("Enter the event subject (e.g., 'Team Meeting')"),
    
    startDateTime: z.string()
      .default(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
      .describe("Start time in ISO format (e.g., 2025-06-20T14:00:00)"),
    
    endDateTime: z.string()
      .default(new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString())
      .describe("End time in ISO format (e.g., 2025-06-20T15:00:00)"),
    
    timeZone: z.string()
      .default("Asia/Manila")
      .describe("IANA timezone (e.g., 'Asia/Manila', 'America/New_York')"),
    
    location: z.string()
      .default("Virtual Meeting")
      .describe("Location (e.g., 'Conference Room 1' or 'Zoom Meeting')"),
    
    body: z.string()
      .default("This is a test event created from the MCP server.")
      .describe("Event description or agenda"),
    
    isOnlineMeeting: z.boolean()
      .default(true)
      .describe("Create an online meeting (true/false)"),
    
    isReminderOn: z.boolean()
      .default(true)
      .describe("Enable reminder (true/false)"),
    
    attendees: z.string()
      .default("")
      .describe("Comma-separated list of attendee emails (e.g., 'user1@example.com,user2@example.com')")
  };

    // Register the create-calendar-event tool with schema
  server.tool(
    'create-calendar-event',
    'Create a new calendar event with the specified parameters',
    createEventSchema,
    async (args: any) => {
      try {
        // Handle user_id from .env if 'me' is specified
        let { user_id, attendees, ...eventData } = args;
        
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

        // Process attendees if provided
        const attendeeList = typeof attendees === 'string' && attendees.trim() 
          ? attendees.split(',').map((email: string) => email.trim())
          : [];

        // Prepare the event data for the API
        const cleanEventData: CreateEventRequest = {
          subject: eventData.subject,
          start: {
            dateTime: eventData.startDateTime,
            timeZone: eventData.timeZone
          },
          end: {
            dateTime: eventData.endDateTime,
            timeZone: eventData.timeZone
          },
          ...(eventData.location && { 
            location: { 
              displayName: eventData.location,
              locationType: 'default'
            } 
          }),
          body: {
            contentType: 'text',
            content: eventData.body || ''
          },
          isOnlineMeeting: eventData.isOnlineMeeting,
          isReminderOn: eventData.isReminderOn === 'true',
          ...(attendeeList.length > 0 && {
            attendees: attendeeList.map((email: string) => ({
              emailAddress: { 
                address: email,
                name: email.split('@')[0]
              },
              type: "required" as const
            }))
          })
        };

        // Create the event using the Graph API
        const event = await createCalendarEvent(user_id, cleanEventData as CreateEventRequest) as any;
        
        // Helper function to safely format date
        const formatEventDate = (dateTimeStr?: string) => {
          if (!dateTimeStr) return 'Time not specified';
          try {
            const date = new Date(dateTimeStr);
            return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleString();
          } catch (error) {
            return 'Invalid date';
          }
        };

        // Format the response
        const responseText = [
          "✅ Event created successfully!",
          "",
          `📅 ${event.subject || 'No subject'}`,
          `🕒 ${formatEventDate(event.start?.dateTime)} - ${formatEventDate(event.end?.dateTime)}`,
          ...(event.location?.displayName ? [`📍 ${event.location.displayName}`] : []),
          ...(event.onlineMeeting?.joinUrl ? [`🔗 Join: ${event.onlineMeeting.joinUrl}`] : []),
          ...(attendeeList.length > 0 ? ["", "👥 Attendees:", ...attendeeList.map((email: string) => `   • ${email}`)] : [])
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
