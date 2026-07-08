import { ScheduleEntry } from '../types';

export function blockKey(entry: ScheduleEntry): string {
  return entry.title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-DE');
}
