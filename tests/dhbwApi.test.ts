import { describe, expect, it } from 'vitest';
import { groupEntriesByWeek, mapScheduleItem } from '../src/dhbwApi/client';

describe('DHBW API client', () => {
  it('maps API events into the existing schedule model', () => {
    const entry = mapScheduleItem({
      entityType: 'LECTURE',
      startTime: '2026-08-06T07:00:00.000Z',
      endTime: '2026-08-06T14:30:00.000Z',
      name: ' Medien- und Werbeforschung  ',
      type: 'PRESENCE',
      lecturer: 'Prof. Beispiel',
      rooms: [' OA4-0.01 Seminarraum '],
      course: 'RV-WMKKM24B',
    });

    expect(entry).toMatchObject({
      title: 'Medien- und Werbeforschung',
      lecturers: ['Prof. Beispiel'],
      rooms: ['OA4-0.01 Seminarraum'],
      course: 'RV-WMKKM24B',
      type: 'lecture',
    });
    expect(entry?.start.toISOString()).toBe('2026-08-06T07:00:00.000Z');
  });

  it('maps online and event entries without changing the shared UI model', () => {
    expect(
      mapScheduleItem({
        entityType: 'LECTURE',
        startTime: '2026-08-06T07:00:00.000Z',
        endTime: '2026-08-06T08:00:00.000Z',
        name: 'Online-Termin',
        type: 'ONLINE',
      })?.type,
    ).toBe('online');
    expect(
      mapScheduleItem({
        entityType: 'EVENT',
        startTime: '2026-08-06T07:00:00.000Z',
        endTime: '2026-08-06T08:00:00.000Z',
        name: 'Infoveranstaltung',
        type: 'PRESENCE',
      })?.type,
    ).toBe('unknown');
  });

  it('moves an API lecturer suffix below the title like Rapla does', () => {
    expect(
      mapScheduleItem({
        startTime: '2026-08-06T07:00:00.000Z',
        endTime: '2026-08-06T08:00:00.000Z',
        name: 'Medienmarketing <Jonas Weiß>',
      }),
    ).toMatchObject({
      title: 'Medienmarketing',
      lecturers: ['Jonas Weiß'],
    });
  });

  it('groups entries by Berlin week for the existing calendar cache', () => {
    const first = mapScheduleItem({
      startTime: '2026-08-06T07:00:00.000Z',
      endTime: '2026-08-06T08:00:00.000Z',
      name: 'Donnerstag',
    });
    const second = mapScheduleItem({
      startTime: '2026-08-10T07:00:00.000Z',
      endTime: '2026-08-10T08:00:00.000Z',
      name: 'Montag',
    });

    const weeks = groupEntriesByWeek([first!, second!]);
    expect(Object.keys(weeks)).toEqual(['2026-08-03', '2026-08-10']);
    expect(weeks['2026-08-03'][0].title).toBe('Donnerstag');
  });

  it('drops malformed or backwards intervals', () => {
    expect(mapScheduleItem({ startTime: 'not-a-date', endTime: '2026-08-06T08:00:00Z' })).toBeNull();
    expect(
      mapScheduleItem({ startTime: '2026-08-06T08:00:00Z', endTime: '2026-08-06T07:00:00Z' }),
    ).toBeNull();
  });
});
