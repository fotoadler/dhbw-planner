import { getCourseSchedule, groupEntriesByWeek } from './client';
import type { ApiSelection } from '../store/preferences';
import { loadCache, saveCache } from '../store/preferences';
import type { ScheduleEntry } from '../types';

export function additionalCourses(selection: ApiSelection): string[] {
  return [...new Set(selection.additionalCourses ?? [])].filter(c => c !== selection.course).sort();
}
export function studyPlanKey(selection: ApiSelection): string {
  const extra = additionalCourses(selection);
  return `api:${selection.site}:${selection.course}${extra.length ? `:extra:${JSON.stringify(extra)}` : ''}`;
}
export function mergeStudyEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  const merged = new Map<string, ScheduleEntry>();
  for (const entry of entries) {
    const key = JSON.stringify([+entry.start, +entry.end, entry.title.trim(), [...entry.rooms].sort(), [...entry.lecturers].sort(), entry.type]);
    if (!merged.has(key)) merged.set(key, entry);
  }
  return [...merged.values()].sort((a,b) => +a.start - +b.start);
}

/** Every source has its own ETag/cache. A partial failure never becomes a complete calendar snapshot. */
export async function getStudyPlan(selection: ApiSelection, etag?: string) {
  const extra = additionalCourses(selection);
  if (!extra.length) return getCourseSchedule(selection.course, etag);
  const results = await Promise.all([selection.course, ...extra].map(async course => {
    const key = `api:${selection.site}:${course}`;
    const cached = await loadCache(key, true);
    const result = await getCourseSchedule(course, cached?.etag);
    if (result.notModified) {
      if (!cached) throw new Error('Kein Cache für unveränderten Zusatzplan.');
      return Object.values(cached.weeks).flat();
    }
    await saveCache(groupEntriesByWeek(result.entries), new Date(), {sourceKey:key, etag:result.etag}, true);
    return result.entries;
  }));
  return {entries:mergeStudyEntries(results.flat()), notModified:false, etag:undefined};
}

