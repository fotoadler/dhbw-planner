import { addDaysYmd, mondayOfYmd, parseYmdKey, ymdKey } from '../lib/berlinTime';

/** Whole calendar weeks, including the neighbouring days shown in the month grid. */
export function monthDays(day: string): string[] {
  const { y, m } = parseYmdKey(day);
  const first = mondayOfYmd({ y, m, d: 1 });
  const lastDate = new Date(Date.UTC(y, m, 0, 12));
  const lastMonday = mondayOfYmd({ y, m, d: lastDate.getUTCDate() });
  const end = ymdKey(addDaysYmd(lastMonday, 6));
  const days: string[] = [];
  for (let current = first; ymdKey(current) <= end; current = addDaysYmd(current, 1)) {
    days.push(ymdKey(current));
  }
  return days;
}

export function monthWeekKeys(day: string): string[] {
  return monthDays(day).filter((_, index) => index % 7 === 0);
}

/** Preserve the selected day where possible; clamp 31st to shorter months. */
export function shiftMonth(day: string, delta: 1 | -1): string {
  const { y, m, d } = parseYmdKey(day);
  const first = new Date(Date.UTC(y, m - 1 + delta, 1, 12));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0, 12));
  return ymdKey({ y: first.getUTCFullYear(), m: first.getUTCMonth() + 1, d: Math.min(d, last.getUTCDate()) });
}

const monthFmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', month: 'long', year: 'numeric' });
export function monthTitle(day: string): string {
  const { y, m } = parseYmdKey(day);
  return monthFmt.format(new Date(Date.UTC(y, m - 1, 1, 12)));
}
