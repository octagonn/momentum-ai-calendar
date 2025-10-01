import { addDays, format, parseISO, startOfDay, addMinutes } from 'date-fns';
import { InterviewFields, ScheduledSlot } from './planSchema';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function buildSchedule(fields: InterviewFields): ScheduledSlot[] {
  const { target_date, days_per_week, session_minutes, preferred_days, time_of_day } = fields;
  
  const targetDate = parseISO(target_date);
  const now = new Date();
  const tomorrow = addDays(now, 1);
  
  // Calculate total weeks until target
  const weeksUntilTarget = Math.ceil((targetDate.getTime() - tomorrow.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const totalSessions = weeksUntilTarget * days_per_week;
  
  // Build list of available dates on preferred days
  const availableDates = getAvailableDates(tomorrow, targetDate, preferred_days);
  
  // Take the first K dates to match total sessions
  const selectedDates = availableDates.slice(0, totalSessions);
  
  // Create scheduled slots
  const scheduledSlots: ScheduledSlot[] = selectedDates.map((date, index) => {
    const dueAt = createDueAtTimestamp(date, time_of_day);
    
    return {
      title: `Session ${index + 1}`,
      due_at: dueAt,
      duration_minutes: session_minutes,
      seq: index + 1,
    };
  });
  
  return scheduledSlots;
}

function getAvailableDates(
  startDate: Date, 
  endDate: Date, 
  preferredDays: string[]
): Date[] {
  const availableDates: Date[] = [];
  const currentDate = new Date(startDate);
  
  // Convert preferred days to day numbers (0 = Sunday, 1 = Monday, etc.)
  const preferredDayNumbers = preferredDays.map(day => {
    const dayIndex = DAY_NAMES.findIndex(d => d.toLowerCase() === day.toLowerCase());
    if (dayIndex !== -1) return dayIndex;
    
    const fullDayIndex = DAY_NAMES_FULL.findIndex(d => d.toLowerCase() === day.toLowerCase());
    if (fullDayIndex !== -1) return fullDayIndex;
    
    // Handle partial matches
    for (let i = 0; i < DAY_NAMES.length; i++) {
      if (DAY_NAMES[i].toLowerCase().startsWith(day.toLowerCase()) || 
          DAY_NAMES_FULL[i].toLowerCase().startsWith(day.toLowerCase())) {
        return i;
      }
    }
    
    return -1;
  }).filter(num => num !== -1);
  
  if (preferredDayNumbers.length === 0) {
    // Fallback to all days if no valid days found
    preferredDayNumbers.push(1, 2, 3, 4, 5); // Monday to Friday
  }
  
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    
    if (preferredDayNumbers.includes(dayOfWeek)) {
      availableDates.push(new Date(currentDate));
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return availableDates;
}

function createDueAtTimestamp(
  date: Date, 
  timeOfDay: string | null | undefined
): string {
  // Start with the date at midnight
  const startOfDate = startOfDay(date);
  
  let dueAt: Date;
  
  if (timeOfDay && timeOfDay !== 'default') {
    // Parse time (HH:MM format)
    const [hours, minutes] = timeOfDay.split(':').map(Number);
    
    // Create date with specific time
    dueAt = new Date(startOfDate);
    dueAt.setHours(hours, minutes, 0, 0);
  } else {
    // Default to 9 AM
    dueAt = new Date(startOfDate);
    dueAt.setHours(9, 0, 0, 0);
  }
  
  return dueAt.toISOString();
}

export function validateSchedule(scheduledSlots: ScheduledSlot[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (scheduledSlots.length === 0) {
    errors.push('No scheduled slots generated');
    return { isValid: false, errors };
  }
  
  // Check for duplicate due_at times
  const dueAtTimes = scheduledSlots.map(slot => slot.due_at);
  const uniqueTimes = new Set(dueAtTimes);
  if (uniqueTimes.size !== dueAtTimes.length) {
    errors.push('Duplicate due_at times found');
  }
  
  // Check for invalid due_at times (in the past)
  const now = new Date();
  for (const slot of scheduledSlots) {
    const dueAt = parseISO(slot.due_at);
    if (dueAt <= now) {
      errors.push(`Slot ${slot.seq} is scheduled in the past`);
    }
  }
  
  // Check for proper sequencing
  const seqNumbers = scheduledSlots.map(slot => slot.seq).sort((a, b) => a - b);
  for (let i = 0; i < seqNumbers.length; i++) {
    if (seqNumbers[i] !== i + 1) {
      errors.push('Invalid sequence numbers');
      break;
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

export function formatScheduleForDisplay(scheduledSlots: ScheduledSlot[]): string {
  return scheduledSlots.map(slot => {
    const dueAt = parseISO(slot.due_at);
    const dateStr = format(dueAt, 'MMM dd, yyyy');
    const timeStr = format(dueAt, 'HH:mm');
    return `${slot.title}: ${dateStr} at ${timeStr} (${slot.duration_minutes} min)`;
  }).join('\n');
}

