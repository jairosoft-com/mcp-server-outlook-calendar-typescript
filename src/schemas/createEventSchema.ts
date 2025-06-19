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

// Helper to format date to YYYY-MM-DDTHH:MM:SS
const formatLocalDateTime = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
};

// Helper to get the local timezone offset in +HH:MM format
const getLocalTimezoneOffset = (): string => {
  const tzOffset = -new Date().getTimezoneOffset();
  const sign = tzOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffset);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Recurrence schema that can be used independently
const recurrenceSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'absoluteMonthly', 'relativeMonthly', 'absoluteYearly', 'relativeYearly'])
    .describe('The type of recurrence pattern. Example: daily, weekly, monthly, etc.'),
  interval: z.number()
    .int()
    .positive()
    .default(1)
    .describe('The interval between occurrences. Example: 1 for every day/week/month, 2 for every other day/week/month, etc.'),
  range_type: z.enum(['endDate', 'noEnd', 'numbered'])
    .describe('The type of recurrence range. Use "endDate" to specify an end date, "numbered" for a specific number of occurrences, or "noEnd" for no end date'),
  end_date: z.string()
    .optional()
    .describe('The end date for the recurrence in YYYY-MM-DD format. Required if range_type is "endDate"')
    .refine((val) => {
      if (!val) return true;
      return /^\d{4}-\d{2}-\d{2}$/.test(val);
    }, 'End date must be in YYYY-MM-DD format'),
  number_of_occurrences: z.number()
    .int()
    .positive()
    .optional()
    .describe('The number of occurrences. Required if range_type is "numbered"')
}).refine(
  (data) => {
    if (data.range_type === 'endDate' && !data.end_date) {
      return false;
    }
    if (data.range_type === 'numbered' && !data.number_of_occurrences) {
      return false;
    }
    return true;
  },
  {
    message: 'end_date is required when range_type is "endDate" and number_of_occurrences is required when range_type is "numbered"',
    path: ['recurrence']
  }
);

// Base event schema without recurrence
const baseEventSchema = z.object({
  user_id: z.string()
    .default("me")
    .describe("Microsoft Graph user ID or 'me' to use USER_ID from .env. Example: me"),
    
  subject: z.string()
    .min(1, 'Subject is required')
    .default("Team Meeting")
    .describe("The subject of the event. Example: Team Sync"),

  content: z.string()
    .default('<p>This is a scheduled meeting. Please join on time.</p>')
    .describe('The HTML content of the event. Example: <p>Please bring your laptops</p>'),
    
  start_datetime: z.string()
    .min(1, 'Start date and time is required')
    .default(() => formatLocalDateTime(getDefaultStartTime()))
    .describe('The start date and time in YYYY-MM-DDTHH:MM:SS format. Example: 2025-06-20T14:00:00 for 2:00 PM'),
    
  end_datetime: z.string()
    .min(1, 'End date and time is required')
    .default(() => {
      const end = getDefaultStartTime();
      end.setHours(end.getHours() + 1);
      return formatLocalDateTime(end);
    })
    .describe('The end date and time in YYYY-MM-DDTHH:MM:SS format. Example: 2025-06-20T15:00:00 for 3:00 PM'),
    
  is_online_meeting: z.boolean()
    .default(true)
    .describe('Whether the event is an online meeting. Example: true'),
    
  attendees: z.array(z.string())
    .default([''])
    .describe('Array of attendee email addresses. Example: ["user1@example.com", "user2@example.com"]'),
    
  location: z.string()
    .default('Virtual Meeting')
    .describe('The location of the event. Example: Conference Room A'),
    
  importance: z.enum(['Low', 'Normal', 'High'])
    .default('Normal')
    .describe('The importance of the event. Must be one of: Low, Normal, High'),
    
  is_recurring: z.boolean()
    .default(false)
    .describe('Whether the event should repeat. Check to enable recurrence settings.')
});

// Recurrence fields schema
const recurrenceFieldsSchema = z.object({
  recurrence_type: z.enum(['daily', 'weekly', 'monthly', 'yearly', 'absoluteMonthly', 'relativeMonthly', 'absoluteYearly', 'relativeYearly'])
    .default('daily')
    .describe('How often the event should repeat. Example: daily, weekly, monthly')
    .optional(),
    
  days_of_week: z.array(z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']))
    .default(['monday', 'wednesday', 'friday'])
    .optional()
    .describe('Days of the week for weekly recurrence. Example: ["monday", "wednesday", "friday"]'),
  
  recurrence_interval: z.number()
    .int()
    .positive()
    .default(1)
    .describe('The interval between occurrences. Example: 1 for every day/week/month, 2 for every other day/week/month')
    .optional(),
  
  recurrence_range_type: z.enum(['endDate', 'noEnd', 'numbered'])
    .default('endDate')
    .describe('When should the recurrence end? "endDate" for a specific end date, "numbered" for a number of occurrences, or "noEnd" to repeat indefinitely')
    .optional(),
  
  recurrence_end_date: z.string()
    .optional()
    .describe('The date when the recurrence should end (YYYY-MM-DD format). Required if range_type is "endDate"')
    .refine((val) => !val || /^\d{4}-\d{2}-\d{2}$/.test(val), 'End date must be in YYYY-MM-DD format'),
  
  recurrence_occurrences: z.number()
    .int()
    .positive()
    .optional()
    .describe('Number of times the event should occur. Required if range_type is "numbered"')
}).partial();

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
    .default('weekly')
    .optional()
    .describe("The type of recurrence. Example: 'weekly' for weekly meetings"),
    
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

// Export the recurrence schema separately in case it's needed elsewhere
export { recurrenceSchema };