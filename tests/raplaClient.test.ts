import { describe, expect, it, vi } from 'vitest';
import { buildWeekUrl, fetchWeeks, parseRaplaLink } from '../src/rapla/client';
import { WEEK_FIXTURE } from './fixtures';

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

  it('unterstützt Rapla-Freigabelinks mit key und salt', () => {
    const cfg = parseRaplaLink(
      'https://rapla.dhbw.de/rapla/calendar?key=public-key&salt=public-salt',
    );

    expect(cfg).toEqual({
      key: 'public-key',
      salt: 'public-salt',
      baseUrl: 'https://rapla.dhbw.de/rapla/calendar',
    });
    expect(buildWeekUrl(cfg!, { y: 2026, m: 7, d: 6 })).toBe(
      'https://rapla.dhbw.de/rapla/calendar?day=6&month=7&year=2026&key=public-key&salt=public-salt',
    );
  });

  it('lehnt Links von fremden Hosts und Pfaden ab', () => {
    expect(parseRaplaLink('https://example.com/rapla/calendar?user=test&file=plan')).toBeNull();
    expect(parseRaplaLink('https://rapla.dhbw.de/other?user=test&file=plan')).toBeNull();
  });

  it('liefert erfolgreiche Wochen auch bei einzelnen Abruffehlern zurück', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn()
        .mockResolvedValueOnce({ ok: true, text: async () => WEEK_FIXTURE })
        .mockRejectedValueOnce(new Error('offline')),
    );

    const result = await fetchWeeks(
      { user: 'test', file: 'plan', baseUrl: 'https://rapla.dhbw.de/rapla/calendar' },
      { y: 2026, m: 7, d: 6 },
      2,
    );

    expect(result.weeks.size).toBe(1);
    expect(result.failedWeeks).toEqual(['2026-07-13']);
    vi.unstubAllGlobals();
  });
});
