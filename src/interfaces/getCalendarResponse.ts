
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
  
export type FormattedEvent = {
    subject: string;
    start: string;
    end: string;
    organizer: string;
    attendees: number;
  };

type ContentItem = 
| { type: "text"; text: string }
| { type: "resource"; resource: { text: string; uri: string; mimeType?: string } };

export default interface ToolResponse {
  content: ContentItem[];
  [key: string]: unknown; // Allow additional properties
}