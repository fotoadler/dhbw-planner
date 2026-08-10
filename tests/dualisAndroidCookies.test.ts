/**
 * Cookie-Transport des DualisClient unter Android.
 *
 * CapacitorCookies installiert beim Start unabhängig von
 * `CapacitorCookies.enabled` einen globalen CookieHandler. Der schreibt jedes
 * Set-Cookie in den WebView-Cookie-Jar und hängt es beim nächsten Request als
 * ZWEITEN Cookie-Header an. Beide Header werden zusammengefasst, am Server
 * kommt `cnsc=<wert>,cnsc=<wert>` an — Cookie-Werte werden aber mit `; `
 * getrennt, nicht mit `,`.
 *
 * Auf dem Gerät gegen einen Echo-Endpunkt gemessen, mit erfundenen Werten:
 *   gesendet:   cnsc=MANUELL
 *   angekommen: cnsc=MANUELL,cnsc=VOMSERVER
 *
 * Der Jar muss deshalb nach jeder Antwort geleert werden — und zwar mit der
 * Request-URL: CampusNet sendet den Cookie ohne Path-Attribut, der WebView
 * leitet den Pfad dann aus der Request-URL ab (/scripts). Ein Aufruf auf die
 * Origin fragt Pfad / ab und findet den Cookie nicht.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const clearCookies = vi.fn(async (_options: { url: string }) => {});
const httpGet = vi.fn();
const httpPost = vi.fn();
let platform = 'android';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => platform,
    isNativePlatform: () => platform !== 'web',
  },
  CapacitorCookies: { clearCookies },
  CapacitorHttp: {
    get: (...args: unknown[]) => httpGet(...args),
    post: (...args: unknown[]) => httpPost(...args),
  },
}));

const { DualisClient } = await import('../src/dualis/client');

const TOKEN = '000000000000001';
const DISPATCH = `/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=STARTPAGE_DISPATCH&ARGUMENTS=-N${TOKEN},-N000019,`;
const MAIN_PAGE = `<html><body>
  <a class="link000307" href="/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=COURSERESULTS&ARGUMENTS=-N${TOKEN},-N000307,">Noten</a>
  <a class="link000310" href="/scripts/mgrqispi.dll?APPNAME=CampusNet&PRGNAME=STUDENT_RESULT&ARGUMENTS=-N${TOKEN},-N000310,">Leistungen</a>
</body></html>`;

const credentials = { username: 'ab1234', password: 'secret' };

beforeEach(() => {
  platform = 'android';
  clearCookies.mockClear();
  httpGet.mockReset();
  httpPost.mockReset();
  httpPost.mockResolvedValue({
    status: 200,
    data: '<html></html>',
    // CampusNet setzt den Cookie ohne Path — genau das erzeugt die Pfadbindung.
    headers: { Refresh: `0; URL=${DISPATCH}`, 'Set-Cookie': 'cnsc=SESSION; HttpOnly; secure' },
  });
  httpGet.mockResolvedValue({ status: 200, data: MAIN_PAGE, headers: {} });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Alle URLs, mit denen der Jar geleert wurde. */
function clearedUrls(): string[] {
  return clearCookies.mock.calls.map(([options]) => options.url);
}

describe('Dualis-Cookie-Transport unter Android', () => {
  it('leert den nativen Cookie-Jar nach jeder Antwort', async () => {
    await new DualisClient('RV').login(credentials);

    const responses = httpPost.mock.calls.length + httpGet.mock.calls.length;
    // login() leert den Jar zusätzlich vorab — deshalb mindestens.
    expect(clearCookies.mock.calls.length).toBeGreaterThanOrEqual(responses);
  });

  it('leert für jede angefragte URL genau diese URL', async () => {
    // Der Session-Cookie hängt ohne Path-Attribut am Verzeichnis der
    // Request-URL. Nur ein Aufruf mit derselben URL liegt sicher in seinem
    // Pfad-Scope; die blanke Origin fragt Pfad / ab und erfasst ihn nicht.
    await new DualisClient('RV').login(credentials);

    const requested = [...httpPost.mock.calls, ...httpGet.mock.calls].map(
      ([options]) => (options as { url: string }).url,
    );
    expect(requested.length).toBeGreaterThan(0);
    for (const url of requested) {
      expect(clearedUrls(), `kein clearCookies für ${url}`).toContain(url);
    }
  });

  it('räumt auch beim Anmelden auf der Skriptebene auf', async () => {
    await new DualisClient('RV').login(credentials);

    expect(clearedUrls()).toContain('https://dualis.dhbw.de/scripts/mgrqispi.dll');
  });

  it('sendet den Session-Cookie genau einmal und ungeteilt', async () => {
    await new DualisClient('RV').login(credentials);

    const cookieHeaders = httpGet.mock.calls
      .map(([options]) => (options as { headers: Record<string, string> }).headers.Cookie)
      .filter(Boolean);
    expect(cookieHeaders.length).toBeGreaterThan(0);
    for (const value of cookieHeaders) {
      expect(value).toBe('cnsc=SESSION');
      expect(value).not.toContain(',');
    }
  });

  it('rührt den nativen Jar pro Antwort auf anderen Plattformen nicht an', async () => {
    // iOS zeigt die Verdopplung nicht; das Verhalten bleibt dort unverändert.
    platform = 'ios';
    clearCookies.mockClear();

    await new DualisClient('RV').login(credentials);

    expect(clearedUrls()).toEqual([
      'https://dualis.dhbw.de',
      'https://dualis.dhbw.de/scripts/mgrqispi.dll',
    ]);
  });
});
