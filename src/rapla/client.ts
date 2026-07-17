/**
 * Rapla-Client: URL-Bau, Wochen-Paging und HTTP-Zugriff.
 *
 * Nativ (iOS/Android) läuft der Abruf über CapacitorHttp — das umgeht CORS,
 * da Rapla keine CORS-Header sendet. Im Web-Dev-Modus wird stattdessen über
 * den Vite-Proxy (/rapla/*) gefetcht.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { ScheduleEntry } from '../types';
import { addDaysYmd, ymdKey, Ymd } from '../lib/berlinTime';
import { parseRaplaWeek } from './parser';

export const DEFAULT_BASE_URL = 'https://rapla.dhbw.de/rapla/calendar';

export interface RaplaConfig {
  user: string;
  file: string;
  baseUrl: string;
}

export function parseRaplaLink(link: string): RaplaConfig | null {
  try {
    const url = new URL(link.trim());
    const user = url.searchParams.get('user');
    const file = url.searchParams.get('file');
    if (!user || !file) return null;

    return {
      user,
      file,
      baseUrl: 'https://rapla.dhbw.de/rapla/calendar',
    };
  } catch {
    return null;
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  if (url.pathname.endsWith('/internal_calendar')) {
    url.pathname = url.pathname.replace(/\/internal_calendar$/, '/calendar');
  }
  return `${url.origin}${url.pathname}`;
}

/** Baut die URL für die Woche, die den Tag `date` enthält (Navigation via day/month/year). */
export function buildWeekUrl(cfg: RaplaConfig, date: Ymd): string {
  const params = new URLSearchParams({
    user: cfg.user,
    file: cfg.file,
    day: String(date.d),
    month: String(date.m),
    year: String(date.y),
  });
  return `${normalizeBaseUrl(cfg.baseUrl)}?${params.toString()}`;
}

async function fetchHtml(url: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url,
      headers: { Accept: 'text/html' },
      responseType: 'text',
    });
    if (res.status >= 400) throw new Error(`Rapla antwortete mit HTTP ${res.status}`);
    return typeof res.data === 'string' ? res.data : String(res.data);
  }

  // Web/Dev: relativer Pfad → Vite-Proxy übernimmt (siehe vite.config.ts).
  const u = new URL(url);
  const res = await fetch(`${u.pathname}${u.search}`, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`Rapla antwortete mit HTTP ${res.status}`);
  return res.text();
}

/** Lädt und parst eine einzelne Woche (Montag `monday`). */
export async function fetchWeek(cfg: RaplaConfig, monday: Ymd): Promise<ScheduleEntry[]> {
  const html = await fetchHtml(buildWeekUrl(cfg, monday));
  return parseRaplaWeek(html);
}

/**
 * Lädt `count` aufeinanderfolgende Wochen ab `firstMonday` (internes Paging —
 * die UI bleibt eine einfache Tages-/Wochennavigation).
 */
export async function fetchWeeks(
  cfg: RaplaConfig,
  firstMonday: Ymd,
  count: number,
): Promise<Map<string, ScheduleEntry[]>> {
  const mondays = Array.from({ length: count }, (_, i) => addDaysYmd(firstMonday, i * 7));
  const results = await Promise.all(mondays.map((m) => fetchWeek(cfg, m)));
  const byWeek = new Map<string, ScheduleEntry[]>();
  mondays.forEach((m, i) => {
    byWeek.set(ymdKey(m), results[i]);
  });
  return byWeek;
}
