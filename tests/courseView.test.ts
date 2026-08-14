import { describe, expect, it } from 'vitest';
import { courseDateLabel, timeLabel } from '../src/ui/CourseView';
import { ScheduleEntry } from '../src/types';

function entry(start: string, end: string): ScheduleEntry {
  return { start: new Date(start), end: new Date(end), title: 'Modul', lecturers: [], rooms: [], type: 'lecture' };
}

describe('timeLabel', () => {
  it('zeigt die Zeitspanne', () => {
    expect(timeLabel(entry('2026-09-15T08:00:00Z', '2026-09-15T10:00:00Z'))).toBe('10:00–12:00');
  });

  it('zeigt bei ganztägigen Terminen keine Zeitspanne', () => {
    expect(timeLabel(entry('2026-09-15T00:00:00+02:00', '2026-09-16T00:00:00+02:00'))).toBe('Ganztägig');
  });

  it('zeigt bei Deadlines nur den Zeitpunkt', () => {
    expect(timeLabel(entry('2026-09-15T08:00:00Z', '2026-09-15T08:00:00Z'))).toBe('10:00');
  });
});

describe('courseDateLabel', () => {
  it('ersetzt den Wochentag für heute, behält aber die Datumszeile', () => {
    // Die Datumszeile darf nicht wegfallen, sonst springen die Zeilenhöhen.
    const label = courseDateLabel(new Date('2026-09-15T08:00:00Z'), '2026-09-15', 2026);
    expect(label).toEqual({ weekday: 'Heute', day: '15.09.', isToday: true });
  });

  it('nennt Wochentag und Datum ohne Jahr im laufenden Jahr', () => {
    const label = courseDateLabel(new Date('2026-09-15T08:00:00Z'), '2026-08-14', 2026);
    expect(label).toEqual({ weekday: 'Di', day: '15.09.', isToday: false });
  });

  it('ergänzt das Jahr bei Terminen aus früheren Jahrgängen', () => {
    const label = courseDateLabel(new Date('2024-11-05T08:00:00Z'), '2026-08-14', 2026);
    expect(label).toEqual({ weekday: 'Di', day: '05.11.24', isToday: false });
  });

  it('rechnet den Tag in Berliner Zeit, nicht in UTC', () => {
    // 23:30 UTC ist in Berlin bereits der Folgetag.
    const label = courseDateLabel(new Date('2026-09-14T23:30:00Z'), '2026-09-15', 2026);
    expect(label.isToday).toBe(true);
  });
});
