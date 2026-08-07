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

  it('uses the selected site domain for Stuttgart', () => {
    expect(normalizeDualisUsername('wiw084711', 'STG')).toBe('wiw084711@lehre.dhbw-stuttgart.de');
  });

  it('uses the selected site domain for Mosbach', () => {
    expect(normalizeDualisUsername('h.mueller', 'MOS')).toBe('h.mueller@lehre.mosbach.dhbw.de');
  });

  it('does not guess a domain for a site with multiple account domains', () => {
    expect(normalizeDualisUsername('student123', 'FN')).toBe('student123');
    expect(normalizeDualisUsername('student123@it.dhbw-ravensburg.de', 'FN')).toBe(
      'student123@it.dhbw-ravensburg.de',
    );
  });

  it('keeps a full address unchanged for an unknown site', () => {
    expect(normalizeDualisUsername('user@example.invalid', 'UNKNOWN')).toBe('user@example.invalid');
  });

  it('normalizes CampusNet cookies with whitespace around the equals sign', () => {
    expect(parseSetCookieHeader('cnsc =ABC123; HttpOnly; secure')).toEqual([['cnsc', 'ABC123']]);
  });
});
