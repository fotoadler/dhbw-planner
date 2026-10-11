import { Capacitor } from '@capacitor/core';
import { CalendarSync, type CalendarEvent } from '@dhbw/capacitor-calendar-sync';
import { addDaysYmd, berlinParts, berlinToUtc, isDeadlineOrAllDay } from '../lib/berlinTime';
import type { AppSettings } from '../store/preferences';
import type { ScheduleEntry } from '../types';

export function calendarSyncRange(now: Date) {
  const first = addDaysYmd(berlinParts(now), -7);
  // Stay inside the fully fetched Rapla window even when today is Sunday.
  const last = addDaysYmd(berlinParts(now), 90);
  return { rangeStart: berlinToUtc(first.y, first.m, first.d, 0, 0).getTime(), rangeEnd: berlinToUtc(last.y, last.m, last.d, 0, 0).getTime() };
}

export async function calendarEvent(entry: ScheduleEntry): Promise<CalendarEvent> {
  const startParts = berlinParts(entry.start);
  const endParts = berlinParts(entry.end);
  const allDay = isDeadlineOrAllDay(entry) && entry.end.getTime() > entry.start.getTime() && startParts.hh === 0 && startParts.mm === 0;
  // Provider all-day events use UTC calendar dates. EventKit receives the same
  // date-only representation; native code restores Berlin midnight on iOS.
  const start = allDay ? Date.UTC(startParts.y, startParts.m - 1, startParts.d) : entry.start.getTime();
  const next = addDaysYmd(startParts, 1);
  const end = allDay
    ? Math.max(Date.UTC(endParts.y, endParts.m - 1, endParts.d) + (endParts.hh || endParts.mm ? 86_400_000 : 0), Date.UTC(next.y, next.m - 1, next.d))
    : Math.max(entry.end.getTime(), start + 60_000);
  const identity = JSON.stringify([entry.start.toISOString(), entry.title.trim(), entry.course ?? '']);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  const key = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  return { key, title: entry.title, start, end, allDay, location: entry.rooms.join(', '),
    notes: [entry.lecturers.length ? `Dozent: ${entry.lecturers.join(', ')}` : '', entry.course ? `Kurs: ${entry.course}` : '', entry.extra ?? ''].filter(Boolean).join('\n') };
}

let queue: Promise<unknown> = Promise.resolve();
let revision = 0;
/** Serialize native writes and skip superseded snapshots. Never prompt during refresh. */
export function syncDeviceCalendar(entries: ScheduleEntry[], settings: AppSettings, allowDelete = false, now = new Date()): Promise<void> {
  const currentRevision = ++revision;
  const run = async () => {
    if (!Capacitor.isNativePlatform() || !settings.calendarSyncEnabled || currentRevision !== revision) return;
    const status = await CalendarSync.getStatus();
    if (!status.available || status.permission !== 'granted') {
      window.dispatchEvent(new CustomEvent('device-calendar-sync', { detail: { success: false } }));
      return;
    }
    const range = calendarSyncRange(now);
    const visible = entries.filter((entry) => entry.start.getTime() >= range.rangeStart && entry.start.getTime() < range.rangeEnd);
    const events = await Promise.all(visible.map(calendarEvent));
    if (currentRevision !== revision) return;
    await CalendarSync.sync({ events: [...new Map(events.map((event) => [event.key, event])).values()], ...range, allowDelete });
    window.dispatchEvent(new CustomEvent('device-calendar-sync', { detail: { success: true } }));
  };
  const operation = queue.then(run);
  queue = operation.catch(() => {});
  // Calendar access failures must not turn a successful timetable refresh offline.
  return operation.catch((error) => {
    window.dispatchEvent(new CustomEvent('device-calendar-sync', { detail: { success: false } }));
    if (import.meta.env.DEV) console.warn('[calendar-sync]', error);
  });
}
