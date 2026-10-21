import type { AppSettings } from '../store/preferences';
import type { ScheduleEntry } from '../types';
import { addDaysYmd, berlinDayKey, mondayOfYmd, parseYmdKey, ymdKey } from '../lib/berlinTime';

export interface WidgetEvent { title: string; start: number; end: number; room: string }
export interface WidgetDay { date: string; known: boolean; events: WidgetEvent[] }
export interface WidgetSnapshot {
  version: 1; unlocked: boolean; profileId: string; course: string;
  updatedAt: number; days: WidgetDay[];
}
/** A Rapla URL/file/profile name is not a verified course label. */
export function widgetCourseLabel(settings: Pick<AppSettings, 'scheduleSource' | 'apiSelection'>): string {
  return settings.scheduleSource === 'dhbw-api' ? settings.apiSelection?.course.trim() ?? '' : '';
}
export function widgetSnapshot(input: {
  unlocked: boolean; profileId: string; course: string; entries: ScheduleEntry[];
  updatedAt: Date | null; loadedWeeks: string[]; fullCourse: boolean; now?: Date;
}): WidgetSnapshot {
  const today = berlinDayKey(input.now ?? new Date());
  const days = Array.from({ length: 14 }, (_, i) => {
    const date = ymdKey(addDaysYmd(parseYmdKey(today), i));
    const known = input.updatedAt !== null && (input.fullCourse || input.loadedWeeks.includes(ymdKey(mondayOfYmd(parseYmdKey(date)))));
    return { date, known, events: input.unlocked && known ? input.entries
      .filter(e => e.type !== 'holiday' && berlinDayKey(e.start) === date && e.end > e.start)
      .sort((a,b) => a.start.getTime() - b.start.getTime())
      .map(e => ({ title: e.title.slice(0,180), start: e.start.getTime(), end: e.end.getTime(), room: e.rooms.map(room => room.trim()).filter(Boolean).join(', ').slice(0,120) })) : [] };
  });
  return { version: 1, unlocked: input.unlocked, profileId: input.profileId, course: input.course.trim().slice(0,80),
    updatedAt: input.updatedAt?.getTime() ?? 0, days };
}
export function widgetDayState(snapshot: WidgetSnapshot, now: Date) {
  const day = snapshot.days.find(d => d.date === berlinDayKey(now));
  if (!snapshot.unlocked) return 'locked';
  if (!day?.known) return 'unknown';
  if (!day.events.length) return 'free';
  if (day.events.every(e => e.end <= now.getTime())) return 'finished';
  return 'scheduled';
}
export function parseWidgetLink(raw: string): { date: string; profileId: string } | 'support' | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== 'dhbwplanner:') return null;
    if (url.hostname === 'support') return 'support';
    if (url.hostname !== 'day') return null;
    const date = url.searchParams.get('date') ?? '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const instant = new Date(`${date}T12:00:00Z`);
    if (!Number.isFinite(instant.getTime()) || instant.toISOString().slice(0,10) !== date) return null;
    return { date, profileId: url.searchParams.get('profile') ?? '' };
  } catch { return null; }
}
