/**
 * Persistenz über @capacitor/preferences: Einstellungen + Stundenplan-Cache.
 *
 * Einstellungen sind bewusst minimal (siehe Design-Philosophie): Rapla-Link,
 * Morgen-Benachrichtigung (an/aus + Uhrzeit), Live-Aktivitaeten,
 * Vorab-Erinnerung (an/aus + Minuten). Sonst nichts.
 */

import { Preferences } from '@capacitor/preferences';
import { deserializeEntry, ScheduleEntry, SerializedEntry, serializeEntry } from '../types';
import { RaplaConfig } from '../rapla/client';
import { Mensa, MensaPlan } from '../seezeit/types';

const SETTINGS_KEY = 'settings.v1';
const CACHE_KEY = 'cache.v1';
const MENSA_CACHE_KEY = 'mensa.v1';

export interface AppSettings {
  /** Der vom Nutzer eingetragene Rapla-Link (Original, für die Anzeige). */
  raplaLink: string;
  rapla: RaplaConfig | null;
  morningEnabled: boolean;
  morningTime: string;
  liveEnabled: boolean;
  reminderEnabled: boolean;
  reminderMinutes: number;
  /** Mensa-Speiseplan in der Tagesansicht anzeigen. */
  mensaEnabled: boolean;
  /** Gewählte Mensa für den Speiseplan. */
  mensa: Mensa;
}

export const DEFAULT_SETTINGS: AppSettings = {
  raplaLink: '',
  rapla: null,
  morningEnabled: true,
  morningTime: '07:00',
  liveEnabled: true,
  reminderEnabled: true,
  reminderMinutes: 15,
  mensaEnabled: true,
  mensa: 'ravensburg',
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const { value } = await Preferences.get({ key: SETTINGS_KEY });
    if (!value) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(value) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await Preferences.set({ key: SETTINGS_KEY, value: JSON.stringify(settings) });
}

/** Cache: geparste Wochen (Key = Montag "YYYY-M-D") + Zeitstempel des Abrufs. */
export interface ScheduleCache {
  updatedAt: string;
  weeks: Record<string, SerializedEntry[]>;
}

export async function loadCache(): Promise<{
  updatedAt: Date;
  weeks: Record<string, ScheduleEntry[]>;
} | null> {
  try {
    const { value } = await Preferences.get({ key: CACHE_KEY });
    if (!value) return null;
    const raw = JSON.parse(value) as ScheduleCache;
    const weeks: Record<string, ScheduleEntry[]> = {};
    for (const [key, entries] of Object.entries(raw.weeks)) {
      weeks[key] = entries.map(deserializeEntry);
    }
    return { updatedAt: new Date(raw.updatedAt), weeks };
  } catch {
    return null; // Defekter Cache wird ignoriert, nicht eskaliert.
  }
}

export async function saveCache(
  weeks: Record<string, ScheduleEntry[]>,
  updatedAt: Date,
): Promise<void> {
  const raw: ScheduleCache = { updatedAt: updatedAt.toISOString(), weeks: {} };
  for (const [key, entries] of Object.entries(weeks)) {
    raw.weeks[key] = entries.map(serializeEntry);
  }
  await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(raw) });
}

/** Mensa-Cache: zuletzt geladener Speiseplan + gewählte Mensa + Zeitstempel (ms). */
export interface MensaCache {
  mensa: Mensa;
  updatedAt: number;
  plan: MensaPlan;
}

export async function loadMensaCache(): Promise<MensaCache | null> {
  try {
    const { value } = await Preferences.get({ key: MENSA_CACHE_KEY });
    if (!value) return null;
    const raw = JSON.parse(value) as MensaCache;
    if (!raw || typeof raw !== 'object' || !raw.plan) return null;
    return raw;
  } catch {
    return null; // Defekter Cache wird ignoriert, nicht eskaliert.
  }
}

export async function saveMensaCache(cache: MensaCache): Promise<void> {
  await Preferences.set({ key: MENSA_CACHE_KEY, value: JSON.stringify(cache) });
}
