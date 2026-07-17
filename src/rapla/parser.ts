/**
 * Parser für Rapla 2.0 (DHBW).
 *
 * Kern des Fixes: In Rapla 2.0 gibt es keine Tooltips mehr (`tooltip`,
 * `infotable`, `label`, `value` existieren nicht). Jeder Termin ist ein
 * `<td class="week_block">` mit dieser Struktur:
 *
 *   <a href="#1">08:30 -12:30 Onlinemarketing &lt;Zusatz&gt;<br></a>
 *   <span class="person">Maximilian Zorg</span>   (0..n Dozenten)
 *   <span class="resource">DH-WINF24A</span>     (Kurscode)
 *   <span class="resource">WS17-0.13 Hörsaal</span> (0..n Räume)
 *
 * Das Datum steht nicht im Block: Es ergibt sich aus der Spaltenposition des
 * Blocks in der Wochentabelle (KW-Kopfzeile "Mo 06.07." usw.), das Jahr aus
 * `<select name="year">` (entspricht readYearOrThrow der alten App).
 */

import { EntryType, ScheduleEntry } from '../types';
import { berlinToUtc } from '../lib/berlinTime';

function devLog(...args: unknown[]): void {
  // Nicht parsebare Blöcke nur im Dev-Modus loggen — im Release still tolerieren.
  if (import.meta.env?.DEV) console.warn('[rapla-parser]', ...args);
}

/** Liest das Jahr aus dem Datums-Selektor. Wirft, wenn nicht vorhanden. */
export function readYearOrThrow(doc: Document): number {
  const select = doc.querySelector('select[name="year"]');
  if (!select) throw new Error('Rapla-HTML: <select name="year"> nicht gefunden');
  const selected =
    select.querySelector('option[selected]') ??
    // Fallback: DOM-Property (jsdom/Browser setzen .value auf die selektierte Option)
    null;
  const raw = selected?.textContent ?? (select as HTMLSelectElement).value;
  const year = parseInt(raw.trim(), 10);
  if (!Number.isFinite(year)) throw new Error(`Rapla-HTML: Jahr nicht lesbar ("${raw}")`);
  return year;
}

/**
 * Jahreskorrektur an KW-Grenzen: Eine Kalenderwoche kann das Jahr überlappen
 * (z. B. KW 1 mit 29.–31.12. oder KW 53 mit 01.–03.01.).
 */
function resolveYear(selectedYear: number, month: number, weekNumber?: number): number {
  if (weekNumber !== undefined) {
    if (weekNumber <= 2 && month === 12) return selectedYear - 1;
    if (weekNumber >= 52 && month === 1) return selectedYear + 1;
  }
  return selectedYear;
}

/** Kurscode-Heuristik: nur Buchstaben vor dem Bindestrich, Buchstabe danach
 *  ("DH-WINF24A" ✓ — Räume wie "WS17-0.13" haben Ziffern vor/nach dem Strich). */
function isCourseCode(resource: string): boolean {
  return /^[A-Za-zÄÖÜäöü]{2,}-[A-Za-zÄÖÜäöü]/.test(resource);
}

/** Typ-Mapping sinngemäß aus der alten App, angewendet auf Titel/Zusatz/Blocktext. */
function detectType(text: string): EntryType {
  if (/feiertag/i.test(text)) return 'holiday';
  if (/klausur|prüfung|pruefung/i.test(text)) return 'exam';
  // Wortgrenze, damit z. B. "Onlinemarketing" nicht als Online-Format gilt.
  if (/\bonline\b/i.test(text)) return 'online';
  if (/vorlesung|lehrbetrieb|lehrveranstaltung/i.test(text)) return 'lecture';
  return 'unknown';
}

const NON_LECTURER_WORDS = /\b(online|bbb|zoom|teams|moodle|hybrid|raum|link|http|www|deadline|klausur|prüfung|pruefung|einsicht|selbststudium)\b/i;

function isLecturerName(name: string): boolean {
  const text = name.trim();
  if (!text || text.length > 60 || /\d/.test(text)) return false;
  if (NON_LECTURER_WORDS.test(text)) return false;

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return false;

  const firstWord = words[0];
  const isTitle = /^(prof\.?|dr\.?)$/i.test(firstWord);
  const isPrefix = /^(von|van|de|der|zu)$/i.test(firstWord);
  const startsWithCapital = /^[A-ZÄÖÜ]/.test(firstWord);

  return isTitle || isPrefix || startsWithCapital;
}

function extractLecturersFromExtra(extra: string): string[] {
  const parenMatch = extra.match(/\(([^)]+)\)/);
  const candidateText = parenMatch ? parenMatch[1] : extra;

  const candidates = candidateText
    .split(/\s*[/,&]\s*|\s+und\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const lecturers: string[] = [];
  for (const cand of candidates) {
    if (isLecturerName(cand)) {
      lecturers.push(cand);
    }
  }

  if (lecturers.length === 0 && parenMatch) {
    const fallbackCandidates = extra
      .split(/\s*[/,&]\s*|\s+und\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const cand of fallbackCandidates) {
      if (isLecturerName(cand)) {
        lecturers.push(cand);
      }
    }
  }

  return lecturers;
}

/** Parst einen einzelnen week_block. Gibt null zurück, wenn Zeit/Titel fehlen. */
function parseBlock(cell: Element, y: number, m: number, d: number): ScheduleEntry | null {
  const anchor = cell.querySelector('a');
  const anchorText = (anchor?.textContent ?? '').trim();

  // "HH:MM -HH:MM Titel" — tolerant gegenüber Leerzeichen um den Bindestrich.
  let match = anchorText.match(/^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})\s*(.*)$/s);
  if (!match) {
    // Am Live-System beobachtet: Blöcke ohne Endzeit, z. B.
    // "00:00 -Deadline Wahl Studienrichtungswahlfach II" → Punkt-Termin (Ende = Start).
    const single = anchorText.match(/^(\d{1,2}):(\d{2})\s*-\s*(.*)$/s);
    if (!single) {
      devLog('week_block ohne parsebare Zeit/Titel übersprungen:', anchorText || cell.textContent);
      return null;
    }
    match = [single[0], single[1], single[2], single[1], single[2], single[3]] as RegExpMatchArray;
  }
  const [, sh, sm, eh, em] = match;
  let title = match[5].trim();

  // Zusatz in spitzen Klammern am Titel abtrennen (z. B. "<Maximilian Zorg>"
  // oder "<Online über BBB (Prof. Dr. Hopf)>").
  let extra: string | undefined;
  const extraMatch = title.match(/^(.*?)\s*<([^<>]*)>(.*)$/s);
  if (extraMatch) {
    title = `${extraMatch[1]} ${extraMatch[3]}`.replace(/\s+/g, ' ').trim();
    extra = extraMatch[2].trim() || undefined;
  }

  // Fallback-Verhalten: fehlen .person/.resource-Spans, bleiben die Listen
  // einfach leer — Zeit/Titel aus dem <a> sind trotzdem gültig.
  let lecturers = Array.from(cell.querySelectorAll('span.person'))
    .map((s) => s.textContent?.trim() ?? '')
    .filter(Boolean);
  const resources = Array.from(cell.querySelectorAll('span.resource'))
    .map((s) => s.textContent?.trim() ?? '')
    .filter(Boolean);

  if (lecturers.length === 0 && extra) {
    const extracted = extractLecturersFromExtra(extra);
    if (extracted.length > 0) {
      lecturers = extracted;

      // Clean up extra to remove the parsed lecturer names & empty parentheses
      let cleanedExtra = extra;
      for (const name of extracted) {
        cleanedExtra = cleanedExtra.replace(name, '');
      }
      cleanedExtra = cleanedExtra
        .replace(/\(\s*\)/g, '')
        .replace(/\[\s*\]/g, '')
        .replace(/\s*[/,&-]\s*/g, ' ')
        .replace(/\s+und\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const remains = cleanedExtra.replace(/[(),.\[\]\s]/g, '');
      if (remains.length === 0) {
        extra = undefined;
      } else {
        extra = cleanedExtra;
      }
    }
  }

  const course = resources.find(isCourseCode);
  const rooms = resources.filter((r) => r !== course);

  return {
    start: berlinToUtc(y, m, d, +sh, +sm),
    end: berlinToUtc(y, m, d, +eh, +em),
    title,
    extra,
    lecturers,
    course,
    rooms,
    type: detectType(`${title} ${extra ?? ''} ${cell.textContent ?? ''}`),
  };
}

/**
 * Parst eine komplette Rapla-Wochenseite zu ScheduleEntry[].
 *
 * Die Wochentabelle ist ein Grid mit row-/colspans: Kopfzellen
 * (`week_header`, "Mo 06.07.") belegen Spaltenbereiche, Termin-Blöcke
 * (`week_block`) hängen über ihre Spaltenposition am jeweiligen Tag. Wir lösen
 * das Grid mit Standard-Tabellenlayout-Logik auf (Belegungs-Array `carry`
 * verfolgt rowspans über Zeilen hinweg) und ordnen jeden Block der Kopfzelle
 * zu, deren Spaltenbereich seine Startspalte enthält.
 */
export function parseRaplaWeek(html: string): ScheduleEntry[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const year = readYearOrThrow(doc);

  const table = doc.querySelector('table.week_table');
  if (!table) return []; // Woche ohne Termine/Tabelle ist gültig.

  const rows = Array.from((table as HTMLTableElement).rows);
  const carry: number[] = []; // pro Spalte: verbleibende Zeilen aus rowspans
  const days: { start: number; end: number; day: number; month: number }[] = [];
  const blocks: { el: Element; col: number }[] = [];
  let weekNumber: number | undefined;

  for (const row of rows) {
    let col = 0;
    for (const cell of Array.from(row.cells)) {
      while ((carry[col] ?? 0) > 0) col++; // von rowspans belegte Spalten überspringen
      const colspan = parseInt(cell.getAttribute('colspan') ?? '1', 10) || 1;
      const rowspan = parseInt(cell.getAttribute('rowspan') ?? '1', 10) || 1;
      const cls = cell.className ?? '';

      if (cls.includes('week_number')) {
        const m = cell.textContent?.match(/(\d+)/);
        if (m) weekNumber = parseInt(m[1], 10);
      } else if (cls.includes('week_header')) {
        const m = cell.textContent?.match(/(\d{1,2})\.(\d{1,2})\.?/);
        if (m) days.push({ start: col, end: col + colspan, day: +m[1], month: +m[2] });
      } else if (cls.includes('week_block')) {
        blocks.push({ el: cell, col });
      }

      for (let i = col; i < col + colspan; i++) carry[i] = Math.max(carry[i] ?? 0, rowspan);
      col += colspan;
    }
    for (let i = 0; i < carry.length; i++) if (carry[i] > 0) carry[i]--;
  }

  const entries: ScheduleEntry[] = [];
  for (const block of blocks) {
    const day = days.find((h) => block.col >= h.start && block.col < h.end);
    if (!day) {
      devLog('week_block ohne zugeordneten Tag übersprungen (Spalte', block.col, ')');
      continue;
    }
    const entry = parseBlock(block.el, resolveYear(year, day.month, weekNumber), day.month, day.day);
    if (entry) entries.push(entry);
  }

  entries.sort((a, b) => a.start.getTime() - b.start.getTime());
  return entries;
}
