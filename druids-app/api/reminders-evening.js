// Vercel Cron, the evening before: tomorrow's chukkas and lessons. See _reminders.js.
import { makeHandler } from './_reminders.js';

export default makeHandler('evening');
