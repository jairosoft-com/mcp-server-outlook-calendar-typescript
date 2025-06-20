import { toZonedTime } from "date-fns-tz";

export function parseDateInput(dateStr: string, timezone: string): Date {
    try {
      // Parse the input date (assumes YYYY-MM-DD format)
      const [year, month, day] = dateStr.split('-').map(Number);
      
      // Create a date in the specified timezone
      const localDate = new Date(Date.UTC(year, month - 1, day));
      
      // Convert to the target timezone
      return toZonedTime(localDate, timezone);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid date format. Please use YYYY-MM-DD format. ${errorMessage}`);
    }
  }