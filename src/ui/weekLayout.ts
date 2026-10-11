import { berlinDayKey, berlinParts, isDeadlineOrAllDay } from '../lib/berlinTime';
import type { ScheduleEntry } from '../types';

export const WEEK_FIRST_HOUR = 8;

export function wallMinutes(date: Date): number {
  const { hh, mm, ss } = berlinParts(date);
  return hh * 60 + mm + ss / 60;
}

/** Midnight notices and all-day events belong above, rather than inside, the hourly grid. */
export function isUntimedEntry(entry: ScheduleEntry): boolean {
  return isDeadlineOrAllDay(entry) && wallMinutes(entry.start) === 0;
}

export function entryMinuteRange(entry: ScheduleEntry): { start: number; end: number } {
  const start = wallMinutes(entry.start);
  const end = berlinDayKey(entry.end) > berlinDayKey(entry.start) ? 24 * 60 : wallMinutes(entry.end);
  return { start, end: end <= start ? start + 15 : end };
}

export function timedGeometry(entry: ScheduleEntry, hourHeight: number): { top: number; height: number } {
  const range = entryMinuteRange(entry);
  const start = Math.max(WEEK_FIRST_HOUR * 60, range.start);
  return {
    top: ((start - WEEK_FIRST_HOUR * 60) / 60) * hourHeight,
    height: Math.max(2, ((Math.min(24 * 60, range.end) - start) / 60) * hourHeight),
  };
}

export interface WeekCluster {
  entries: ScheduleEntry[];
  start: number;
  end: number;
}

/** Disjoint events stay separate; transitive overlaps are compared in one detail sheet. */
export function weekClusters(entries: ScheduleEntry[]): WeekCluster[] {
  const sorted = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime() || a.end.getTime() - b.end.getTime());
  const clusters: WeekCluster[] = [];
  for (const entry of sorted) {
    const { start, end } = entryMinuteRange(entry);
    const last = clusters[clusters.length - 1];
    if (last && start < last.end) {
      last.entries.push(entry);
      last.end = Math.max(last.end, end);
    } else {
      clusters.push({ entries: [entry], start, end });
    }
  }
  return clusters;
}
