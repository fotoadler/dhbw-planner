import { describe, expect, it } from 'vitest';
import { currentTimeLineTop, weekTitleLineCapacity } from '../src/ui/WeekView';
import { effectiveEndMs, isDeadlineOrAllDay } from '../src/lib/berlinTime';

describe('weekTitleLineCapacity', () => {
  it('uses every complete title line that fits into a regular event card', () => {
    expect(weekTitleLineCapacity(94, 14, 11, 3, 15)).toBe(4);
  });

  it('reserves the actually occupied lecturer height', () => {
    expect(weekTitleLineCapacity(174, 14 + 39, 11, 6, 15)).toBe(6);
    expect(weekTitleLineCapacity(174, 14 + 13, 11, 6, 15)).toBe(8);
  });

  it('keeps at least one title line in very short cards', () => {
    expect(weekTitleLineCapacity(26, 14, 6, 0, 15)).toBe(1);
  });

  it('detects 00:00 deadlines and caps effective duration to prevent full-day blocking', () => {
    const deadline = {
      start: new Date('2026-08-31T00:00:00+02:00'),
      end: new Date('2026-08-31T23:59:59+02:00'),
      title: 'Deadline Online-Marketing',
    };
    expect(isDeadlineOrAllDay(deadline)).toBe(true);
    expect(effectiveEndMs(deadline)).toBe(new Date('2026-08-31T00:15:00+02:00').getTime());

    const regularLecture = {
      start: new Date('2026-08-31T09:00:00+02:00'),
      end: new Date('2026-08-31T12:15:00+02:00'),
      title: 'Online Marketing',
    };
    expect(isDeadlineOrAllDay(regularLecture)).toBe(false);
    expect(effectiveEndMs(regularLecture)).toBe(regularLecture.end.getTime());
  });
});


describe('currentTimeLineTop', () => {
  it('shows no line when the displayed week does not contain the current Berlin day', () => {
    expect(currentTimeLineTop(new Date('2026-10-11T10:30:00Z'), ['2026-10-05', '2026-10-06'], 8, 64)).toBeNull();
  });

  it('uses Berlin wall time and scales the position with each grid zoom level', () => {
    // 08:30 UTC is 10:30 CEST on 11 October 2026.
    const now = new Date('2026-10-11T08:30:00Z');
    const week = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];
    expect(currentTimeLineTop(now, week, 8, 40)).toBe(100);
    expect(currentTimeLineTop(now, week, 8, 64)).toBe(160);
    expect(currentTimeLineTop(now, week, 8, 120)).toBe(300);
  });

  it('follows the spring DST jump in Europe/Berlin', () => {
    // 01:30 UTC becomes 03:30 CEST on the spring transition day.
    expect(currentTimeLineTop(new Date('2026-03-29T01:30:00Z'), ['2026-03-29'], 0, 60)).toBe(210);
  });

  it('places both occurrences of the repeated autumn DST hour at the same wall-clock position', () => {
    const week = ['2026-10-25'];
    const before = currentTimeLineTop(new Date('2026-10-25T00:30:00Z'), week, 0, 60);
    const after = currentTimeLineTop(new Date('2026-10-25T01:30:00Z'), week, 0, 60);
    expect(before).toBe(150);
    expect(after).toBe(150);
  });
});
