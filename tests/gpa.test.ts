import { describe, expect, it } from 'vitest';
import { formatGpa } from '../src/ui/DualisView';

describe('GPA-Kennzahlen', () => {
  it.each([[2, '2,0'], [2.1, '2,1'], [2.34, '2,34'], [2.345, '2,35'], [0, '0,0']])('formatiert %s als %s', (value, expected) => {
    expect(formatGpa(value as number)).toBe(expected);
  });
  it.each([null, undefined, NaN, Infinity])('zeigt für fehlende/ungültige Werte einen Strich', (value) => {
    expect(formatGpa(value)).toBe('–');
  });
});
