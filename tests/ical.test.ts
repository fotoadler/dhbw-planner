import { describe, expect, it } from 'vitest';
import { generateIcs } from '../src/ical/export';
import { ScheduleEntry } from '../src/types';
import { berlinToUtc } from '../src/lib/berlinTime';

const ENTRY: ScheduleEntry = {
  start: berlinToUtc(2026, 7, 6, 8, 30),
  end: berlinToUtc(2026, 7, 6, 12, 30),
  title: 'Onlinemarketing',
  lecturers: ['Maximilian Zorg', 'Simone Besemer'],
  course: 'DH-WINF24A',
  rooms: ['WS17-0.13 Hörsaal'],
  type: 'unknown',
};

const NOW = new Date('2026-07-06T10:00:00Z');

describe('generateIcs', () => {
  const ics = generateIcs([ENTRY], NOW);

  it('erzeugt ein valides VCALENDAR mit VTIMEZONE Europe/Berlin', () => {
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('TZID:Europe/Berlin');
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
  });

  it('setzt SUMMARY = Titel (Dozent, Dozent) und LOCATION = Raum', () => {
    expect(ics).toContain('SUMMARY:Onlinemarketing (Maximilian Zorg\\, Simone Besemer)');
    expect(ics).toContain('LOCATION:WS17-0.13 Hörsaal');
  });

  it('schreibt DTSTART/DTEND als Berlin-Wandzeit mit TZID', () => {
    expect(ics).toContain('DTSTART;TZID=Europe/Berlin:20260706T083000');
    expect(ics).toContain('DTEND;TZID=Europe/Berlin:20260706T123000');
  });

  it('nennt Dozenten und Kurscode in der DESCRIPTION', () => {
    expect(ics).toContain('Dozent: Maximilian Zorg\\, Simone Besemer');
    expect(ics).toContain('Kurs: DH-WINF24A');
  });

  it('vergibt stabile UIDs über mehrere Exporte hinweg', () => {
    const uid = (s: string) => s.split('\r\n').find((l) => l.startsWith('UID:'));
    expect(uid(generateIcs([ENTRY], new Date()))).toBe(uid(ics));
  });

  it('übersteht Termine ohne Dozent und ohne Raum', () => {
    const minimal: ScheduleEntry = { ...ENTRY, lecturers: [], rooms: [], course: undefined };
    const out = generateIcs([minimal], NOW);
    expect(out).toContain('SUMMARY:Onlinemarketing');
    expect(out).not.toContain('LOCATION:');
    expect(out).not.toContain('DESCRIPTION:');
  });
});
