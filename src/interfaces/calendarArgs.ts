export default interface CalendarToolArgs {
    user_id?: string;
    start_date?: string;
    end_date?: string;
    timezone?: string;
    [key: string]: unknown; 
  }