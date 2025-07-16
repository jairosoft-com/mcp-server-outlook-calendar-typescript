import { z } from "zod";

const now = new Date();
const today = now.toISOString().split('T')[0];
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

// Base schema for authentication
export const authSchema = {
  accessToken: z.string().describe("OAuth 2.0 access token for Microsoft Graph API authentication"),
};

// Schema for fetching calendar events
export const fetchCalendarEventsSchema = {
  ...authSchema,
  start_date: z.string().default(today).describe("Start date in YYYY-MM-DD format (default: today)"),
  end_date: z.string().default(tomorrowStr).describe("End date in YYYY-MM-DD format (default: tomorrow)"),
  timezone: z.string().default("Asia/Manila").describe("IANA timezone (default: Asia/Manila)")
};