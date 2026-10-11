import { berlinDayKey, formatTime } from '../lib/berlinTime';
import { wallMinutes, WEEK_FIRST_HOUR } from './weekLayout';

/** Use Berlin wall time, just like event geometry; elapsed UTC hours break on DST days. */
export function weekNowMarker(now: Date, weekDays: string[], hourHeight: number, lastHour: number) {
  const day = berlinDayKey(now);
  const minutes = wallMinutes(now);
  if (!weekDays.includes(day) || minutes < WEEK_FIRST_HOUR * 60 || minutes >= lastHour * 60) return null;
  return { day, top: ((minutes - WEEK_FIRST_HOUR * 60) / 60) * hourHeight, label: formatTime(now) };
}
