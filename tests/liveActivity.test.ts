import { describe, expect, it } from 'vitest';
import { currentAndNext } from '../src/liveActivity/scheduler';
import { ScheduleEntry } from '../src/types';

function entry(title: string, start: string, end: string): ScheduleEntry {
  return {
    title,
    start: new Date(start),
    end: new Date(end),
    rooms: [],
    lecturers: [],
    type: 'lecture',
  };
}

describe('currentAndNext', () => {
  const lecture = entry('Arbeitsrecht', '2026-07-14T10:15:00.000Z', '2026-07-14T11:45:00.000Z');
  const next = entry('Personalwirtschaft', '2026-07-14T12:15:00.000Z', '2026-07-14T13:45:00.000Z');

  it('does not treat a course as live before its actual start', () => {
    expect(currentAndNext([lecture, next], new Date('2026-07-14T10:14:59.999Z'))).toEqual([null, undefined]);
  });

  it('removes the current course exactly at its end', () => {
    expect(currentAndNext([lecture, next], new Date('2026-07-14T11:45:00.000Z'))).toEqual([null, undefined]);
  });

  it('includes the next course while a course is running', () => {
    expect(currentAndNext([next, lecture], new Date('2026-07-14T11:00:00.000Z'))).toEqual([lecture, next]);
  });
});
