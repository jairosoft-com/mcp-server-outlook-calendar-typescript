"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDateInput = parseDateInput;
const date_fns_tz_1 = require("date-fns-tz");
function parseDateInput(dateStr, timezone) {
    try {
        // Parse the input date (assumes YYYY-MM-DD format)
        const [year, month, day] = dateStr.split('-').map(Number);
        // Create a date in the specified timezone
        const localDate = new Date(Date.UTC(year, month - 1, day));
        // Convert to the target timezone
        return (0, date_fns_tz_1.toZonedTime)(localDate, timezone);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid date format. Please use YYYY-MM-DD format. ${errorMessage}`);
    }
}
