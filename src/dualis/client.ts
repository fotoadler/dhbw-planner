import { Capacitor, CapacitorHttp } from '@capacitor/core';
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

  get isLoggedIn(): boolean {
    return Boolean(this.credentials && this.urls.main && this.accessToken);
  }

  async login(credentials: DualisCredentials): Promise<void> {
    this.credentials = credentials;
    this.cookies.clear();
    this.urls = { semesters: {} };
    this.accessToken = null;

    const loginResponse = await this.request('POST', `${DUALIS_ENDPOINT}/scripts/mgrqispi.dll`, {
      usrname: credentials.username,
      pass: credentials.password,
      APPNAME: 'CampusNet',
      PRGNAME: 'LOGINCHECK',
      ARGUMENTS: 'clino,usrname,pass,menuno,menu_type,browser,platform',
      clino: '000000000000001',
      menuno: '000324',
      menu_type: 'classic',
      browser: '',
      platform: '',
    });

    if (loginResponse.status !== 200) {
      throw new DualisError('Dualis hat den Login abgelehnt.', 'login-failed');
    }

    const redirectUrl = extractRefreshUrl(header(loginResponse.headers, 'refresh'));
    if (!redirectUrl) {
      throw new DualisError('Dualis hat keine Login-Weiterleitung geliefert.', 'login-failed');
    }

    const redirectPage = await this.request('GET', redirectUrl);
    const mainUrl = extractRedirectUrl(redirectPage.data);
    if (!mainUrl) {
      throw new DualisError('Dualis-Hauptseite konnte nach dem Login nicht gefunden werden.', 'login-failed');
    }

    this.accessToken = extractAccessToken(mainUrl);
    const mainPage = await this.request('GET', mainUrl);
    this.urls = { ...parseMainPageUrls(mainPage.data), main: mainUrl, semesters: {} };

    if (!this.urls.studentResults || !this.urls.courseResults) {
      throw new DualisError('Dualis-Menüpunkte konnten nicht gelesen werden.', 'parse-failed');
    }
  }

  async logout(): Promise<void> {
    const logoutUrl = this.urls.logout;
    this.credentials = null;
    this.urls = { semesters: {} };
    this.accessToken = null;
    this.cookies.clear();
    if (logoutUrl) {
      try {
        await this.request('GET', logoutUrl);
      } catch {
        /* Logout ist best-effort; lokale Session wird immer verworfen. */
      }
    }
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
      const headers: Record<string, string> = {
        Accept: 'text/html,application/xhtml+xml',
        ...this.cookieHeader(),
      };

      let response: HttpResponse;
      if (Capacitor.isNativePlatform()) {
        const res =
          method === 'GET'
            ? await CapacitorHttp.get({ url, headers, responseType: 'text' })
            : await CapacitorHttp.post({
                url,
                headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
                data: new URLSearchParams(body).toString(),
                responseType: 'text',
              });
        response = {
          status: res.status,
          data: typeof res.data === 'string' ? res.data : String(res.data ?? ''),
          headers: normalizeHeaders(res.headers ?? {}),
        };
      } else {
        const proxied = toDevProxyUrl(url);
        const res = await fetch(proxied, {
          method,
          headers: method === 'POST' ? { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } : headers,
          body: method === 'POST' ? new URLSearchParams(body).toString() : undefined,
        });
        response = {
          status: res.status,
          data: await res.text(),
          headers: normalizeHeaders(Object.fromEntries(res.headers.entries())),
        };
      }

      this.storeCookies(response.headers);
      return response;
    } catch (error) {
      if (error instanceof DualisError) throw error;
      throw new DualisError('Dualis ist gerade nicht erreichbar.', 'network');
    }
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

    for (const part of raw.split(/,(?=\s*[^;,]+=)/)) {
      const cookie = part.split(';')[0]?.trim();
      const separator = cookie?.indexOf('=') ?? -1;
      if (!cookie || separator < 1) continue;
      this.cookies.set(cookie.slice(0, separator), cookie.slice(separator + 1));
    }
  }
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

function toDevProxyUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.origin !== DUALIS_ENDPOINT) return url;
  return `/dualis${parsed.pathname}${parsed.search}`;
}
