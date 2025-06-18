
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