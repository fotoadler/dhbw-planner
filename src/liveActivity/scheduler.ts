import { CourseLiveActivity, CourseLiveActivityPayload } from '@dhbw/capacitor-course-live-activity';
import { AppSettings } from '../store/preferences';
import { ScheduleEntry } from '../types';

function activityId(entry: ScheduleEntry): string {
  return [entry.start.toISOString(), entry.end.toISOString(), entry.title.trim()].join('|');
}

// One scheduled Activity is enough to cover the next lecture, including an
// early-morning class when the app was last opened the evening before.
const SCHEDULE_AHEAD_MS = 24 * 60 * 60 * 1000;

function text(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(', ');
}

export function currentAndNext(entries: ScheduleEntry[], now: Date): [ScheduleEntry | null, ScheduleEntry | undefined] {
  const sorted = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime());
  const current = sorted.find(
    (entry) =>
      entry.start.getTime() <= now.getTime() &&
      entry.end.getTime() > now.getTime(),
  );
  if (!current) return [null, undefined];
  return [current, sorted.find((entry) => entry.start.getTime() >= current.end.getTime())];
}

/** Nächster Zeitpunkt, an dem sich die sichtbare Vorlesung ändern kann. */
export function nextLiveActivityTransition(entries: ScheduleEntry[], now: Date): Date | undefined {
  const sorted = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime());
  const current = sorted.find(
    (entry) => entry.start.getTime() <= now.getTime() && entry.end.getTime() > now.getTime(),
  );
  if (current) return current.end;
  return sorted.find((entry) => entry.start.getTime() > now.getTime())?.start;
}

export function nextUpcomingCourse(entries: ScheduleEntry[], now: Date): ScheduleEntry | undefined {
  return [...entries]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .find((entry) => entry.start.getTime() > now.getTime());
}

function payload(entry: ScheduleEntry, next?: ScheduleEntry): CourseLiveActivityPayload {
  return {
    id: activityId(entry),
    title: entry.title,
    room: text(entry.rooms),
    lecturer: text(entry.lecturers),
    startTime: entry.start.getTime(),
    endTime: entry.end.getTime(),
    nextTitle: next?.title,
    nextStartTime: next?.start.getTime(),
  };
}

export async function syncCourseLiveActivity(
  entries: ScheduleEntry[],
  settings: AppSettings,
  now: Date = new Date(),
): Promise<void> {
  try {
    if (!settings.liveEnabled) {
      await CourseLiveActivity.endAll();
      return;
    }

    const [current, next] = currentAndNext(entries, now);
    if (!current) {
      const upcoming = nextUpcomingCourse(entries, now);
      if (upcoming && upcoming.start.getTime() - now.getTime() <= SCHEDULE_AHEAD_MS) {
        // On iOS 26 this is an ActivityKit-scheduled start, which the system
        // executes even when the JavaScript app is suspended at course start.
        await CourseLiveActivity.schedule(payload(upcoming));
        return;
      }
      await CourseLiveActivity.endAll();
      return;
    }

    const data = payload(current, next);
    await CourseLiveActivity.start(data);
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('[course-live-activity]', err);
  }
}
