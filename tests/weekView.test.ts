import { describe, expect, it } from 'vitest';
import { weekTitleLineCapacity } from '../src/ui/WeekView';
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
