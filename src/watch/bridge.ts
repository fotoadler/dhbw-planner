import { WatchSync } from '@dhbw/capacitor-watch-sync';
import type { ScheduleEntry } from '../types';
import { createWatchScheduleSnapshot } from './model';

/** Synchronisiert nur den aktuellen, gefilterten Stundenplan zur Uhr. */
export async function syncWatchSchedule(entries: ScheduleEntry[], now: Date = new Date()): Promise<void> {
  try {
    const snapshot = createWatchScheduleSnapshot(entries, now);
    await WatchSync.sync({ snapshot: JSON.stringify(snapshot) });
  } catch (error) {
    // Die Uhr ist ein Zusatzkanal und darf den normalen Stundenplan nie brechen.
    if (import.meta.env?.DEV) console.warn('[watch-sync]', error);
  }
}
