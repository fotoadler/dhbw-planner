import { describe, expect, it } from 'vitest';
import { parseRaplaWeek, readYearOrThrow } from '../src/rapla/parser';
import { EMPTY_WEEK_FIXTURE, NO_YEAR_FIXTURE, WEEK_FIXTURE } from './fixtures';

describe('parseRaplaWeek (Rapla 2.0 DOM)', () => {
  const entries = parseRaplaWeek(WEEK_FIXTURE);

  it('findet alle Termine der Woche', () => {
    expect(entries).toHaveLength(6);
    expect(entries.map((e) => e.title)).toEqual([
      'Onlinemarketing', // Mo 08:30
      'Geld und Währung', // Di 09:00
      'Mediaplanung', // Di 14:00
      'Klausur- Portfoliovorbereitung', // Mi 10:00
      'Deadline Wahl Studienrichtungswahlfach II', // Do 00:00
      'Selbststudium', // Fr 08:30
    ]);
  });

  it('übernimmt Blöcke ohne Endzeit (Deadline) als Punkt-Termin', () => {
    const e = entries.find((x) => x.title.startsWith('Deadline'))!;
    expect(e.start.toISOString()).toBe('2026-07-08T22:00:00.000Z'); // Do 09.07. 00:00 Berlin
    expect(e.end.getTime()).toBe(e.start.getTime());
    expect(e.lecturers).toEqual([]);
  });

  it('parst Einzel-Person, Kurscode und Raum aus den spans', () => {
    const e = entries.find((x) => x.title === 'Onlinemarketing')!;
    expect(e.lecturers).toEqual(['Maximilian Zorg']);
    expect(e.course).toBe('DH-WINF24A');
    expect(e.rooms).toEqual(['WS17-0.13 Hörsaal']);
  });

  it('trennt den Zusatz in spitzen Klammern vom Titel', () => {
    const e = entries.find((x) => x.title === 'Onlinemarketing')!;
    expect(e.extra).toBe('Maximilian Zorg');
  });

  it('berechnet Start/Ende als Europe/Berlin-Wandzeit (Juli = CEST, UTC+2)', () => {
    const e = entries.find((x) => x.title === 'Onlinemarketing')!;
    expect(e.start.toISOString()).toBe('2026-07-06T06:30:00.000Z'); // 08:30 Berlin
    expect(e.end.toISOString()).toBe('2026-07-06T10:30:00.000Z'); // 12:30 Berlin
  });

  it('fasst mehrere Personen zu einer Liste zusammen', () => {
    const e = entries.find((x) => x.title === 'Geld und Währung')!;
    expect(e.lecturers).toEqual(['Gregor Hopf', 'Simone Besemer']);
  });

  it('ordnet Blöcke über das Tabellen-Grid dem richtigen Wochentag zu', () => {
    const geld = entries.find((x) => x.title === 'Geld und Währung')!;
    const media = entries.find((x) => x.title === 'Mediaplanung')!;
    const klausur = entries.find((x) => x.title === 'Klausur- Portfoliovorbereitung')!;
    const selbst = entries.find((x) => x.title === 'Selbststudium')!;
    expect(geld.start.toISOString()).toContain('2026-07-07'); // Dienstag
    expect(media.start.toISOString()).toContain('2026-07-07'); // Dienstag (2. Zeile, rowspan-versetzt)
    expect(klausur.start.toISOString()).toContain('2026-07-08'); // Mittwoch
    expect(selbst.start.toISOString()).toContain('2026-07-10'); // Freitag
  });

  it('toleriert Termine ohne Person und ohne Raum', () => {
    const e = entries.find((x) => x.title === 'Klausur- Portfoliovorbereitung')!;
    expect(e.lecturers).toEqual([]);
    expect(e.rooms).toEqual([]);
    expect(e.course).toBe('DH-WINF24A');
  });

  it('erkennt Prüfungen am Titel', () => {
    const e = entries.find((x) => x.title === 'Klausur- Portfoliovorbereitung')!;
    expect(e.type).toBe('exam');
  });

  it('stuft "Onlinemarketing" nicht als Online-Format ein (Wortgrenze)', () => {
    const e = entries.find((x) => x.title === 'Onlinemarketing')!;
    expect(e.type).toBe('unknown');
  });

  it('trennt mehrere Räume vom Kurscode', () => {
    const e = entries.find((x) => x.title === 'Mediaplanung')!;
    expect(e.course).toBe('DH-WINF24A');
    expect(e.rooms).toEqual(['WS17-0.13 Hörsaal', 'WS17-0.15 Seminarraum']);
  });

  it('fällt ohne person-/resource-spans auf Zeit/Titel aus dem <a> zurück', () => {
    const e = entries.find((x) => x.title === 'Selbststudium')!;
    expect(e.lecturers).toEqual([]);
    expect(e.rooms).toEqual([]);
    expect(e.course).toBeUndefined();
    expect(e.start.toISOString()).toBe('2026-07-10T06:30:00.000Z');
  });

  it('liefert für eine leere Woche eine leere Liste (kein Crash)', () => {
    expect(parseRaplaWeek(EMPTY_WEEK_FIXTURE)).toEqual([]);
  });

  it('wirft, wenn der Jahres-Selektor fehlt (readYearOrThrow)', () => {
    expect(() => parseRaplaWeek(NO_YEAR_FIXTURE)).toThrow(/year/);
  });

  it('liest das selektierte Jahr aus dem Selektor', () => {
    const doc = new DOMParser().parseFromString(WEEK_FIXTURE, 'text/html');
    expect(readYearOrThrow(doc)).toBe(2026);
  });
});
