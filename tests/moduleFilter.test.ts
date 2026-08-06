import { describe, expect, it } from 'vitest';
import { ScheduleEntry } from '../src/types';
import { filterScheduleEntries, listScheduleModules } from '../src/schedule/modules';

function entry(title: string, type: ScheduleEntry['type'] = 'lecture'): ScheduleEntry {
  return {
    start: new Date('2026-08-06T07:00:00Z'),
    end: new Date('2026-08-06T08:00:00Z'),
    title,
    lecturers: [],
    course: 'DH-WINF24A',
    rooms: [],
    type,
  };
}

describe('schedule module filter', () => {
  it('lists unique modules in a stable German sort order', () => {
    expect(listScheduleModules([
      entry('Zahlungsverkehr'),
      entry('  Medienmarketing  '),
      entry('Medienmarketing'),
      entry('Feiertag', 'holiday'),
    ])).toEqual([
      { key: 'Medienmarketing', label: 'Medienmarketing' },
      { key: 'Zahlungsverkehr', label: 'Zahlungsverkehr' },
    ]);
  });

  it('hides selected modules but keeps holidays visible', () => {
    const entries = [entry('Medienmarketing'), entry('Zahlungsverkehr'), entry('Feiertag', 'holiday'), {
      ...entry('Tanzkurs'),
      course: undefined,
    }];
    expect(filterScheduleEntries(entries, [' Medienmarketing '])).toEqual([
      entries[1],
      entries[2],
      entries[3],
    ]);
  });

  it('returns the original array when no module is hidden', () => {
    const entries = [entry('Medienmarketing')];
    expect(filterScheduleEntries(entries, [])).toBe(entries);
  });
});
