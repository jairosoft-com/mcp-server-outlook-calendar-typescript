import { z } from "zod";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { fetchCalendarEvents, formatCalendarEvents, type CalendarEvent } from "../services/graphService.js";

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
          eventsSummary += (formattedEvents as unknown as CalendarEvent[]).map((event, index) => {
            const startTime = formatEventTime(event.start.dateTime);
            const endTime = formatEventTime(event.end.dateTime);
            const organizerName = event.organizer?.emailAddress?.name || 'No organizer';
            const attendeeCount = event.attendees?.length || 0;
            
            return `${index + 1}. ${event.subject || 'No Subject'}\n` +
                   `   📅 ${startTime} - ${endTime}\n` +
                   `   👤 ${organizerName}\n` +
                   (attendeeCount > 0 ? `   👥 ${attendeeCount} attendee${attendeeCount > 1 ? 's' : ''}\n` : '') +
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
}
