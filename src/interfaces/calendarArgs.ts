export default interface CalendarToolArgs {
    accessToken: string;
    start_date?: string;
    end_date?: string;
    timezone?: string;
    [key: string]: unknown; 
  }