import { berlinDayKey, TZ } from '../lib/berlinTime';
import type { ScheduleEntry } from '../types';

/**
 * Kleine, plattformunabhaengige Projektion des Stundenplans fuer die Uhr.
 * Zugangsdaten, Cache-Metadaten und Hochschul-Accounts bleiben bewusst aus
 * diesem Modell heraus.
 */
export interface WatchScheduleEntry {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  room: string;
  lecturer: string;
  extra: string;
  type: ScheduleEntry['type'];
  day: string;
}

export interface WatchScheduleSnapshot {
  version: 1;
  timezone: typeof TZ;
  updatedAt: number;
  currentEntry: WatchScheduleEntry | null;
  nextEntry: WatchScheduleEntry | null;
  today: string;
  todayEntries: WatchScheduleEntry[];
  upcomingEntries: WatchScheduleEntry[];
}

const UPCOMING_DAYS = 14;
const MAX_TODAY_ENTRIES = 24;
const MAX_UPCOMING_ENTRIES = 80;

function compactText(values: string[]): string {
  return values.map((value) => value.trim()).filter(Boolean).join(', ');
}

function entryId(entry: ScheduleEntry): string {
  return [entry.start.toISOString(), entry.end.toISOString(), entry.title.trim()].join('|');
}

function projectEntry(entry: ScheduleEntry): WatchScheduleEntry {
  return {
    id: entryId(entry),
    title: entry.title.trim(),
    startTime: entry.start.getTime(),
    endTime: entry.end.getTime(),
    room: compactText(entry.rooms),
    lecturer: compactText(entry.lecturers),
    extra: entry.extra?.trim() ?? '',
    type: entry.type,
    day: berlinDayKey(entry.start),
  };
}

function sortedEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  return [...entries]
    .filter((entry) => Number.isFinite(entry.start.getTime()) && Number.isFinite(entry.end.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

function addDays(day: string, days: number): string {
  const [year, month, date] = day.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, date + days, 12));
  return [next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate()]
    .map((value) => String(value).padStart(2, '0'))
    .join('-');
}

/** Erstellt den kompakten Datenstand, den native Watch-Targets lokal halten. */
export function createWatchScheduleSnapshot(
  entries: ScheduleEntry[],
  now: Date = new Date(),
): WatchScheduleSnapshot {
  const sorted = sortedEntries(entries);
  const nowMs = now.getTime();
  const today = berlinDayKey(now);
  const lastDay = addDays(today, UPCOMING_DAYS);
  const current = sorted.find((entry) => entry.start.getTime() <= nowMs && entry.end.getTime() > nowMs);
  const next = sorted.find((entry) => entry.start.getTime() > (current?.end.getTime() ?? nowMs));
  const todayEntries = sorted
    .filter((entry) => berlinDayKey(entry.start) === today)
    .slice(0, MAX_TODAY_ENTRIES)
    .map(projectEntry);
  const upcomingEntries = sorted
    .filter((entry) => {
      const day = berlinDayKey(entry.start);
      return day >= today && day <= lastDay && entry.start.getTime() >= nowMs;
    })
    .slice(0, MAX_UPCOMING_ENTRIES)
    .map(projectEntry);

  return {
    version: 1,
    timezone: TZ,
    updatedAt: nowMs,
    currentEntry: current ? projectEntry(current) : null,
    nextEntry: next ? projectEntry(next) : null,
    today,
    todayEntries,
    upcomingEntries,
  };
}
