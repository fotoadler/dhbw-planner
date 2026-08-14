/**
 * Öffentlicher DHBW-API-Client.
 *
 * Der Client kennt bewusst nur den Kurskatalog und den Kursplan. Die
 * Delta-/Sync-Endpunkte werden hier nicht verwendet: Für RV/FN ist deren
 * Zuordnung derzeit laut API-Betreiber fehlerhaft. Ein ETag sorgt dafür, dass
 * ein bereits geladener Kursplan bei der nächsten Aktualisierung nur geprüft
 * und nicht erneut übertragen wird.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { mondayOf, ymdKey } from '../lib/berlinTime';
import { ScheduleEntry } from '../types';

export const DHBW_API_BASE_URL = 'https://api.dhbw.app';

export interface DhbwSite {
  id: number;
  site: string;
  lectures: string;
  mensa: string;
  parking: string;
}

export interface DhbwDegree {
  id: number;
  abbreviation: string;
  name: string;
  faculty: string;
  sites: string[];
  global: boolean;
}

export interface DhbwCourse {
  id: number;
  name: string;
  site: string;
  faculty: string;
  year: number | null;
  courseIdentifier: string | null;
  specialization: string | null;
  public: boolean;
  hidden: boolean;
  degree: DhbwDegree | null;
}

export interface DhbwScheduleItem {
  entityType?: string;
  startTime?: string;
  endTime?: string;
  name?: string;
  type?: string;
  lecturer?: string;
  rooms?: string[];
  course?: string;
}

export interface CourseScheduleResult {
  entries: ScheduleEntry[];
  etag?: string;
  notModified: boolean;
}

interface ApiResponse<T> {
  data: T | null;
  status: number;
  etag?: string;
}

function apiUrl(path: string): string {
  // Vite proxies this path during local web development. Native builds and
  // the hosted app call the public API directly.
  if (!Capacitor.isNativePlatform() && import.meta.env.DEV) return `/dhbw-api${path}`;
  return `${DHBW_API_BASE_URL}${path}`;
}

function responseHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== 'object') return undefined;
  const record = headers as Record<string, unknown>;
  const key = Object.keys(record).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key && typeof record[key] === 'string' ? record[key] : undefined;
}

async function getJson<T>(path: string, etag?: string): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (etag) headers['If-None-Match'] = etag;
  const url = apiUrl(path);

  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url, headers, responseType: 'json' });
    if (response.status >= 400 && response.status !== 304) {
      throw new Error(`DHBW-API antwortete mit HTTP ${response.status}`);
    }
    return {
      data: response.status === 304 ? null : (response.data as T),
      status: response.status,
      etag: responseHeader(response.headers, 'etag'),
    };
  }

  const response = await fetch(url, { headers });
  if (!response.ok && response.status !== 304) {
    throw new Error(`DHBW-API antwortete mit HTTP ${response.status}`);
  }
  return {
    data: response.status === 304 ? null : ((await response.json()) as T),
    status: response.status,
    etag: response.headers.get('etag') ?? undefined,
  };
}

export async function getSites(): Promise<DhbwSite[]> {
  const response = await getJson<unknown>('/sites');
  if (!Array.isArray(response.data)) throw new Error('DHBW-API: Standortliste ist ungültig.');
  return response.data.filter(isSite);
}

export async function getCourses(site: string): Promise<DhbwCourse[]> {
  const response = await getJson<unknown>(`/courses/${encodeURIComponent(site)}/parsed`);
  if (!Array.isArray(response.data)) throw new Error('DHBW-API: Kursliste ist ungültig.');
  return response.data.filter(isCourse).filter((course) => course.public && !course.hidden);
}

export async function getCourseSchedule(course: string, etag?: string): Promise<CourseScheduleResult> {
  const response = await getJson<unknown>(
    // archived=true includes past course dates as well as the current plan.
    // The app can therefore navigate to historical weeks without another
    // date-specific API request.
    `/rapla/lectures/${encodeURIComponent(course)}/events?archived=true`,
    etag,
  );
  if (response.status === 304) {
    return { entries: [], etag: response.etag ?? etag, notModified: true };
  }
  if (!Array.isArray(response.data)) throw new Error('DHBW-API: Kursplan ist ungültig.');
  return {
    entries: response.data.filter(isScheduleItem).map(mapScheduleItem).filter((entry): entry is ScheduleEntry => entry !== null),
    etag: response.etag,
    notModified: false,
  };
}

/** Gruppiert API-Termine in das gemeinsame Wochenformat der App. */
export function groupEntriesByWeek(entries: ScheduleEntry[]): Record<string, ScheduleEntry[]> {
  const weeks: Record<string, ScheduleEntry[]> = {};
  for (const entry of entries) {
    const key = ymdKey(mondayOf(entry.start));
    (weeks[key] ??= []).push(entry);
  }
  for (const entriesForWeek of Object.values(weeks)) {
    entriesForWeek.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
  return weeks;
}

function isSite(value: unknown): value is DhbwSite {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    typeof item.site === 'string' &&
    typeof item.lectures === 'string' &&
    typeof item.mensa === 'string' &&
    typeof item.parking === 'string'
  );
}

function isCourse(value: unknown): value is DhbwCourse {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'number' && typeof item.name === 'string' && typeof item.site === 'string';
}

function isScheduleItem(value: unknown): value is DhbwScheduleItem {
  return Boolean(value && typeof value === 'object');
}

export function mapScheduleItem(item: DhbwScheduleItem): ScheduleEntry | null {
  if (typeof item.startTime !== 'string' || typeof item.endTime !== 'string') return null;
  const start = new Date(item.startTime);
  const end = new Date(item.endTime);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) return null;

  const kind = (item.type ?? '').toUpperCase();
  const type: ScheduleEntry['type'] =
    kind.includes('EXAM') ? 'exam' : kind.includes('ONLINE') ? 'online' : kind.includes('HOLIDAY') ? 'holiday' : item.entityType === 'EVENT' ? 'unknown' : 'lecture';

  const rawTitle = (item.name ?? 'Termin').trim() || 'Termin';
  const embeddedLecturer = rawTitle.match(/^(.*?)(?:\s*<([^<>]+)>)\s*$/);
  const title = embeddedLecturer?.[1].trim() || rawTitle;
  const embeddedValue = embeddedLecturer?.[2].trim();
  const embeddedRoom = embeddedValue && /^raum\b/i.test(embeddedValue) ? embeddedValue : undefined;
  const lecturer = embeddedRoom ? undefined : embeddedValue;
  const directLecturer = typeof item.lecturer === 'string' ? item.lecturer.trim() : '';

  return {
    start,
    end,
    title,
    lecturers: [directLecturer || lecturer].filter((value): value is string => Boolean(value)),
    course: typeof item.course === 'string' && item.course.trim() ? item.course.trim() : undefined,
    rooms: [
      ...(Array.isArray(item.rooms) ? item.rooms.filter((room): room is string => typeof room === 'string' && Boolean(room.trim())).map((room) => room.trim()) : []),
      ...(embeddedRoom ? [embeddedRoom] : []),
    ],
    type,
  };
}
