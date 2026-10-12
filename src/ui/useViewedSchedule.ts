import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { fetchWeek, fetchWeeks } from '../rapla/client';
import { getCourseSchedule, groupEntriesByWeek } from '../dhbwApi/client';
import { addDaysYmd, mondayOf, parseYmdKey } from '../lib/berlinTime';
import { loadCache, saveCache } from '../store/preferences';
import { profileSourceKey, type CourseProfile } from '../store/courseProfiles';
import { applyLecturerDirectory, loadLecturerDirectory, type LecturerDirectory } from '../store/lecturerDirectory';
import { filterScheduleEntries, listScheduleModules } from '../schedule/modules';
import type { ScheduleEntry } from '../types';

type Snapshot = { key: string; weeks: Record<string, ScheduleEntry[]>; updatedAt: Date | null; etag?: string; offline: boolean };

/** Read-only course browsing: deliberately has no notification or calendar imports. */
export function useViewedSchedule(profile: CourseProfile | undefined) {
  const sourceKey = profile ? profileSourceKey(profile) : undefined;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loadingKey, setLoadingKey] = useState<string>();
  const [directory, setDirectory] = useState<LecturerDirectory>({});
  const snapshots = useRef(new Map<string, Snapshot>());
  const currentProfile = useRef(profile);
  currentProfile.current = profile;
  const generation = useRef(0);
  const writes = useRef(Promise.resolve());

  const store = useCallback((next: Snapshot) => {
    snapshots.current.set(next.key, next);
    setSnapshot(next);
    const write = writes.current.then(() => saveCache(next.weeks, next.updatedAt!, { sourceKey: next.key, etag: next.etag }, true));
    writes.current = write.catch(() => {});
  }, []);

  const refresh = useCallback(async () => {
    const selected = currentProfile.current;
    if (!selected || !sourceKey || profileSourceKey(selected) !== sourceKey) return;
    const request = ++generation.current;
    setLoadingKey(sourceKey);
    try {
      const cached = snapshots.current.get(sourceKey);
      let weeks: Snapshot['weeks'];
      let etag: string | undefined;
      let offline = false;
      if (selected.scheduleSource === 'dhbw-api' && selected.apiSelection) {
        const result = await getCourseSchedule(selected.apiSelection.course, cached?.etag);
        if (result.notModified && !cached) throw new Error('Missing course cache');
        weeks = result.notModified ? cached!.weeks : groupEntriesByWeek(result.entries);
        etag = result.etag ?? cached?.etag;
      } else {
        const result = await fetchWeeks(selected.rapla!, addDaysYmd(mondayOf(new Date()), -91), 28);
        weeks = { ...cached?.weeks, ...Object.fromEntries(result.weeks) };
        offline = result.failedWeeks.length > 0;
      }
      if (request !== generation.current || profileSourceKey(currentProfile.current!) !== sourceKey) return;
      store({ key: sourceKey, weeks, etag, updatedAt: new Date(), offline });
    } catch {
      if (request === generation.current) {
        const cached = snapshots.current.get(sourceKey);
        setSnapshot({ key: sourceKey, weeks: cached?.weeks ?? {}, updatedAt: cached?.updatedAt ?? null, etag: cached?.etag, offline: true });
      }
    } finally {
      if (request === generation.current) setLoadingKey(undefined);
    }
  }, [sourceKey, store]);

  useEffect(() => {
    let active = true;
    generation.current++;
    if (!sourceKey) { setLoadingKey(undefined); return; }
    setLoadingKey(sourceKey);
    setSnapshot(snapshots.current.get(sourceKey) ?? null);
    void (async () => {
      const [cache, dir] = await Promise.all([loadCache(sourceKey, true), loadLecturerDirectory()]);
      if (!active) return;
      setDirectory(dir);
      if (cache && !snapshots.current.has(sourceKey)) {
        const restored = { key: sourceKey, weeks: cache.weeks, updatedAt: cache.updatedAt, etag: cache.etag, offline: false };
        snapshots.current.set(sourceKey, restored);
        setSnapshot(restored);
      }
      await refresh();
    })();
    return () => { active = false; generation.current++; };
  }, [sourceKey, refresh]);

  useEffect(() => {
    if (!sourceKey) return;
    const listener = CapApp.addListener('resume', () => void refresh());
    return () => { void listener.then(l => l.remove()); };
  }, [sourceKey, refresh]);

  const ensureWeek = useCallback(async (key: string) => {
    const selected = currentProfile.current;
    if (!sourceKey || selected?.scheduleSource !== 'rapla' || !selected.rapla) return;
    const cached = snapshots.current.get(sourceKey);
    if (cached?.weeks[key]) return;
    const request = generation.current;
    try {
      const entries = await fetchWeek(selected.rapla, parseYmdKey(key));
      if (request !== generation.current) return;
      const latest = snapshots.current.get(sourceKey);
      store({ key: sourceKey, weeks: { ...latest?.weeks, [key]: entries }, updatedAt: new Date(), etag: latest?.etag, offline: false });
    } catch { /* The regular refresh provides the offline state. */ }
  }, [sourceKey, store]);

  // The key check clears old data in the same render as the profile switch.
  const visible = snapshot?.key === sourceKey ? snapshot : null;
  const allEntries = useMemo(() => applyLecturerDirectory(Object.values(visible?.weeks ?? {}).flat(), directory), [visible, directory]);
  const entries = useMemo(() => filterScheduleEntries(allEntries, profile?.hiddenModules ?? []), [allEntries, profile?.hiddenModules]);
  const availableModules = useMemo(() => listScheduleModules(allEntries), [allEntries]);
  return { entries, allEntries, availableModules, updatedAt: visible?.updatedAt ?? null,
    offline: visible?.offline ?? false, refreshing: Boolean(sourceKey && (!visible || loadingKey === sourceKey)), refresh, ensureWeek };
}
