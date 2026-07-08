import { DualisExam, DualisModule, DualisSemester, DualisSessionUrls, DualisStudySummary } from './types';

export const DUALIS_ENDPOINT = 'https://dualis.dhbw.de';

const TOKEN_RE = /ARGUMENTS=-N(\d{15})/;

export function extractAccessToken(url: string): string | null {
  return TOKEN_RE.exec(url)?.[1] ?? null;
}

export function replaceAccessToken(url: string, token: string | null): string {
  if (!token) return url;
  return url.replace(/ARGUMENTS=-N\d{15}/, `ARGUMENTS=-N${token}`);
}

export function extractRefreshUrl(refreshHeader: string | undefined, endpoint = DUALIS_ENDPOINT): string | null {
  if (!refreshHeader) return null;
  const urlPart = refreshHeader.match(/url=([^;]+)/i)?.[1]?.trim();
  if (!urlPart) return null;
  return absoluteUrl(urlPart.replace(/^['"]|['"]$/g, ''), endpoint);
}

export function extractRedirectUrl(html: string, endpoint = DUALIS_ENDPOINT): string | null {
  const fromMeta = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i)?.[1];
  if (fromMeta) return absoluteUrl(decodeHtml(fromMeta.trim()), endpoint);

  const fromLocation = html.match(/location\.href\s*=\s*["']([^"']+)["']/i)?.[1];
  if (fromLocation) return absoluteUrl(decodeHtml(fromLocation.trim()), endpoint);

  const fromReplace = html.match(/location\.replace\(["']([^"']+)["']\)/i)?.[1];
  if (fromReplace) return absoluteUrl(decodeHtml(fromReplace.trim()), endpoint);

  return null;
}

export function parseMainPageUrls(html: string, endpoint = DUALIS_ENDPOINT): DualisSessionUrls {
  const doc = parseHtml(html);
  const urls: DualisSessionUrls = { semesters: {} };
  urls.courseResults = hrefByClass(doc, 'link000307', endpoint);
  urls.studentResults = hrefByClass(doc, 'link000310', endpoint);
  urls.monthlySchedule = hrefByClass(doc, 'link000031', endpoint);
  urls.logout = hrefById(doc, 'logoutButton', endpoint);
  return urls;
}

export function parseStudySummary(html: string): DualisStudySummary {
  const doc = parseHtml(html);
  const bodies = Array.from(doc.querySelectorAll('tbody'));
  const creditsBody = bodies[0];
  const gpaBody = bodies[1];

  return {
    ...parseGpa(gpaBody),
    ...parseCredits(creditsBody),
  };
}

export interface DualisSemesterOption {
  name: string;
  value: string;
}

/**
 * Liest die Semester-Auswahl (Name + option-value). Die zugehörige URL wird
 * NICHT hier gebaut, sondern im Client aus der funktionierenden
 * COURSERESULTS-Basis-URL abgeleitet (siehe withSemesterArgument) — der
 * onchange-Handler von CampusNet ist dafür zu fragil.
 */
export function parseSemesterOptions(html: string): DualisSemesterOption[] {
  const doc = parseHtml(html);
  const semester = doc.querySelector<HTMLSelectElement>('select#semester, select[name="semester"]');
  if (!semester) return [];

  return Array.from(semester.querySelectorAll('option'))
    .map((option) => ({ name: cleanText(option.textContent), value: option.getAttribute('value') ?? '' }))
    .filter((option) => Boolean(option.name && option.value));
}

/**
 * Baut die COURSERESULTS-URL für ein bestimmtes Semester, indem im dritten
 * ARGUMENTS-Feld der Semesterwert gesetzt wird. CampusNet erwartet
 * `ARGUMENTS=-N<sessionToken>,-N<menuNo>,-N<semesterValue>` (die Basis-URL
 * liefert die ersten beiden Felder korrekt, das dritte ist leer = aktuelles
 * Semester). Kommas dürfen NICHT URL-kodiert werden.
 */
export function withSemesterArgument(courseResultsUrl: string, semesterValue: string): string {
  return courseResultsUrl.replace(/([?&]ARGUMENTS=)([^&]*)/, (_match, prefix: string, args: string) => {
    const parts = args.split(',');
    while (parts.length < 3) parts.push('');
    parts[2] = `-N${semesterValue}`;
    return prefix + parts.join(',');
  });
}

/**
 * Woher die Modultabelle stammt — die beiden CampusNet-Seiten haben
 * unterschiedliche Spaltenordnungen (am Live-System verifiziert):
 *
 *   'student' (STUDENT_RESULT / Leistungsübersicht):
 *     [Code, Name, (leer), Credits, Note, Status-Bild]
 *   'course'  (COURSERESULTS / Semester-Kursnoten):
 *     [Code, Name, Note, Credits, Status-Text, Details, (leer)]
 */
export type ModuleSource = 'student' | 'course';

/** Echte Modulzeilen haben einen Modulcode in Spalte 1 (z. B. "W3BW_MK701").
 *  Programm-, Gruppen- und Summenzeilen ("ZZZ_…", "Module", "Summe …") nicht. */
const MODULE_CODE_RE = /^[A-Za-z0-9]+(?:[._-]\w+)*$/;

function isPassImage(cell: Element | undefined): boolean {
  return /pass\.gif|alt="?Bestanden/i.test(cell?.innerHTML ?? '');
}

export function parseModules(html: string, source: ModuleSource, endpoint = DUALIS_ENDPOINT): DualisModule[] {
  const doc = parseHtml(html);
  const modules: DualisModule[] = [];

  for (const row of Array.from(doc.querySelectorAll('tbody tr'))) {
    // Zwischenüberschriften/Programm-/Gruppenzeilen (tr class="subhead level0x").
    if (/subhead|tbsubhead|level\d/i.test(row.getAttribute('class') ?? '')) continue;

    const cells = Array.from(row.children).filter((cell) => cell.tagName.toLowerCase() === 'td');
    if (cells.length < 5) continue;

    // Nur echte Module: Spalte 1 muss ein Modulcode sein (kein Programm-/Summenname).
    const id = elementText(cells[0]);
    if (!MODULE_CODE_RE.test(id)) continue;

    const name = elementText(cells[1]);
    let grade: string;
    let credits: string;
    let passed: boolean;
    if (source === 'student') {
      credits = elementText(cells[3]);
      grade = elementText(cells[4]);
      passed = isPassImage(cells[5]);
    } else {
      grade = elementText(cells[2]);
      credits = elementText(cells[3]);
      passed = elementText(cells[4]).toLowerCase() === 'bestanden';
    }

    modules.push({
      id,
      name,
      grade: grade === 'noch nicht gesetzt' ? '' : grade,
      credits,
      passed,
      detailsUrl: extractDetailsUrl(cells[5] ?? cells[1], endpoint),
    });
  }

  return modules;
}

export function parseSemester(html: string, name: string, endpoint = DUALIS_ENDPOINT): DualisSemester {
  return { name, modules: parseModules(html, 'course', endpoint) };
}

export function parseExams(html: string): DualisExam[] {
  const doc = parseHtml(html);
  const exams: DualisExam[] = [];
  let attempt = '';
  let moduleName = '';

  for (const row of Array.from(doc.querySelectorAll('tbody tr'))) {
    const level01 = row.querySelector('.level01');
    if (level01) {
      attempt = cleanText(level01.textContent);
      continue;
    }

    const level02 = row.querySelector('.level02');
    if (level02) {
      moduleName = cleanText(level02.textContent);
      continue;
    }

    const data = Array.from(row.querySelectorAll('.tbdata'));
    if (data.length < 4) continue;

    const grade = elementText(data[3]);
    // Strukturelle Teilmodul-Zeilen (Modulcode in Spalte 1, keine Note) auslassen —
    // sichtbar bleiben nur echte Prüfungsleistungen mit Note/Punkten.
    if (!grade || grade === '–') continue;

    exams.push({
      semester: elementText(data[0]),
      name: elementText(data[1]),
      moduleName,
      attempt,
      grade,
    });
  }

  return exams;
}

export function isTimeoutOrAccessDenied(html: string): boolean {
  const text = cleanText(html).toLowerCase();
  return (
    text.includes('session') && text.includes('abgelaufen') ||
    text.includes('access denied') ||
    text.includes('zugriff verweigert') ||
    text.includes('cn_loginform')
  );
}

function parseHtml(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function hrefByClass(doc: Document, className: string, endpoint: string): string | undefined {
  const href = doc.querySelector(`.${className}`)?.getAttribute('href');
  return href ? absoluteUrl(href, endpoint) : undefined;
}

function hrefById(doc: Document, id: string, endpoint: string): string | undefined {
  const href = doc.getElementById(id)?.getAttribute('href');
  return href ? absoluteUrl(href, endpoint) : undefined;
}

function absoluteUrl(pathOrUrl: string, endpoint: string): string {
  return new URL(pathOrUrl, endpoint).toString();
}

function cleanText(value: string | null | undefined): string {
  return decodeHtml(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Sichtbarer Text einer Zelle. Dualis bettet in Ergebnis-Zellen Inline-Skripte
 * ein ("<script><!-- var PopupLink=\u2026 //--></script>") \u2014 deren Quelltext geh\u00f6rt
 * zu textContent und w\u00fcrde sonst im Modulnamen landen.
 */
function elementText(element: Element | null | undefined): string {
  if (!element) return '';
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll('script, style').forEach((node) => node.remove());
  return cleanText(clone.textContent);
}

function decodeHtml(value: string): string {
  const textarea = document.createElement('textarea');
  textarea.innerHTML = value;
  return textarea.value;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) return null;
  const normalized = value.replace(',', '.').replace(/[^\d.-]/g, '');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCredits(body: Element | undefined): Pick<DualisStudySummary, 'creditsGained' | 'creditsTotal'> {
  const rows = body ? Array.from(body.querySelectorAll('tr')) : [];
  const last = rows[rows.length - 1];
  const beforeLast = rows[rows.length - 2];
  const totalParts = cleanText(last?.children[0]?.textContent).split(':');
  const totalText = totalParts[totalParts.length - 1];
  const gainedText = cleanText(beforeLast?.children[2]?.textContent);
  return {
    creditsGained: parseNumber(gainedText),
    creditsTotal: parseNumber(totalText),
  };
}

function parseGpa(body: Element | undefined): Pick<DualisStudySummary, 'gpaMainModules' | 'gpaTotal'> {
  const rows = body ? Array.from(body.querySelectorAll('tr')) : [];
  return {
    gpaTotal: parseNumber(cleanText(rows[0]?.querySelectorAll('th')[1]?.textContent)),
    gpaMainModules: parseNumber(cleanText(rows[1]?.querySelectorAll('th')[1]?.textContent)),
  };
}

function extractDetailsUrl(element: Element | undefined, endpoint: string): string | undefined {
  if (!element) return undefined;
  const source = Array.from(element.querySelectorAll<HTMLElement>('[onclick]'))
    .map((button) => button.getAttribute('onclick') ?? '')
    .concat(element.innerHTML)
    .join(' ');
  const url = source.match(/dl_popUp\((?:"|'|&quot;)(.+?)(?:"|'|&quot;)/)?.[1];
  return url ? absoluteUrl(decodeHtml(url), endpoint) : undefined;
}

