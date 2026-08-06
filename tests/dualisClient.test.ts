import { describe, expect, it } from 'vitest';
import { normalizeDualisUsername, parseSetCookieHeader } from '../src/dualis/client';

describe('Dualis username input', () => {
  it('accepts the short Ravensburg account name', () => {
    expect(normalizeDualisUsername('ab1234')).toBe('ab1234@stud.dhbw-ravensburg.de');
  });

  it('keeps a complete university address unchanged', () => {
    expect(normalizeDualisUsername('ab1234@stud.dhbw-ravensburg.de')).toBe(
      'ab1234@stud.dhbw-ravensburg.de',
    );
  });

  it('normalizes CampusNet cookies with whitespace around the equals sign', () => {
    expect(parseSetCookieHeader('cnsc =ABC123; HttpOnly; secure')).toEqual([['cnsc', 'ABC123']]);
  });
});
