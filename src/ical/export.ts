/**
 * iCal-/ICS-Export.
 *
 * Erzeugt ein valides VCALENDAR mit VTIMEZONE Europe/Berlin und pro Termin
 * einem VEVENT:
 *   SUMMARY     = Titel (Dozent[, Dozent])
 *   DESCRIPTION = Dozenten + Kurscode
 *   LOCATION    = Raum/Räume
 *   DTSTART/END = TZID=Europe/Berlin (Wandzeit)
 *   UID         = stabil pro Termin (Startzeit + Titel-Hash)
 *
 * Geteilt/gespeichert wird über die native Share-Funktion (eine einfache
 * Aktion, kein eigenes Untermenü); im Browser als Datei-Download.
 */

import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { ScheduleEntry } from '../types';
import { berlinParts } from '../lib/berlinTime';

/** Berlin-Wandzeit als iCal-Stempel "YYYYMMDDTHHMMSS" (für TZID-Zeiten). */
function icalStamp(date: Date): string {
  const p = berlinParts(date);
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${p.y}${p2(p.m)}${p2(p.d)}T${p2(p.hh)}${p2(p.mm)}${p2(p.ss)}`;
}

/** UTC-Stempel für DTSTAMP. */
function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Text-Escaping nach RFC 5545 (Backslash, Semikolon, Komma, Zeilenumbruch). */
function escapeText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Zeilen länger als 74 Zeichen falten (CRLF + Leerzeichen, RFC 5545 §3.1). */
function foldLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    parts.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  parts.push(rest);
  return parts.join('\r\n');
}

/** Kleiner, stabiler String-Hash (djb2) für UIDs. */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Berlin',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

export function generateIcs(entries: ScheduleEntry[], now: Date = new Date()): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DHBW Plan//Rapla 2.0 Export//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...VTIMEZONE,
  ];

  const dtstamp = utcStamp(now);
  for (const e of entries) {
    const start = icalStamp(e.start);
    const summary = e.lecturers.length ? `${e.title} (${e.lecturers.join(', ')})` : e.title;
    const description = [
      e.lecturers.length ? `Dozent: ${e.lecturers.join(', ')}` : undefined,
      e.course ? `Kurs: ${e.course}` : undefined,
    ]
      .filter(Boolean)
      .join('\n');

    lines.push(
      'BEGIN:VEVENT',
      // Stabile UID: gleiche Startzeit + gleicher Titel ⇒ gleiche UID bei jedem Export.
      `UID:${start}-${hash(e.title + (e.course ?? ''))}@dhbw-rapla-app`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Europe/Berlin:${start}`,
      `DTEND;TZID=Europe/Berlin:${icalStamp(e.end)}`,
      `SUMMARY:${escapeText(summary)}`,
    );
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (e.rooms.length) lines.push(`LOCATION:${escapeText(e.rooms.join(', '))}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

/** Exportiert die Termine als .ics — nativ per Share-Sheet, im Web als Download. */
export async function shareIcs(entries: ScheduleEntry[], filename = 'dhbw-stundenplan.ics'): Promise<void> {
  const ics = generateIcs(entries);

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({
      path: filename,
      data: ics,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
    await Share.share({ title: 'DHBW Stundenplan', url: uri });
    return;
  }

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
