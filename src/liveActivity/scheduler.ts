import { CourseLiveActivity, CourseLiveActivityPayload } from '@dhbw/capacitor-course-live-activity';
import { AppSettings } from '../store/preferences';
import { ScheduleEntry } from '../types';

const UPDATE_LEEWAY_MS = 60_000;

function activityId(entry: ScheduleEntry): string {
  return [entry.start.toISOString(), entry.end.toISOString(), entry.title.trim()].join('|');
}

function text(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(', ');
}

function currentAndNext(entries: ScheduleEntry[], now: Date): [ScheduleEntry | null, ScheduleEntry | undefined] {
  const sorted = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime());
  const current = sorted.find(
    (entry) =>
      entry.start.getTime() - UPDATE_LEEWAY_MS <= now.getTime() &&
      entry.end.getTime() > now.getTime(),
  );
  if (!current) return [null, undefined];
  return [current, sorted.find((entry) => entry.start.getTime() >= current.end.getTime())];
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
      await CourseLiveActivity.endAll();
      return;
    }

    const data = payload(current, next);
    await CourseLiveActivity.start(data);
  } catch (err) {
    if (import.meta.env?.DEV) console.warn('[course-live-activity]', err);
  }
}
