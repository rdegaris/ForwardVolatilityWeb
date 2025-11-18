/**
 * Date utility functions for consistent Pacific Time (PST/PDT) handling
 */

const PACIFIC_TZ = 'America/Los_Angeles';

/**
 * Get current date in Pacific Time as YYYY-MM-DD string
 */
export function getTodayPacific(): string {
  const now = new Date();
  const pacificDate = new Date(now.toLocaleString('en-US', { timeZone: PACIFIC_TZ }));
  
  const year = pacificDate.getFullYear();
  const month = String(pacificDate.getMonth() + 1).padStart(2, '0');
  const day = String(pacificDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Get current timestamp in Pacific Time as ISO string
 */
export function getNowPacific(): string {
  return new Date().toLocaleString('en-US', { timeZone: PACIFIC_TZ });
}

/**
 * Create a Date object in Pacific Time for today at midnight
 */
export function getTodayDatePacific(): Date {
  const now = new Date();
  const pacificDate = new Date(now.toLocaleString('en-US', { timeZone: PACIFIC_TZ }));
  pacificDate.setHours(0, 0, 0, 0);
  return pacificDate;
}
