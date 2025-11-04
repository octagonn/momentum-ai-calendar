/**
 * Centralized day parsing utility to ensure consistent and accurate day interpretation
 * across all scheduling systems.
 */

export type DayOfWeek = 'Sun' | 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export const DAY_NAMES: DayOfWeek[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Mapping for all possible day representations
const DAY_MAP: { [key: string]: DayOfWeek } = {
  'sunday': 'Sun', 'sun': 'Sun',
  'monday': 'Mon', 'mon': 'Mon',
  'tuesday': 'Tue', 'tue': 'Tue', 'tues': 'Tue',
  'wednesday': 'Wed', 'wed': 'Wed',
  'thursday': 'Thu', 'thu': 'Thu', 'thurs': 'Thu',
  'friday': 'Fri', 'fri': 'Fri',
  'saturday': 'Sat', 'sat': 'Sat',
};

// Predefined day sets
const WEEKDAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const WEEKENDS: DayOfWeek[] = ['Sat', 'Sun'];

/**
 * Parse a day expression into an array of day names
 * Handles various formats:
 * - Individual days: "Monday", "Tue", "wednesday"
 * - Comma-separated: "Mon, Wed, Fri"
 * - Ranges: "Monday-Friday", "Mon-Fri"
 * - Keywords: "weekdays", "weekends"
 *
 * Example combined with times: "Mon 17:00, Thu 17:00, Sat 10:00" → use parseDayTimes
 *
 * @param expression The day expression to parse
 * @returns Array of standardized day names (e.g., ['Mon', 'Tue', 'Wed'])
 */
export function parseDayExpression(expression: string): DayOfWeek[] {
  const normalized = expression.trim().toLowerCase();
  
  // Handle predefined keywords
  if (normalized === 'weekdays' || normalized === 'weekday') {
    return [...WEEKDAYS];
  }
  
  if (normalized === 'weekends' || normalized === 'weekend') {
    return [...WEEKENDS];
  }
  
  // Handle ranges like "monday-friday", "mon-fri", "monday through friday"
  const rangeMatch = normalized.match(/^(\w+)(?:\s*(?:-|through|to)\s*)(\w+)$/);
  if (rangeMatch) {
    const [, start, end] = rangeMatch;
    const startDay = DAY_MAP[start];
    const endDay = DAY_MAP[end];
    
    if (startDay && endDay) {
      return getDayRange(startDay, endDay);
    }
  }
  
  // Handle comma or space-separated list
  const parts = normalized.split(/[,\s]+/).filter(Boolean);
  const days: Set<DayOfWeek> = new Set();
  
  for (const part of parts) {
    const day = DAY_MAP[part];
    if (day) {
      days.add(day);
    } else {
      // Try partial matches
      for (const [key, value] of Object.entries(DAY_MAP)) {
        if (key.startsWith(part) || part.startsWith(key.substring(0, 3))) {
          days.add(value);
          break;
        }
      }
    }
  }
  
  // Preserve the order: Sun -> Sat
  return DAY_NAMES.filter(day => days.has(day));
}

/**
 * Extract mapping of days to times from free text like:
 * "Mon 5pm, Thu 5pm, Sat 10am" or "Monday 17:00, Thursday 17:00, Saturday 10:00"
 * Returns standardized day keys (Mon, Tue, ...) mapped to 24h HH:MM strings.
 */
export function parseDayTimes(expression: string): Record<DayOfWeek, string> {
  const result: Partial<Record<DayOfWeek, string>> = {};
  if (!expression) return result as Record<DayOfWeek, string>;

  const items = expression
    .split(/[;,]+/)
    .map(s => s.trim())
    .filter(Boolean);

  for (const item of items) {
    // Parse time first; support 5pm, 10am, 17:00, 5:30 pm
    const timeMatch = item.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    const hasColon = /\b\d{1,2}:\d{2}\b/.test(item);
    const hasAmPm = /\b(am|pm)\b/i.test(item);
    if (!timeMatch || (!hasColon && !hasAmPm)) continue;
    let hour = parseInt(timeMatch[1]);
    const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    const ap = timeMatch[3]?.toLowerCase();
    if (ap) {
      if (ap === 'pm' && hour < 12) hour += 12;
      if (ap === 'am' && hour === 12) hour = 0;
    }
    hour = Math.min(23, Math.max(0, hour));
    const mm = Math.min(59, Math.max(0, minute));
    const hhStr = String(hour).padStart(2, '0');
    const mmStr = String(mm).padStart(2, '0');
    const time24 = `${hhStr}:${mmStr}`;

    // Find all day tokens in the segment and assign the same time to each
    const lower = item.toLowerCase();
    const matchedDays: Set<DayOfWeek> = new Set();
    for (const [key, value] of Object.entries(DAY_MAP)) {
      if (new RegExp(`(^|[^a-z])${key}([^a-z]|$)`, 'i').test(lower)) {
        matchedDays.add(value);
      }
    }
    // If no day tokens explicitly found, try to infer a single day by tokenizing
    if (matchedDays.size === 0) {
      const tokens = item.split(/\s+/);
      for (const t of tokens) {
        const lc = t.toLowerCase().replace(/[^a-z]/g, '');
        const mapped = (DAY_MAP as any)[lc] as DayOfWeek | undefined;
        if (mapped) matchedDays.add(mapped);
      }
    }
    matchedDays.forEach(d => {
      result[d] = time24;
    });
  }

  return result as Record<DayOfWeek, string>;
}

/**
 * Get a range of days between start and end (inclusive)
 * @param start Starting day
 * @param end Ending day
 * @returns Array of days in the range
 */
function getDayRange(start: DayOfWeek, end: DayOfWeek): DayOfWeek[] {
  const startIndex = DAY_NAMES.indexOf(start);
  const endIndex = DAY_NAMES.indexOf(end);
  
  if (startIndex === -1 || endIndex === -1) {
    return [];
  }
  
  // Handle wrapping (e.g., Fri-Mon would be Fri, Sat, Sun, Mon)
  if (startIndex <= endIndex) {
    return DAY_NAMES.slice(startIndex, endIndex + 1);
  } else {
    return [...DAY_NAMES.slice(startIndex), ...DAY_NAMES.slice(0, endIndex + 1)];
  }
}

/**
 * Convert day names to day numbers (0 = Sunday, 1 = Monday, etc.)
 * @param days Array of day names
 * @returns Array of day numbers
 */
export function dayNamesToNumbers(days: DayOfWeek[]): number[] {
  return days.map(day => DAY_NAMES.indexOf(day)).filter(num => num !== -1);
}

/**
 * Convert day numbers to day names
 * @param numbers Array of day numbers (0-6)
 * @returns Array of day names
 */
export function dayNumbersToNames(numbers: number[]): DayOfWeek[] {
  return numbers
    .filter(num => num >= 0 && num < 7)
    .map(num => DAY_NAMES[num]);
}

/**
 * Validate that a day expression is valid
 * @param expression Day expression to validate
 * @returns Object with isValid flag and parsed days or error message
 */
export function validateDayExpression(expression: string): {
  isValid: boolean;
  days?: DayOfWeek[];
  error?: string;
} {
  try {
    const days = parseDayExpression(expression);
    
    if (days.length === 0) {
      return {
        isValid: false,
        error: `Could not parse day expression: "${expression}". Use formats like "weekdays", "Monday-Friday", or "Mon,Wed,Fri"`,
      };
    }
    
    return {
      isValid: true,
      days,
    };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid day expression: "${expression}"`,
    };
  }
}

/**
 * Check if a specific day number is in a list of day names
 * @param dayNumber Day number (0-6, where 0 = Sunday)
 * @param allowedDays Array of allowed day names
 * @returns true if the day is allowed
 */
export function isDayAllowed(dayNumber: number, allowedDays: DayOfWeek[]): boolean {
  const dayName = DAY_NAMES[dayNumber];
  return allowedDays.includes(dayName);
}

/**
 * Format day names for display
 * @param days Array of day names
 * @returns Human-readable string (e.g., "Monday, Wednesday, Friday" or "Weekdays")
 */
export function formatDaysForDisplay(days: DayOfWeek[]): string {
  // Check if it matches weekdays
  if (days.length === 5 && WEEKDAYS.every(d => days.includes(d))) {
    return 'Weekdays (Mon-Fri)';
  }
  
  // Check if it matches weekends
  if (days.length === 2 && WEEKENDS.every(d => days.includes(d))) {
    return 'Weekends (Sat-Sun)';
  }
  
  // Otherwise, list them out
  const fullNames = days.map(day => {
    const index = DAY_NAMES.indexOf(day);
    return DAY_NAMES_FULL[index];
  });
  
  if (fullNames.length === 1) {
    return fullNames[0];
  }
  
  if (fullNames.length === 2) {
    return `${fullNames[0]} and ${fullNames[1]}`;
  }
  
  return `${fullNames.slice(0, -1).join(', ')}, and ${fullNames[fullNames.length - 1]}`;
}

