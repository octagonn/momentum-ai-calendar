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
    // Prefer visible calendars
    return calendars.filter((c: any) => (typeof c.isVisible === 'boolean' ? c.isVisible : true));
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
    return (events || []).map(e => ({
      id: e.id,
      title: e.title || '(no title)',
      start: (e.startDate || start).toISOString(),
      end: (e.endDate || start).toISOString(),
      allDay: Boolean((e as any).allDay),
      location: e.location || null,
      calendarId: (e.calendarId as string) || '',
    }));
  } catch {
    return [];
  }
}


