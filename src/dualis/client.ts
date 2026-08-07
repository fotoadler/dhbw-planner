import { Capacitor, CapacitorCookies, CapacitorHttp } from '@capacitor/core';
import {
  DUALIS_ENDPOINT,
  extractAccessToken,
  extractRedirectUrl,
  extractRefreshUrl,
  isTimeoutOrAccessDenied,
  parseExams,
  parseMainPageUrls,
  parseModules,
  parseSemesterOptions,
  parseStudySummary,
  replaceAccessToken,
  withSemesterArgument,
} from './parser';
import {
  DualisCredentials,
  DualisDashboard,
  DualisExam,
  DualisModule,
  DualisSemester,
  DualisSessionUrls,
} from './types';
import { dualisUsernameFor, siteConfigurationFor, normalizeSiteCode } from '../dhbw/siteConfiguration';

interface HttpResponse {
  status: number;
  data: string;
  headers: Record<string, string>;
}

export class DualisError extends Error {
  constructor(
    message: string,
    readonly reason: 'network' | 'login-failed' | 'missing-url' | 'parse-failed',
  ) {
    super(message);
  }
}

export class DualisClient {
  private cookies = new Map<string, string>();
  private credentials: DualisCredentials | null = null;
  private urls: DualisSessionUrls = { semesters: {} };
  private accessToken: string | null = null;
  private site: string;

  constructor(site?: string) {
    this.site = site === undefined ? 'RV' : normalizeSiteCode(site);
  }

  setSite(site: string | undefined): void {
    this.site = site === undefined ? 'RV' : normalizeSiteCode(site);
  }

  get isLoggedIn(): boolean {
    return Boolean(this.credentials && this.urls.main && this.accessToken);
  }

  async login(credentials: DualisCredentials): Promise<void> {
    const normalizedCredentials = {
      ...credentials,
      username: normalizeDualisUsername(credentials.username, this.site),
    };
    this.credentials = normalizedCredentials;
    this.cookies.clear();
    await this.clearNativeCookies();
    this.urls = { semesters: {} };
    this.accessToken = null;

    const loginResponse = await this.request('POST', `${DUALIS_ENDPOINT}/scripts/mgrqispi.dll`, {
      usrname: normalizedCredentials.username,
      pass: normalizedCredentials.password,
      APPNAME: 'CampusNet',
      PRGNAME: 'LOGINCHECK',
      ARGUMENTS: 'clino,usrname,pass,menuno,menu_type,browser,platform',
      clino: '000000000000001',
      // This is the menu number submitted by the current Dualis login form.
      // 000324 is the public Home menu and can lead to a successful-looking
      // redirect without an authenticated student menu.
      menuno: '000000',
      menu_type: 'classic',
      browser: '',
      platform: '',
    });

    if (loginResponse.status !== 200) {
      throw new DualisError('Dualis hat den Login abgelehnt.', 'login-failed');
    }

    // CampusNet has returned both a Refresh header and an HTML/JavaScript
    // redirect over time. Supporting both variants keeps native logins from
    // failing merely because the redirect transport changed.
    const redirectUrl =
      extractRefreshUrl(header(loginResponse.headers, 'refresh')) ?? extractRedirectUrl(loginResponse.data);
    if (!redirectUrl) {
      throw new DualisError(
        `Anmeldung abgelehnt. ${siteConfigurationFor(this.site).dualis.description}`,
        'login-failed',
      );
    }

    const redirectPage = await this.request('GET', redirectUrl);
    const mainUrl = extractRedirectUrl(redirectPage.data) ??
      (extractAccessToken(redirectUrl) ? redirectUrl : null);
    if (!mainUrl) {
      throw new DualisError('Dualis-Hauptseite konnte nach dem Login nicht gefunden werden.', 'login-failed');
    }

    this.accessToken = extractAccessToken(mainUrl);
    const mainPage = await this.request('GET', mainUrl);
    this.urls = { ...parseMainPageUrls(mainPage.data), main: mainUrl, semesters: {} };

    if (isTimeoutOrAccessDenied(mainPage.data)) {
      throw new DualisError('Dualis-Anmeldung ist abgelaufen oder wurde abgelehnt.', 'login-failed');
    }

    if (!this.urls.studentResults || !this.urls.courseResults) {
      throw new DualisError('Dualis-Menüpunkte konnten nicht gelesen werden.', 'parse-failed');
    }
  }

  async logout(): Promise<void> {
    const logoutUrl = this.urls.logout;
    if (logoutUrl) {
      try {
        // The server needs the current session cookie to invalidate it. The
        // local/native cookie stores are cleared only after this best-effort call.
        await this.request('GET', logoutUrl);
      } catch {
        /* Logout ist best-effort; lokale Session wird trotzdem verworfen. */
      }
    }
    this.credentials = null;
    this.urls = { semesters: {} };
    this.accessToken = null;
    this.cookies.clear();
    await this.clearNativeCookies();
  }

  async loadDashboard(): Promise<DualisDashboard> {
    const [summary, modules, semesters] = await Promise.all([
      this.loadStudySummary().catch(() => null),
      this.loadAllModules(),
      this.loadSemesterNames(),
    ]);
    return { summary, modules, semesters };
  }

  async loadStudySummary(): Promise<DualisDashboard['summary']> {
    const url = requireUrl(this.urls.studentResults, 'Prüfungsergebnis-URL fehlt.');
    const html = await this.authenticatedGet(url);
    return parseStudySummary(html);
  }

  async loadAllModules(): Promise<DualisModule[]> {
    const url = requireUrl(this.urls.studentResults, 'Prüfungsergebnis-URL fehlt.');
    const html = await this.authenticatedGet(url);
    return parseModules(html, 'student');
  }

  async loadSemesterNames(): Promise<string[]> {
    const base = requireUrl(this.urls.courseResults, 'Kursnoten-URL fehlt.');
    const html = await this.authenticatedGet(base);
    const semesters = parseSemesterOptions(html);
    // Jede Semester-URL aus der funktionierenden Basis-URL ableiten (Semesterwert
    // ins dritte ARGUMENTS-Feld schreiben) statt aus dem onchange-Handler.
    for (const semester of semesters) {
      this.urls.semesters[semester.name] = withSemesterArgument(base, semester.value);
    }
    return semesters.map((semester) => semester.name);
  }

  async loadSemester(name: string): Promise<DualisSemester> {
    if (!this.urls.semesters[name]) {
      await this.loadSemesterNames();
    }
    const url = requireUrl(this.urls.semesters[name], `Semester "${name}" wurde nicht gefunden.`);
    const html = await this.authenticatedGet(url);
    return { name, modules: parseModules(html, 'course') };
  }

  async loadModuleExams(module: DualisModule): Promise<DualisExam[]> {
    const url = requireUrl(module.detailsUrl, `Für "${module.name}" gibt es keine Detail-URL.`);
    const html = await this.authenticatedGet(url);
    return parseExams(html);
  }

  private async authenticatedGet(url: string): Promise<string> {
    let response = await this.request('GET', replaceAccessToken(url, this.accessToken));
    if (!isTimeoutOrAccessDenied(response.data)) return response.data;

    if (!this.credentials) {
      throw new DualisError('Dualis-Session ist abgelaufen.', 'login-failed');
    }

    const credentials = this.credentials;
    await this.login(credentials);
    response = await this.request('GET', replaceAccessToken(url, this.accessToken));
    return response.data;
  }

  private async request(method: 'GET' | 'POST', url: string, body?: Record<string, string>): Promise<HttpResponse> {
    try {
      let currentMethod = method;
      let currentUrl = url;
      let currentBody = body;

      // CapacitorHttp uses URLSession on iOS. URLSession follows redirects
      // automatically, which hides the intermediate Location response that
      // CampusNet uses to transfer the authenticated session. Handle native
      // redirects explicitly so cookies and the session token stay aligned.
      for (let redirectCount = 0; redirectCount < 6; redirectCount += 1) {
        const response = await this.requestOnce(currentMethod, currentUrl, currentBody);
        this.storeCookies(response.headers);

        if (!Capacitor.isNativePlatform() || !isRedirect(response.status)) return response;

        const location = header(response.headers, 'location');
        if (!location) return response;

        currentUrl = new URL(location, currentUrl).toString();
        if (response.status === 301 || response.status === 302 || response.status === 303) {
          currentMethod = 'GET';
          currentBody = undefined;
        }
      }

      throw new DualisError('Dualis-Weiterleitung konnte nicht abgeschlossen werden.', 'network');
    } catch (error) {
      if (error instanceof DualisError) throw error;
      throw new DualisError('Dualis ist gerade nicht erreichbar.', 'network');
    }
  }

  private async requestOnce(
    method: 'GET' | 'POST',
    url: string,
    body?: Record<string, string>,
  ): Promise<HttpResponse> {
    const headers: Record<string, string> = {
      Accept: 'text/html,application/xhtml+xml',
      ...this.cookieHeader(),
    };

    if (Capacitor.isNativePlatform()) {
      const options = {
        url,
        headers: method === 'POST' ? { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } : headers,
        responseType: 'text' as const,
        // Keep Location and Set-Cookie from each CampusNet hop visible to JS.
        disableRedirects: true,
      };
      const res =
        method === 'GET'
          ? await CapacitorHttp.get(options)
          : await CapacitorHttp.post({
              ...options,
              data: new URLSearchParams(body).toString(),
            });
      return {
        status: res.status,
        data: typeof res.data === 'string' ? res.data : String(res.data ?? ''),
        headers: normalizeHeaders(res.headers ?? {}),
      };
    }

    const proxied = toDevProxyUrl(url);
    const res = await fetch(proxied, {
      method,
      headers: method === 'POST' ? { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } : headers,
      body: method === 'POST' ? new URLSearchParams(body).toString() : undefined,
    });
    return {
      status: res.status,
      data: await res.text(),
      headers: normalizeHeaders(Object.fromEntries(res.headers.entries())),
    };
  }

  private cookieHeader(): Record<string, string> {
    const value = Array.from(this.cookies.entries())
      .map(([name, cookieValue]) => `${name}=${cookieValue}`)
      .join('; ');
    return value ? { Cookie: value } : {};
  }

  private storeCookies(headers: Record<string, string>): void {
    const raw = header(headers, 'set-cookie');
    if (!raw) return;

    for (const [name, value] of parseSetCookieHeader(raw)) {
      this.cookies.set(name, value);
    }
  }

  private async clearNativeCookies(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await CapacitorCookies.clearCookies({ url: DUALIS_ENDPOINT });
    } catch {
      // The in-memory cookie map is still cleared if native cookie cleanup is unavailable.
    }
  }
}

export function normalizeDualisUsername(username: string, site = 'RV'): string {
  return dualisUsernameFor(username, site);
}

/**
 * CampusNet currently emits the session cookie as `cnsc =...` (with a space
 * before `=`). Trim the cookie name as well as the value before constructing a
 * Cookie header; otherwise native iOS requests send `cnsc ` and lose the
 * authenticated session after the redirect.
 */
export function parseSetCookieHeader(raw: string): Array<[name: string, value: string]> {
  const cookies: Array<[string, string]> = [];
  for (const part of raw.split(/,(?=\s*[^;,]+=)/)) {
    const cookie = part.split(';')[0]?.trim();
    const separator = cookie?.indexOf('=') ?? -1;
    if (!cookie || separator < 1) continue;

    const name = cookie.slice(0, separator).trim();
    const value = cookie.slice(separator + 1).trim();
    if (name) cookies.push([name, value]);
  }
  return cookies;
}

/**
 * CampusNet currently emits the session cookie as `cnsc =...` (with a space
 * before `=`). Trim the cookie name as well as the value before constructing a
 * Cookie header; otherwise native iOS requests send `cnsc ` and lose the
 * authenticated session after the redirect.
 */
export function parseSetCookieHeader(raw: string): Array<[name: string, value: string]> {
  const cookies: Array<[string, string]> = [];
  for (const part of raw.split(/,(?=\s*[^;,]+=)/)) {
    const cookie = part.split(';')[0]?.trim();
    const separator = cookie?.indexOf('=') ?? -1;
    if (!cookie || separator < 1) continue;

    const name = cookie.slice(0, separator).trim();
    const value = cookie.slice(separator + 1).trim();
    if (name) cookies.push([name, value]);
  }
  return cookies;
}

function requireUrl(url: string | undefined, message: string): string {
  if (!url) throw new DualisError(message, 'missing-url');
  return url;
}

function normalizeHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)]));
}

function header(headers: Record<string, string>, name: string): string | undefined {
  return headers[name.toLowerCase()];
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400;
}

function toDevProxyUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.origin !== DUALIS_ENDPOINT) return url;
  return `/dualis${parsed.pathname}${parsed.search}`;
}
