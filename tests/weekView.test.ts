import { describe, expect, it } from 'vitest';
import { weekTitleLineCapacity } from '../src/ui/WeekView';

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
});
