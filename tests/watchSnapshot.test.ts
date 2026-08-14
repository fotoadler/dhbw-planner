import { describe, expect, it } from 'vitest';
import { createWatchScheduleSnapshot } from '../src/watch/model';
import type { ScheduleEntry } from '../src/types';

function entry(title: string, start: string, end: string, extra: Partial<ScheduleEntry> = {}): ScheduleEntry {
  return {
    title,
    start: new Date(start),
    end: new Date(end),
    rooms: [],
    lecturers: [],
    type: 'lecture',
    ...extra,
  };
}

describe('createWatchScheduleSnapshot', () => {
  it('projects the current, next and today entries', () => {
    const now = new Date('2026-07-06T08:45:00.000Z');
    const snapshot = createWatchScheduleSnapshot([
      entry('Onlinemarketing', '2026-07-06T08:30:00.000Z', '2026-07-06T10:00:00.000Z', {
        rooms: ['WS17-0.13'],
        lecturers: ['Max Mustermann'],
      }),
      entry('Mediaplanung', '2026-07-06T10:15:00.000Z', '2026-07-06T11:45:00.000Z'),
      entry('Morgenkurs', '2026-07-07T08:30:00.000Z', '2026-07-07T10:00:00.000Z'),
    ], now);

    expect(snapshot.timezone).toBe('Europe/Berlin');
    expect(snapshot.currentEntry?.title).toBe('Onlinemarketing');
    expect(snapshot.currentEntry?.room).toBe('WS17-0.13');
    expect(snapshot.currentEntry?.lecturer).toBe('Max Mustermann');
    expect(snapshot.nextEntry?.title).toBe('Mediaplanung');
    expect(snapshot.todayEntries.map((item) => item.title)).toEqual(['Onlinemarketing', 'Mediaplanung']);
    expect(snapshot.upcomingEntries.map((item) => item.title)).toEqual(['Mediaplanung', 'Morgenkurs']);
  });

  it('keeps the next event available when there is no current event', () => {
    const snapshot = createWatchScheduleSnapshot([
      entry('Nächster Termin', '2026-07-06T11:00:00.000Z', '2026-07-06T12:30:00.000Z'),
    ], new Date('2026-07-06T10:00:00.000Z'));

    expect(snapshot.currentEntry).toBeNull();
    expect(snapshot.nextEntry?.title).toBe('Nächster Termin');
  });

  it('does not expose entries older than the fourteen-day watch window', () => {
    const snapshot = createWatchScheduleSnapshot([
      entry('Heute', '2026-07-06T11:00:00.000Z', '2026-07-06T12:30:00.000Z'),
      entry('Zu weit entfernt', '2026-07-21T11:00:00.000Z', '2026-07-21T12:30:00.000Z'),
    ], new Date('2026-07-06T10:00:00.000Z'));

    expect(snapshot.upcomingEntries.map((item) => item.title)).toEqual(['Heute']);
  });

  it('picks a directly following lecture as the next entry', () => {
    const snapshot = createWatchScheduleSnapshot([
      entry('Laufend', '2026-07-06T08:00:00.000Z', '2026-07-06T09:30:00.000Z'),
      entry('Direkt danach', '2026-07-06T09:30:00.000Z', '2026-07-06T11:00:00.000Z'),
      entry('Später', '2026-07-06T11:15:00.000Z', '2026-07-06T12:00:00.000Z'),
    ], new Date('2026-07-06T08:45:00.000Z'));

    expect(snapshot.currentEntry?.title).toBe('Laufend');
    expect(snapshot.nextEntry?.title).toBe('Direkt danach');
  });

  it('treats an entry starting exactly now as the current one', () => {
    const snapshot = createWatchScheduleSnapshot([
      entry('Beginnt jetzt', '2026-07-06T10:00:00.000Z', '2026-07-06T11:30:00.000Z'),
      entry('Danach', '2026-07-06T11:30:00.000Z', '2026-07-06T13:00:00.000Z'),
    ], new Date('2026-07-06T10:00:00.000Z'));

    expect(snapshot.currentEntry?.title).toBe('Beginnt jetzt');
    expect(snapshot.nextEntry?.title).toBe('Danach');
  });
});
