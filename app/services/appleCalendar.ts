import { Platform } from 'react-native';
import * as Calendar from 'expo-calendar';

export type AppleCalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string | null;
  calendarId: string;
};

export async function requestCalendarPermission(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  try {
    const current = await Calendar.getCalendarPermissionsAsync();
    if (current.status === 'granted') return true;
    const res = await Calendar.requestCalendarPermissionsAsync();
    return res.status === 'granted';
  } catch {
    return false;
  }
}

export async function listEventCalendars(): Promise<Calendar.Calendar[]> {
  if (Platform.OS !== 'ios') return [];
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    // Prefer visible calendars; if none reported visible, fall back to all
    const visible = calendars.filter((c: any) => (typeof c.isVisible === 'boolean' ? c.isVisible : true));
    return visible.length > 0 ? visible : calendars;
  } catch {
    return [];
  }
}

export async function getEventsInRange(params: {
  calendarIds?: string[];
  start: Date;
  end: Date;
}): Promise<AppleCalendarEvent[]> {
  if (Platform.OS !== 'ios') return [];
  const { calendarIds, start, end } = params;
  try {
    const ids = calendarIds && calendarIds.length > 0
      ? calendarIds
      : (await listEventCalendars()).map(c => c.id);
    if (ids.length === 0) return [];
    const events = await Calendar.getEventsAsync(ids, start, end);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (events || []).map(e => {
      const isAllDay = Boolean((e as any).allDay);
      const s = e.startDate || start;
      const en = e.endDate || start;
      const startStr = isAllDay
        ? `${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}T00:00:00`
        : s.toISOString();
      const endStr = isAllDay
        ? `${en.getFullYear()}-${pad(en.getMonth() + 1)}-${pad(en.getDate())}T23:59:59`
        : en.toISOString();
      return {
        id: e.id,
        title: e.title || '(no title)',
        start: startStr,
        end: endStr,
        allDay: isAllDay,
        location: e.location || null,
        calendarId: (e.calendarId as string) || '',
      };
    });
  } catch {
    return [];
  }
}


