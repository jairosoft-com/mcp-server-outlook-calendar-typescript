import { CalendarToolResponse, FormattedEvent } from "../interfaces/getCalendarResponse";



export function formatCalendarToolResponse(uri: string): FormattedEvent[] {
  try {
    const decodedUri = decodeURIComponent(uri);
    const jsonStartIndex = decodedUri.indexOf('{');
    if (jsonStartIndex === -1) throw new Error('Invalid data URI format');

    const jsonString = decodedUri.slice(jsonStartIndex);
    const parsed: CalendarToolResponse = JSON.parse(jsonString);

    return parsed.events.map(event => ({
      subject: event.subject || 'No Subject',
      start: event.start,
      end: event.end,
      organizer: event.organizer?.emailAddress?.name || 'Unknown Organizer',
      attendees: event.attendees?.length || 0,
    }));
  } catch (err) {
    throw new Error(`Failed to parse calendar response: ${(err as Error).message}`);
  }
}
