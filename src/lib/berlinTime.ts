/**
 * Zeit-/Zeitzonen-Utilities.
 *
 * Alle Zeitberechnungen der App erfolgen in Europe/Berlin — unabhängig von der
 * Gerätezeitzone. Statt einer Datums-Bibliothek nutzen wir Intl.DateTimeFormat,
 * um Wandzeiten nach UTC-Instants (und zurück) zu konvertieren.
 */

export const TZ = 'Europe/Berlin';

export interface Ymd {
  y: number;
  m: number; // 1-basiert
  d: number;
}

const wallFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });

interface WallParts extends Ymd {
  hh: number;
  mm: number;
  ss: number;
}

/** Zerlegt einen UTC-Instant in seine Berlin-Wandzeit-Komponenten. */
export function berlinParts(date: Date): WallParts {
  const p: Record<string, string> = {};
  for (const part of wallFmt.formatToParts(date)) {
    if (part.type !== 'literal') p[part.type] = part.value;
  }
  return {
    y: +p.year,
    m: +p.month,
    d: +p.day,
    hh: +p.hour,
    mm: +p.minute,
    ss: +p.second,
  };
}

/** Wandzeit in Berlin als UTC-Millisekunden interpretiert (Hilfswert für Offsetbestimmung). */
function berlinWallMs(date: Date): number {
  const p = berlinParts(date);
  return Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm, p.ss);
}

/**
 * Konvertiert eine Berlin-Wandzeit (z. B. 06.07.2026 08:30) in den korrekten
 * UTC-Instant — inkl. Sommer-/Winterzeit. Iterative Offset-Bestimmung, da der
 * Offset selbst vom gesuchten Instant abhängt (DST-Übergänge).
 */
export function berlinToUtc(y: number, m: number, d: number, hh: number, mm: number): Date {
  const wallMs = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wallMs;
  for (let i = 0; i < 3; i++) {
    const offset = berlinWallMs(new Date(guess)) - guess;
    const next = wallMs - offset;
    if (next === guess) break;
    guess = next;
  }
  return new Date(guess);
}

export function ymdKey(ymd: Ymd): string {
  const p2 = (n: number) => String(n).padStart(2, '0');
  return `${ymd.y}-${p2(ymd.m)}-${p2(ymd.d)}`;
}

/** Kalendertag (Berlin) eines Instants als "YYYY-MM-DD" — Gruppierungsschlüssel. */
export function berlinDayKey(date: Date): string {
  return ymdKey(berlinParts(date));
}

/** Reine Kalender-Arithmetik auf Y/M/D (zeitzonenfrei, via UTC-Mittag gegen DST-Artefakte). */
export function addDaysYmd(ymd: Ymd, days: number): Ymd {
  const ms = Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12) + days * 86_400_000;
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Wochentag-Index in Berlin: Mo=0 … So=6. */
export function berlinWeekdayIndex(date: Date): number {
  return WEEKDAYS.indexOf(weekdayFmt.format(date));
}

/** Der Montag der Berlin-Kalenderwoche, in der `date` liegt. */
export function mondayOf(date: Date): Ymd {
  const parts = berlinParts(date);
  return addDaysYmd(parts, -berlinWeekdayIndex(date));
}

/** Der Montag der Woche eines Kalendertags (reine Y/M/D-Arithmetik). */
export function mondayOfYmd(ymd: Ymd): Ymd {
  const dt = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12));
  const idx = (dt.getUTCDay() + 6) % 7; // Mo=0 … So=6
  return addDaysYmd(ymd, -idx);
}

/** ISO-8601-Kalenderwoche eines Kalendertags (KW 1 = Woche mit dem 4. Januar). */
export function isoWeekNumber(ymd: Ymd): number {
  const date = new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d));
  // Auf den Donnerstag derselben Woche schieben — dessen Jahr bestimmt die KW.
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7) + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7) + 3);
  return 1 + Math.round((date.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

export function parseYmdKey(key: string): Ymd {
  const [y, m, d] = key.split('-').map(Number);
  return { y, m, d };
}

// --- Anzeige-Formatierung (deutsch, immer Europe/Berlin) ---

const timeFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
});

export function formatTime(date: Date): string {
  return timeFmt.format(date);
}

const dayLongFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** z. B. "Montag, 6. Juli" für einen YMD-Kalendertag. */
export function formatDayLong(ymd: Ymd): string {
  return dayLongFmt.format(new Date(Date.UTC(ymd.y, ymd.m - 1, ymd.d, 12)));
}

const dayMonthFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: TZ,
  day: 'numeric',
  month: 'long',
});

/** Wochenbereich ab Montag, z. B. "6.–12. Juli" bzw. "29. Juni – 5. Juli". */
export function formatWeekRange(monday: Ymd): string {
  const sunday = addDaysYmd(monday, 6);
  const start = new Date(Date.UTC(monday.y, monday.m - 1, monday.d, 12));
  const end = new Date(Date.UTC(sunday.y, sunday.m - 1, sunday.d, 12));
  return monday.m === sunday.m
    ? `${monday.d}.–${dayMonthFmt.format(end)}`
    : `${dayMonthFmt.format(start)} – ${dayMonthFmt.format(end)}`;
}
