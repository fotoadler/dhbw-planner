import { describe, expect, it } from 'vitest';
import { buildWeekUrl, parseRaplaLink } from '../src/rapla/client';

describe('rapla client URLs', () => {
  it('normalisiert alte internal_calendar-Links auf den aktuellen calendar-Endpunkt', () => {
    const cfg = parseRaplaLink(
      'https://rapla.dhbw.de/rapla/internal_calendar?user=test&file=DH-WINF24A+4.+Semester',
    );

    expect(cfg).toEqual({
      user: 'test',
      file: 'DH-WINF24A 4. Semester',
      baseUrl: 'https://rapla.dhbw.de/rapla/calendar',
    });
  });

  it('baut auch mit gespeicherten alten Settings calendar-URLs', () => {
    const url = buildWeekUrl(
      {
        user: 'test',
        file: 'DH-WINF24A 4. Semester',
        baseUrl: 'https://rapla.dhbw.de/rapla/internal_calendar',
      },
      { y: 2026, m: 7, d: 6 },
    );

    expect(url).toBe(
      'https://rapla.dhbw.de/rapla/calendar?user=test&file=DH-WINF24A+4.+Semester&day=6&month=7&year=2026',
    );
  });
});
