interface DateTimeTimeZone {
    dateTime: string;
    timeZone: string;
}

interface EmailAddress {
    name?: string;
    address?: string;
}

interface Attendee {
    emailAddress: EmailAddress;
    type: 'required' | 'optional' | 'resource';
}

export interface Event {
    subject?: string;
    start?: DateTimeTimeZone;
    end?: DateTimeTimeZone;
    organizer?: {
        emailAddress: EmailAddress;
    };
    location?: {
        displayName?: string;
    };
    attendees?: Attendee[];
    onlineMeeting?: {
        joinUrl?: string;
    };
}

export interface GraphResponse<T> {
    value: T[];
    '@odata.nextLink'?: string;
}

// Define environment variable types
export interface Env {
    AUTH_TOKEN?: string;
}