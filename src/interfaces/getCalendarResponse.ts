
export type EmailAddress = {
    name: string;
    address: string;
  };
  
export type CalendarEvent = {
    id: string;
    subject?: string;
    start: string;
    end: string;
    organizer?: { emailAddress?: EmailAddress };
    attendees?: { emailAddress?: EmailAddress }[];
  };
  
export type CalendarToolResponse = {
    count: number;
    events: CalendarEvent[];
  };
  
export interface Attendee {
  name: string;
  email?: string;
  type?: string;
  status?: string;
}

export type FormattedEvent = {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  organizer: { name: string; email?: string };
  attendees: Attendee[];
  bodyPreview?: string;
  webLink?: string;
};

type ContentItem = 
| { type: "text"; text: string }
| { type: "resource"; resource: { text: string; uri: string; mimeType?: string } };

export default interface ToolResponse {
  content: ContentItem[];
  [key: string]: unknown; // Allow additional properties
}