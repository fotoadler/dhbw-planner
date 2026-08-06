/**
 * Persistenz über @capacitor/preferences: Einstellungen + Stundenplan-Cache.
 *
 * Einstellungen sind bewusst minimal (siehe Design-Philosophie): Rapla-Link,
 * Morgen-Benachrichtigung (an/aus + Uhrzeit), Live-Aktivitaeten,
 * Vorab-Erinnerung (an/aus + Minuten). Sonst nichts.
 */

import { Preferences } from '@capacitor/preferences';
import { deserializeEntry, ScheduleEntry, SerializedEntry, serializeEntry } from '../types';
import { DEFAULT_BASE_URL, type RaplaConfig } from '../rapla/client';
import { Mensa, MensaPlan } from '../seezeit/types';

const SETTINGS_KEY = 'settings.v2';
const LEGACY_SETTINGS_KEY = 'settings.v1';
const CACHE_KEY = 'cache.v2';
const LEGACY_CACHE_KEY = 'cache.v1';
const MENSA_CACHE_KEY = 'mensa.v1';
const STORAGE_VERSION = 2;

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMensa(value: unknown): value is Mensa {
  return value === 'ravensburg' || value === 'friedrichshafen';
}

function isTime(value: unknown): value is string {
  return typeof value === 'string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function parseRaplaConfig(value: unknown): RaplaConfig | null {
  if (!isRecord(value) || typeof value.baseUrl !== 'string') return null;
  try {
    const url = new URL(value.baseUrl);
    const defaultUrl = new URL(DEFAULT_BASE_URL);
    const path = url.pathname.replace(/\/$/, '');
    if (url.origin !== defaultUrl.origin || !['/rapla/calendar', '/rapla/internal_calendar'].includes(path)) {
      return null;
    }

    const hasUserLink = typeof value.user === 'string' && typeof value.file === 'string';
    const hasShareLink = typeof value.key === 'string' && typeof value.salt === 'string';
    if (!hasUserLink && !hasShareLink) return null;
    return {
      ...(hasUserLink ? { user: value.user as string, file: value.file as string } : {}),
      ...(hasShareLink ? { key: value.key as string, salt: value.salt as string } : {}),
      baseUrl: value.baseUrl,
    };
  } catch {
    return null;
  }
}

function defaultSettings(): AppSettings {
  return { ...DEFAULT_SETTINGS };
}

function parseSettings(raw: unknown): AppSettings {
  const data =
    isRecord(raw) && raw.version === STORAGE_VERSION && isRecord(raw.data)
      ? raw.data
      : isRecord(raw) && 'version' in raw
        ? null
        : raw;
  if (!isRecord(data)) return defaultSettings();

  const reminderMinutes = data.reminderMinutes;
  return {
    raplaLink: typeof data.raplaLink === 'string' ? data.raplaLink : DEFAULT_SETTINGS.raplaLink,
    rapla: parseRaplaConfig(data.rapla),
    morningEnabled: typeof data.morningEnabled === 'boolean' ? data.morningEnabled : DEFAULT_SETTINGS.morningEnabled,
    morningTime: isTime(data.morningTime) ? data.morningTime : DEFAULT_SETTINGS.morningTime,
    liveEnabled: typeof data.liveEnabled === 'boolean' ? data.liveEnabled : DEFAULT_SETTINGS.liveEnabled,
    reminderEnabled:
      typeof data.reminderEnabled === 'boolean' ? data.reminderEnabled : DEFAULT_SETTINGS.reminderEnabled,
    reminderMinutes:
      typeof reminderMinutes === 'number' &&
      Number.isInteger(reminderMinutes) &&
      reminderMinutes >= 1 &&
      reminderMinutes <= 120
        ? reminderMinutes
        : DEFAULT_SETTINGS.reminderMinutes,
    mensaEnabled: typeof data.mensaEnabled === 'boolean' ? data.mensaEnabled : DEFAULT_SETTINGS.mensaEnabled,
    mensa: isMensa(data.mensa) ? data.mensa : DEFAULT_SETTINGS.mensa,
  };
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const current = await Preferences.get({ key: SETTINGS_KEY });
    const legacy = current.value ? null : await Preferences.get({ key: LEGACY_SETTINGS_KEY });
    const value = current.value ?? legacy?.value;
    if (!value) return defaultSettings();
    return parseSettings(JSON.parse(value) as unknown);
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await Preferences.set({
    key: SETTINGS_KEY,
    value: JSON.stringify({ version: STORAGE_VERSION, data: settings }),
  });
}

/** Cache: geparste Wochen (Key = Montag "YYYY-M-D") + Zeitstempel des Abrufs. */
export interface ScheduleCache {
  version: 2;
  updatedAt: string;
  weeks: Record<string, SerializedEntry[]>;
}

function isEntryType(value: unknown): value is ScheduleEntry['type'] {
  return value === 'lecture' || value === 'exam' || value === 'online' || value === 'holiday' || value === 'unknown';
}

function isSerializedEntry(value: unknown): value is SerializedEntry {
  return (
    isRecord(value) &&
    typeof value.start === 'string' &&
    Number.isFinite(Date.parse(value.start)) &&
    typeof value.end === 'string' &&
    Number.isFinite(Date.parse(value.end)) &&
    typeof value.title === 'string' &&
    Array.isArray(value.lecturers) &&
    value.lecturers.every((item) => typeof item === 'string') &&
    (value.course === undefined || typeof value.course === 'string') &&
    Array.isArray(value.rooms) &&
    value.rooms.every((item) => typeof item === 'string') &&
    (value.extra === undefined || typeof value.extra === 'string') &&
    isEntryType(value.type)
  );
}

function parseCache(raw: unknown): { updatedAt: Date; weeks: Record<string, ScheduleEntry[]> } | null {
  // Missing version is the legacy settings.v1/cache.v1 format. Future versions
  // must be migrated explicitly instead of being treated as compatible.
  if (!isRecord(raw) || (raw.version !== undefined && raw.version !== STORAGE_VERSION)) return null;
  if (typeof raw.updatedAt !== 'string' || !Number.isFinite(Date.parse(raw.updatedAt)) || !isRecord(raw.weeks)) {
    return null;
  }

  const weeks: Record<string, ScheduleEntry[]> = {};
  for (const [key, entries] of Object.entries(raw.weeks)) {
    if (!Array.isArray(entries)) continue;
    weeks[key] = entries.filter(isSerializedEntry).map(deserializeEntry);
  }
  return { updatedAt: new Date(raw.updatedAt), weeks };
}

export async function loadCache(): Promise<{
  updatedAt: Date;
  weeks: Record<string, ScheduleEntry[]>;
} | null> {
  try {
    const current = await Preferences.get({ key: CACHE_KEY });
    const legacy = current.value ? null : await Preferences.get({ key: LEGACY_CACHE_KEY });
    const value = current.value ?? legacy?.value;
    if (!value) return null;
    return parseCache(JSON.parse(value) as unknown);
  } catch {
    return null; // Defekter Cache wird ignoriert, nicht eskaliert.
  }
}

export async function saveCache(
  weeks: Record<string, ScheduleEntry[]>,
  updatedAt: Date,
): Promise<void> {
  const raw: ScheduleCache = { version: STORAGE_VERSION, updatedAt: updatedAt.toISOString(), weeks: {} };
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
