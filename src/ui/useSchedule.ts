/**
 * Zentraler App-State: Einstellungen, geladene Wochen, Refresh-Logik.
 *
 * Live-Halten des Plans: bei jedem Öffnen, per Pull-to-Refresh und beim
 * App-Resume (@capacitor/app) wird das Rapla-HTML neu geladen und geparst.
 * Der letzte Stand liegt im Preferences-Cache und wird sofort angezeigt,
 * während im Hintergrund aktualisiert wird. Nach jedem erfolgreichen Refresh
 * werden die Notifications und die native Live-Aktivitaet synchronisiert.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { ScheduleEntry } from '../types';
import { addDaysYmd, mondayOf, mondayOfYmd, parseYmdKey, ymdKey } from '../lib/berlinTime';
import { fetchWeek, fetchWeeks } from '../rapla/client';
import { getCourseSchedule, groupEntriesByWeek } from '../dhbwApi/client';
import { canonicalCourseName } from '../dhbwApi/courseName';
import { AppSettings, loadCache, loadSettings, saveCache, saveSettings } from '../store/preferences';
import {
  applyLecturerDirectory,
  LecturerDirectory,
  loadLecturerDirectory,
  saveLecturerDirectory,
  updateLecturerDirectory,
} from '../store/lecturerDirectory';
import { initNotifications, syncNotifications } from '../notifications/scheduler';
import { nextLiveActivityTransition, syncCourseLiveActivity } from '../liveActivity/scheduler';
import {
  APP_STORE_DEMO_ENTRIES,
  APP_STORE_DEMO_SETTINGS,
  isAppStoreDemo,
} from '../demo/appStoreDemo';
import { isReviewDemoRaplaLink } from '../demo/reviewDemo';
import { filterScheduleEntries, listScheduleModules, ScheduleModule } from '../schedule/modules';

/** Drei Monate zurück bis drei Monate voraus, damit Kursdetails beide Richtungen zeigen. */
const WINDOW_RADIUS_DAYS = 92;
const WINDOW_WEEKS = Math.ceil((WINDOW_RADIUS_DAYS * 2 + 1) / 7) + 1;
/** Refresh beim Resume, wenn der letzte Abruf älter ist als 10 Minuten. */
const STALE_MS = 10 * 60_000;

type WeekMap = Record<string, ScheduleEntry[]>;

function entryKey(entry: ScheduleEntry): string {
  return JSON.stringify([
    entry.start.toISOString(),
    entry.end.toISOString(),
    entry.title.trim(),
    entry.extra?.trim() ?? '',
    entry.lecturers.map((x) => x.trim()),
    entry.course?.trim() ?? '',
    entry.rooms.map((x) => x.trim()),
    entry.type,
  ]);
}

function dedupeEntries(entries: ScheduleEntry[]): ScheduleEntry[] {
  const seen = new Set<string>();
  const result: ScheduleEntry[] = [];
  for (const entry of entries) {
    const key = entryKey(entry);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result.sort((a, b) => a.start.getTime() - b.start.getTime());
}

function canonicalWeekKey(key: string): string {
  return ymdKey(mondayOfYmd(parseYmdKey(key)));
}

function normalizeWeeks(weeks: WeekMap): WeekMap {
  const grouped: WeekMap = {};
  for (const [key, entries] of Object.entries(weeks)) {
    const mondayKey = canonicalWeekKey(key);
    grouped[mondayKey] = [...(grouped[mondayKey] ?? []), ...entries];
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([key, entries]) => [key, dedupeEntries(entries)]),
  );
}

function flatten(weeks: WeekMap): ScheduleEntry[] {
  return dedupeEntries(Object.values(weeks).flat());
}

/** Alte/ferne Wochen aus dem Cache werfen (±3 Monate um heute). */
function prune(weeks: WeekMap): WeekMap {
  const normalized = normalizeWeeks(weeks);
  const todayMonday = mondayOf(new Date());
  const min = ymdKey(mondayOfYmd(addDaysYmd(todayMonday, -WINDOW_RADIUS_DAYS)));
  const max = ymdKey(mondayOfYmd(addDaysYmd(todayMonday, WINDOW_RADIUS_DAYS)));
  return Object.fromEntries(Object.entries(normalized).filter(([k]) => k >= min && k <= max));
}

function sameRaplaConfig(
  a: AppSettings['rapla'] | undefined,
  b: AppSettings['rapla'] | undefined,
): boolean {
  if (!a && !b) return true;
  return Boolean(
    a &&
      b &&
      a.baseUrl === b.baseUrl &&
      a.user === b.user &&
      a.file === b.file &&
      a.key === b.key &&
      a.salt === b.salt,
  );
}

function sameApiSelection(a: AppSettings['apiSelection'] | undefined, b: AppSettings['apiSelection'] | undefined): boolean {
  if (!a && !b) return true;
  return Boolean(a && b && a.site === b.site && a.course === b.course && a.degree === b.degree);
}

function scheduleSourceKey(settings: AppSettings | null | undefined): string | undefined {
  if (settings?.scheduleSource === 'dhbw-api' && settings.apiSelection) {
    return `api:${settings.apiSelection.site}:${settings.apiSelection.course}`;
  }
  if (settings?.rapla) {
    return `rapla:${settings.rapla.baseUrl}:${settings.rapla.user ?? ''}:${settings.rapla.file ?? ''}:${settings.rapla.key ?? ''}:${settings.rapla.salt ?? ''}`;
  }
  return undefined;
}

function sameScheduleSource(a: AppSettings | null | undefined, b: AppSettings | null | undefined): boolean {
  return sameRaplaConfig(a?.rapla, b?.rapla) && sameApiSelection(a?.apiSelection, b?.apiSelection) && a?.scheduleSource === b?.scheduleSource;
}

export function useSchedule() {
  const [reviewDemo, setReviewDemo] = useState(false);
  const demo = isAppStoreDemo() || reviewDemo;
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [weeks, setWeeks] = useState<WeekMap>({});
  const [directory, setDirectory] = useState<LecturerDirectory>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [offline, setOffline] = useState(false);

  // Refs, damit Listener/Callbacks immer den aktuellen Stand sehen.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const weeksRef = useRef(weeks);
  weeksRef.current = weeks;
  const directoryRef = useRef(directory);
  directoryRef.current = directory;
  const updatedAtRef = useRef(updatedAt);
  updatedAtRef.current = updatedAt;
  const refreshGenerationRef = useRef(0);
  const inFlightWeeksRef = useRef(new Map<string, Promise<void>>());
  const cacheWriteChainRef = useRef(Promise.resolve());
  const cacheMetaRef = useRef<{ sourceKey?: string; etag?: string }>({});

  // Preferences writes are serialized so a slower, older refresh cannot finish
  // after a newer one and overwrite its cache.
  const enqueueCacheSave = useCallback(
    (nextWeeks: WeekMap, timestamp: Date, metadata: { sourceKey?: string; etag?: string } = {}): Promise<void> => {
      const write = cacheWriteChainRef.current.then(() => saveCache(nextWeeks, timestamp, metadata));
    cacheWriteChainRef.current = write.catch(() => {});
    return write;
    },
    [],
  );

  // Fehlende Dozenten aus dem dauerhaften Verzeichnis ergänzen (Abruf außerhalb
  // des Campus liefert nur Kurse). In-Netz-Termine mit Dozenten bleiben unberührt.
  const allEntries = useMemo(
    () => applyLecturerDirectory(flatten(weeks), directory),
    [weeks, directory],
  );
  const entries = useMemo(
    () => filterScheduleEntries(allEntries, settings?.hiddenModules ?? []),
    [allEntries, settings?.hiddenModules],
  );
  const availableModules = useMemo<ScheduleModule[]>(
    () => listScheduleModules(allEntries),
    [allEntries],
  );

  /** Lädt den aktiven Provider, persistiert den gemeinsamen Plan und plant lokale Erinnerungen. */
  const refresh = useCallback(async (): Promise<void> => {
    if (demo) return;
    const s = settingsRef.current;
    const apiSelection = s?.scheduleSource === 'dhbw-api' ? s.apiSelection : null;
    if (!s || (!s.rapla && !apiSelection)) return;
    const generation = ++refreshGenerationRef.current;
    setRefreshing(true);
    try {
      const sourceKey = scheduleSourceKey(s);
      let fresh: WeekMap;
      let failedWeeks: string[] = [];

      if (apiSelection) {
        const storedEtag = cacheMetaRef.current.sourceKey === sourceKey ? cacheMetaRef.current.etag : undefined;
        const apiResult = await getCourseSchedule(canonicalCourseName(apiSelection.site, apiSelection.course), storedEtag);
        if (apiResult.notModified) {
          if (Object.keys(weeksRef.current).length === 0) throw new Error('DHBW-API: Kein lokaler Cache für 304-Antwort.');
          fresh = weeksRef.current;
        } else {
          fresh = groupEntriesByWeek(apiResult.entries);
        }
        cacheMetaRef.current = { sourceKey, etag: apiResult.etag ?? storedEtag };
      } else {
        const firstMonday = mondayOfYmd(addDaysYmd(mondayOf(new Date()), -WINDOW_RADIUS_DAYS));
        const freshResult = await fetchWeeks(s.rapla!, firstMonday, WINDOW_WEEKS);
        fresh = Object.fromEntries(freshResult.weeks);
        failedWeeks = freshResult.failedWeeks;
        cacheMetaRef.current = { sourceKey };
      }

      if (generation !== refreshGenerationRef.current || !sameScheduleSource(settingsRef.current, s)) {
        return;
      }
      // Verzeichnis mit frisch geladenen Dozenten aktualisieren (nur im Hochschulnetz nicht leer).
      const { directory: nextDir, changed } = updateLecturerDirectory(
        directoryRef.current,
        Object.values(fresh).flat(),
      );
      directoryRef.current = nextDir;
      // Rapla liefert wochenweise Daten und wird deshalb gemerged. Der API-
      // Kurs-Endpoint ist dagegen die autoritative Antwort für diesen Kurs;
      // so verschwinden auch gelöschte Termine aus dem lokalen Cache.
      // The API request includes archived dates, so retain the complete
      // history. Rapla keeps its bounded rolling window as before.
      const merged = apiSelection ? normalizeWeeks(fresh) : prune({ ...weeksRef.current, ...fresh });
      const now = new Date();
      weeksRef.current = merged;
      setWeeks(merged);
      if (changed) {
        setDirectory(nextDir);
        await saveLecturerDirectory(nextDir);
      }
      setUpdatedAt(now);
      setOffline(failedWeeks.length > 0);
      await enqueueCacheSave(merged, now, { sourceKey, etag: cacheMetaRef.current.etag });
      const activeSettings = settingsRef.current;
      if (generation !== refreshGenerationRef.current || !activeSettings || !sameScheduleSource(activeSettings, s)) {
        return;
      }
      const filled = filterScheduleEntries(
        applyLecturerDirectory(flatten(merged), nextDir),
        activeSettings.hiddenModules,
      );
      await syncNotifications(filled, activeSettings);
      await syncCourseLiveActivity(filled, activeSettings, now);
    } catch {
      // Offline/Netzwerkfehler: letzter Cache bleibt sichtbar, Notifications
      // bleiben auf Basis des Caches geplant.
      if (generation !== refreshGenerationRef.current || !sameScheduleSource(settingsRef.current, s)) {
        return;
      }
      setOffline(true);
      const activeSettings = settingsRef.current;
      if (activeSettings) {
        await syncCourseLiveActivity(
          filterScheduleEntries(
            applyLecturerDirectory(flatten(weeksRef.current), directoryRef.current),
            activeSettings.hiddenModules,
          ),
          activeSettings,
        );
      }
    } finally {
      if (generation === refreshGenerationRef.current) setRefreshing(false);
    }
  }, [demo, enqueueCacheSave]);

  /** Lädt eine Woche außerhalb des Fensters nach (Navigation in Vergangenheit/Zukunft). */
  const ensureWeek = useCallback(async (mondayKey: string): Promise<void> => {
    if (demo) return;
    const s = settingsRef.current;
    const key = canonicalWeekKey(mondayKey);
    // Der API-Kurs-Endpoint liefert den autoritativen Kursplan in einem Abruf;
    // Navigation innerhalb dieses Ergebnisses braucht keine Wochenabfragen.
    if (s?.scheduleSource === 'dhbw-api' && s.apiSelection) return;
    if (!s?.rapla || weeksRef.current[key]) return;
    const existing = inFlightWeeksRef.current.get(key);
    if (existing) return existing;

    let request: Promise<void> | null = null;
    const run = async () => {
      try {
        const weekEntries = await fetchWeek(s.rapla!, parseYmdKey(key));
        if (!sameScheduleSource(settingsRef.current, s)) return;

        const { directory: nextDir, changed } = updateLecturerDirectory(
          directoryRef.current,
          weekEntries,
        );
        const merged = normalizeWeeks({ ...weeksRef.current, [key]: weekEntries });
        weeksRef.current = merged;
        setWeeks(merged);
        directoryRef.current = nextDir;
        if (changed) {
          setDirectory(nextDir);
          await saveLecturerDirectory(nextDir);
        }

        const now = new Date();
        updatedAtRef.current = now;
        setUpdatedAt(now);
        await enqueueCacheSave(merged, now, { sourceKey: scheduleSourceKey(s) });
        const activeSettings = settingsRef.current;
        if (!activeSettings || !sameScheduleSource(activeSettings, s)) return;
        const filled = filterScheduleEntries(
          applyLecturerDirectory(flatten(merged), nextDir),
          activeSettings.hiddenModules,
        );
        await syncNotifications(filled, activeSettings);
        await syncCourseLiveActivity(filled, activeSettings, now);
      } catch {
        /* Woche bleibt leer — Offline-Banner zeigt der reguläre Refresh. */
      } finally {
        if (request && inFlightWeeksRef.current.get(key) === request) inFlightWeeksRef.current.delete(key);
      }
    };
    request = run();
    inFlightWeeksRef.current.set(key, request);
    return request;
  }, [demo, enqueueCacheSave]);

  /** Persistiert Einstellungen; bei neuem Provider/Kurs wird der Plan neu geladen. */
  const applySettings = useCallback(
    async (next: AppSettings): Promise<void> => {
      if (isAppStoreDemo()) {
        // Store-Aufnahmen bleiben datenseitig unverändert, dürfen aber den
        // Theme-Umschalter genauso wie die echte App demonstrieren.
        const current = settingsRef.current;
        if (current && current.themeMode !== next.themeMode) {
          const demoSettings = { ...current, themeMode: next.themeMode };
          setSettings(demoSettings);
          settingsRef.current = demoSettings;
        }
        return;
      }
      if (isReviewDemoRaplaLink(next.raplaLink)) {
        // Der Review-Link ist ein lokaler Schalter: keine Speicherung,
        // keine Benachrichtigungen und kein Abruf eines externen Systems.
        refreshGenerationRef.current += 1;
        const reviewSettings = { ...APP_STORE_DEMO_SETTINGS, raplaLink: next.raplaLink, rapla: next.rapla };
        const weekKey = ymdKey(mondayOfYmd(parseYmdKey('2026-07-20')));
        const now = new Date();
        setReviewDemo(true);
        setSettings(reviewSettings);
        settingsRef.current = reviewSettings;
        setWeeks({ [weekKey]: APP_STORE_DEMO_ENTRIES });
        weeksRef.current = { [weekKey]: APP_STORE_DEMO_ENTRIES };
        setUpdatedAt(now);
        setOffline(false);
        return;
      }
      if (reviewDemo) return;
      const prev = settingsRef.current;
      const sourceChanged = !sameScheduleSource(prev, next);
      setSettings(next);
      settingsRef.current = next;
      await saveSettings(next);
      if (sourceChanged) {
        refreshGenerationRef.current += 1;
        cacheMetaRef.current = {};
        setWeeks({});
        weeksRef.current = {};
        setUpdatedAt(null);
        setOffline(false);
        await refresh();
      } else {
        // Nur Benachrichtigungsoptionen geaendert: mit vorhandenen Daten neu planen/synchronisieren.
        const filled = filterScheduleEntries(
          applyLecturerDirectory(flatten(weeksRef.current), directoryRef.current),
          next.hiddenModules,
        );
        await syncNotifications(filled, next);
        await syncCourseLiveActivity(filled, next);
      }
    },
    [refresh, reviewDemo],
  );

  // Initialer Start: Settings + Cache laden, dann im Hintergrund aktualisieren.
  useEffect(() => {
    if (demo) {
      const currentSettings = settingsRef.current;
      const demoSettings =
        reviewDemo && currentSettings
          ? { ...APP_STORE_DEMO_SETTINGS, raplaLink: currentSettings.raplaLink, rapla: currentSettings.rapla }
          : APP_STORE_DEMO_SETTINGS;
      const weekKey = ymdKey(mondayOfYmd(parseYmdKey('2026-07-20')));
      const now = new Date();
      setSettings(demoSettings);
      settingsRef.current = demoSettings;
      setWeeks({ [weekKey]: APP_STORE_DEMO_ENTRIES });
      weeksRef.current = { [weekKey]: APP_STORE_DEMO_ENTRIES };
      setUpdatedAt(now);
      return;
    }
    void (async () => {
      await initNotifications();
      const s = await loadSettings();
      const [cache, dir] = await Promise.all([loadCache(scheduleSourceKey(s)), loadLecturerDirectory()]);
      directoryRef.current = dir;
      setDirectory(dir);
      if (cache) {
        cacheMetaRef.current = { sourceKey: cache.sourceKey ?? scheduleSourceKey(s), etag: cache.etag };
        const restored = s.scheduleSource === 'dhbw-api' && s.apiSelection
          ? normalizeWeeks(cache.weeks)
          : prune(cache.weeks);
        weeksRef.current = restored;
        setWeeks(restored);
        setUpdatedAt(cache.updatedAt);
        await syncCourseLiveActivity(
          filterScheduleEntries(applyLecturerDirectory(flatten(restored), dir), s.hiddenModules),
          s,
        );
      }
      setSettings(s);
      settingsRef.current = s;
      if (s.rapla || (s.scheduleSource === 'dhbw-api' && s.apiSelection)) void refresh();
    })();
  }, [demo, refresh]);

  // App-Resume: prüfen, ob Refresh + Neuplanung nötig sind.
  useEffect(() => {
    if (demo) return;
    const listener = CapApp.addListener('resume', () => {
      const s = settingsRef.current;
      if (s) {
        void syncCourseLiveActivity(
          filterScheduleEntries(
            applyLecturerDirectory(flatten(weeksRef.current), directoryRef.current),
            s.hiddenModules,
          ),
          s,
        );
      }
      const age = updatedAtRef.current ? Date.now() - updatedAtRef.current.getTime() : Infinity;
      if ((s?.rapla || (s?.scheduleSource === 'dhbw-api' && s.apiSelection)) && age > STALE_MS) void refresh();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [demo, refresh]);

  // Vor dem nächsten Kurs registriert iOS 26 einen nativen, zeitgesteuerten
  // Start. Die übrige Synchronisierung geschieht nur an Kursgrenzen statt
  // minütlich, damit eine weggewischte Activity nicht neu angefordert wird.
  useEffect(() => {
    if (demo || !settings) return;

    const now = new Date();
    const sync = () => void syncCourseLiveActivity(entries, settings);
    sync();

    const transition = nextLiveActivityTransition(entries, now);
    if (!transition) return;

    // Run just after the boundary. Timers are suspended in the background;
    // the existing resume listener performs the same reconciliation then.
    const delay = Math.max(250, transition.getTime() - now.getTime() + 250);
    const timer = window.setTimeout(sync, delay);
    return () => window.clearTimeout(timer);
  }, [demo, entries, settings]);

  return {
    settings,
    entries,
    allEntries,
    availableModules,
    updatedAt,
    refreshing,
    offline,
    isReviewDemo: reviewDemo,
    refresh,
    ensureWeek,
    applySettings,
  };
}
