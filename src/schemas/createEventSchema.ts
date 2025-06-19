import { z } from 'zod';

// Helper function to validate and convert date string to ISO format
const parseCustomDateTime = (val: string): string => {
  // Check if it's already in ISO format
  if (val.includes('T') && (val.endsWith('Z') || val.includes('+'))) {
    return new Date(val).toISOString();
  }
  
  // Try to parse YYYY-MM-DD-HH:MM:SS format
  const match = val.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2}):?(\d{2}):?(\d{2})$/);
  if (match) {
    const [_, year, month, day, hours, minutes, seconds] = match;
    // Create a date string in local time (without timezone)
    const dateTimeStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
    return dateTimeStr;
  }
  
  throw new Error('Invalid date format. Use YYYY-MM-DD-HH:MM:SS or ISO format');
};

// Helper to get default start time (current time + 1 hour)
const getDefaultStartTime = () => {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0, 0, 0);
  return now;
};

// Helper to format date to YYYY-MM-DD-HH:MM:SS
const formatDateTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

export const createEventSchema = z.object({
  user_id: z.string()
    .default("me")
    .describe("Microsoft Graph user ID or 'me' to use USER_ID from .env. Example: me"),
    
  subject: z.string()
    .min(1, 'Subject is required')
    .default("Team Meeting")
    .describe("The subject of the event. Example: Team Sync"),
    
  startDateTime: z.string()
    .min(1, 'Start date and time is required')
    .default(() => formatDateTime(getDefaultStartTime()))
    .transform(parseCustomDateTime)
    .describe('The start date and time in YYYY-MM-DD-HH:MM:SS format. Example: 2025-06-20-14:00:00 for 2:00 PM'),
    
  endDateTime: z.string()
    .min(1, 'End date and time is required')
    .default(() => formatDateTime((() => {
      const start = getDefaultStartTime();
      start.setHours(start.getHours() + 1);
      return start;
    })()))
    .transform(parseCustomDateTime)
    .describe('The end date and time in YYYY-MM-DD-HH:MM:SS format. Example: 2025-06-20-15:00:00 for 3:00 PM'),
    
  timeZone: z.string()
    .default('Asia/Manila')
    .describe('The IANA time zone name. Example: Asia/Manila, America/New_York'),
    
  location: z.string()
    .default('Virtual Meeting')
    .describe('The location of the event. Example: Conference Room A'),
    
  body: z.string()
    .default('This is a scheduled meeting. Please join on time.')
    .describe('The body text of the event. Example: Please bring your laptops'),
    
  isOnlineMeeting: z.boolean()
    .default(true)
    .describe('Whether the event is an online meeting. Example: true'),
    
  isReminderOn: z.boolean()
    .default(true)
    .describe('Whether a reminder is set for the event. Example: true'),
    
  attendees: z.string()
    .default('')
    .describe('Comma-separated list of attendee email addresses. Example: user1@example.com,user2@example.com')
});