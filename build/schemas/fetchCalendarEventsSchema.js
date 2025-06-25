"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchCalendarEventsSchema = void 0;
const zod_1 = require("zod");
const now = new Date();
const today = now.toISOString().split('T')[0];
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split('T')[0];
exports.fetchCalendarEventsSchema = {
    user_id: zod_1.z.string().default("me").describe("Microsoft Graph user ID or 'me' to use USER_ID from .env"),
    start_date: zod_1.z.string().default(today).describe("Start date in YYYY-MM-DD format (default: today)"),
    end_date: zod_1.z.string().default(tomorrowStr).describe("End date in YYYY-MM-DD format (default: tomorrow)"),
    timezone: zod_1.z.string().default("Asia/Manila").describe("IANA timezone (default: Asia/Manila)")
};
