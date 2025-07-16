import { EventLocation } from "../services/calendarEventsService.js";

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