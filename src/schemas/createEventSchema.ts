import { z } from 'zod';

// Helper to get default start time (current time + 1 hour)
const getDefaultStartTime = () => {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0, 0, 0);
  return now;
};

// Helper to format date to YYYY-MM-DDTHH:MM:SS
const formatLocalDateTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

// Export the schema in the format expected by the tool registration
export const createEventToolSchema = {
  user_id: z.string()
    .default("me")
    .describe("Microsoft Graph user ID or 'me' to use USER_ID from .env. Example: me"),
    
  subject: z.string()
    .min(1, 'Subject is required')
    .default("Team Sync Meeting")
    .describe("The subject of the event. Example: Team Sync Meeting"),
    
  content: z.string()
    .default('<p>This is a scheduled team meeting. Please join on time with your updates and questions.</p>')
    .describe('The content/description of the event. Example: <p>Weekly team sync to discuss project updates and blockers.</p>'),
    
  timezone: z.string()
    .default(Intl.DateTimeFormat().resolvedOptions().timeZone)
    .describe('The timezone for the event. Example: America/New_York'),
    
  start_datetime: z.string()
    .default(() => formatLocalDateTime(getDefaultStartTime()))
    .describe('The start date and time in YYYY-MM-DDTHH:MM:SS format. Example: 2025-06-20T14:00:00 for 2:00 PM'),
    
  end_datetime: z.string()
    .default(() => {
      const end = getDefaultStartTime();
      end.setHours(end.getHours() + 1);
      return formatLocalDateTime(end);
    })
    .describe('The end date and time in YYYY-MM-DDTHH:MM:SS format. Example: 2025-06-20T15:00:00 for 3:00 PM'),
    
  is_online_meeting: z.boolean()
    .default(true)
    .describe("Whether this is an online meeting. Example: true"),
    
  attendees: z.array(z.string())
    .default(["team@example.com"])
    .describe("Array of attendee email addresses. Example: [\"user1@example.com\", \"user2@example.com\"]"),
    
  location: z.string()
    .default('Microsoft Teams Meeting')
    .describe("The location of the event. Example: Conference Room A or Microsoft Teams"),
    
  importance: z.enum(['Low', 'Normal', 'High'])
    .default('Normal')
    .describe("The importance of the event. Must be one of: Low, Normal, High"),
    
  is_recurring: z.boolean()
    .default(false)
    .describe("Whether this is a recurring event. Example: true for weekly team meetings"),
    
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'absoluteMonthly', 'relativeMonthly', 'absoluteYearly', 'relativeYearly'])
    .optional()
    .describe("The type of recurrence. Example: 'daily', 'weekly', 'monthly', 'relativeMonthly'"),
    
  days_of_week: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']))
    .default(['monday', 'wednesday', 'friday'])
    .optional()
    .describe('Days of the week for weekly recurrence. Example: ["monday", "wednesday", "friday"]'),
    
  recurrence_interval: z.number()
    .int()
    .positive()
    .default(1)
    .optional()
    .describe("The interval between occurrences. Example: 2 for every other week/month"),
    
  recurrence_range_type: z.enum(['endDate', 'noEnd', 'numbered'])
    .default('endDate')
    .optional()
    .describe('When should the recurrence end? "endDate" for a specific end date, "numbered" for a number of occurrences, or "noEnd" to repeat indefinitely'),
    
  recurrence_end_date: z.string()
    .default(() => {
      const date = new Date();
      date.setMonth(date.getMonth() + 3); // Default to 3 months from now
      return date.toISOString().split('T')[0];
    })
    .optional()
    .describe("The end date for the recurrence (YYYY-MM-DD format). Example: 2025-12-31"),
    
  recurrence_occurrences: z.number()
    .int()
    .positive()
    .default(10)
    .optional()
    .describe("The number of occurrences for numbered recurrence. Example: 10 for 10 total occurrences")
};