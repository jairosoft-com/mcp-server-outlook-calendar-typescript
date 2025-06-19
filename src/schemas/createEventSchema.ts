
import { z } from "zod";

export const createEventSchema = {
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