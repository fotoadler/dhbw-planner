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
import { AppSettings, loadCache, loadSettings, saveCache, saveSettings } from '../store/preferences';
import {
  applyLecturerDirectory,
  LecturerDirectory,
  loadLecturerDirectory,
  saveLecturerDirectory,
  updateLecturerDirectory,
} from '../store/lecturerDirectory';
import { initNotifications, syncNotifications } from '../notifications/scheduler';
import { syncCourseLiveActivity } from '../liveActivity/scheduler';

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

export function useSchedule() {
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

  // Fehlende Dozenten aus dem dauerhaften Verzeichnis ergänzen (Abruf außerhalb
  // des Campus liefert nur Kurse). In-Netz-Termine mit Dozenten bleiben unberührt.
  const entries = useMemo(
    () => applyLecturerDirectory(flatten(weeks), directory),
    [weeks, directory],
  );

  /** Lädt das Kursdetail-Fenster, merged, persistiert, plant Notifications. */
  const refresh = useCallback(async (): Promise<void> => {
    const s = settingsRef.current;
    if (!s?.rapla) return;
    setRefreshing(true);
    try {
      const firstMonday = mondayOfYmd(addDaysYmd(mondayOf(new Date()), -WINDOW_RADIUS_DAYS));
      const fresh = await fetchWeeks(s.rapla, firstMonday, WINDOW_WEEKS);
      // Verzeichnis mit frisch geladenen Dozenten aktualisieren (nur im Hochschulnetz nicht leer).
      const { directory: nextDir, changed } = updateLecturerDirectory(
        directoryRef.current,
        [...fresh.values()].flat(),
      );
      directoryRef.current = nextDir;
      const merged = prune({ ...weeksRef.current, ...Object.fromEntries(fresh) });
      const now = new Date();
      setWeeks(merged);
      if (changed) {
        setDirectory(nextDir);
        await saveLecturerDirectory(nextDir);
      }
      setUpdatedAt(now);
      setOffline(false);
      await saveCache(merged, now);
      const filled = applyLecturerDirectory(flatten(merged), nextDir);
      await syncNotifications(filled, s);
      await syncCourseLiveActivity(filled, s, now);
    } catch {
      // Offline/Netzwerkfehler: letzter Cache bleibt sichtbar, Notifications
      // bleiben auf Basis des Caches geplant.
      setOffline(true);
      if (s) {
        await syncCourseLiveActivity(
          applyLecturerDirectory(flatten(weeksRef.current), directoryRef.current),
          s,
        );
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  /** Lädt eine Woche außerhalb des Fensters nach (Navigation in Vergangenheit/Zukunft). */
  const ensureWeek = useCallback(async (mondayKey: string): Promise<void> => {
    const s = settingsRef.current;
    const key = canonicalWeekKey(mondayKey);
    if (!s?.rapla || weeksRef.current[key]) return;
    try {
      const weekEntries = await fetchWeek(s.rapla, parseYmdKey(key));
      const { directory: nextDir, changed } = updateLecturerDirectory(
        directoryRef.current,
        weekEntries,
      );
      setWeeks((prev) => normalizeWeeks({ ...prev, [key]: weekEntries }));
      if (changed) {
        directoryRef.current = nextDir;
        setDirectory(nextDir);
        void saveLecturerDirectory(nextDir);
      }
    } catch {
      /* Woche bleibt leer — Offline-Banner zeigt der reguläre Refresh. */
    }
  }, []);

  /** Persistiert Einstellungen; bei neuem Rapla-Link wird alles neu geladen. */
  const applySettings = useCallback(
    async (next: AppSettings): Promise<void> => {
      const prev = settingsRef.current;
      const linkChanged =
        prev?.rapla?.user !== next.rapla?.user || prev?.rapla?.file !== next.rapla?.file;
      setSettings(next);
      settingsRef.current = next;
      await saveSettings(next);
      if (linkChanged) {
        setWeeks({});
        weeksRef.current = {};
        await refresh();
      } else {
        // Nur Benachrichtigungsoptionen geaendert: mit vorhandenen Daten neu planen/synchronisieren.
        const filled = applyLecturerDirectory(flatten(weeksRef.current), directoryRef.current);
        await syncNotifications(filled, next);
        await syncCourseLiveActivity(filled, next);
      }
    },
    [refresh],
  );

  // Initialer Start: Settings + Cache laden, dann im Hintergrund aktualisieren.
  useEffect(() => {
    void (async () => {
      await initNotifications();
      const s = await loadSettings();
      const [cache, dir] = await Promise.all([loadCache(), loadLecturerDirectory()]);
      directoryRef.current = dir;
      setDirectory(dir);
      if (cache) {
        const pruned = prune(cache.weeks);
        setWeeks(pruned);
        setUpdatedAt(cache.updatedAt);
        await syncCourseLiveActivity(applyLecturerDirectory(flatten(pruned), dir), s);
      }
      setSettings(s);
      settingsRef.current = s;
      if (s.rapla) void refresh();
    })();
  }, [refresh]);

  // App-Resume: prüfen, ob Refresh + Neuplanung nötig sind.
  useEffect(() => {
    const listener = CapApp.addListener('resume', () => {
      const s = settingsRef.current;
      if (s) {
        void syncCourseLiveActivity(
          applyLecturerDirectory(flatten(weeksRef.current), directoryRef.current),
          s,
        );
      }
      const age = updatedAtRef.current ? Date.now() - updatedAtRef.current.getTime() : Infinity;
      if (s?.rapla && age > STALE_MS) void refresh();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [refresh]);

  // Foreground-Takt: aktualisiert Countdown/Progress der nativen Live-Aktivitaet.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const s = settingsRef.current;
      if (s) {
        void syncCourseLiveActivity(
          applyLecturerDirectory(flatten(weeksRef.current), directoryRef.current),
          s,
        );
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return { settings, entries, updatedAt, refreshing, offline, refresh, ensureWeek, applySettings };
}
