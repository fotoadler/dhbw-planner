import { isExamTitle, isOnlineTitle } from './schedule/entryType';

/** Veranstaltungstyp — sinngemäß aus der alten App übernommen. */
export type EntryType = 'lecture' | 'exam' | 'online' | 'holiday' | 'unknown';

/** Ein geparster Rapla-Termin. `start`/`end` sind UTC-Instants (Wandzeit Europe/Berlin). */
export interface ScheduleEntry {
  start: Date;
  end: Date;
  /** Titel ohne den Zusatz in spitzen Klammern. */
  title: string;
  /** Optionaler Zusatz aus dem Anker, z. B. "Online über BBB (Prof. Dr. Hopf)". */
  extra?: string;
  /** 0..n Dozenten aus den <span class="person">-Elementen. */
  lecturers: string[];
  /** Kurscode (z. B. "DH-WINF24A"), falls vorhanden. */
  course?: string;
  /** 0..n Räume aus den <span class="resource">-Elementen. */
  rooms: string[];
  type: EntryType;
}

/** JSON-serialisierbare Form für den Preferences-Cache. */
export interface SerializedEntry {
  start: string;
  end: string;
  title: string;
  extra?: string;
  lecturers: string[];
  course?: string;
  rooms: string[];
  type: EntryType;
}

export function serializeEntry(e: ScheduleEntry): SerializedEntry {
  return { ...e, start: e.start.toISOString(), end: e.end.toISOString() };
}

export function deserializeEntry(e: SerializedEntry): ScheduleEntry {
  // Bereits gecachte Termine wurden ggf. mit einer älteren Erkennung
  // eingestuft; die aktuelle Regel wird deshalb beim Laden erneut angewandt.
  let type = e.type;
  if (type === 'lecture' || type === 'unknown' || type === 'exam') {
    if (isExamTitle(e.title)) {
      type = 'exam';
    } else if (isOnlineTitle(`${e.title} ${e.extra ?? ''}`)) {
      type = 'online';
    } else if (type === 'exam') {
      type = 'lecture';
    }
  }
  return { ...e, start: new Date(e.start), end: new Date(e.end), type };
}
