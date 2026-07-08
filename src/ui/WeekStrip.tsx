/**
 * Schmale Wochenleiste: Mo–Fr immer, Wochenende nur bei Rapla-Terminen.
 * Pfeile wechseln weiter wochenweise. Mehr Navigation gibt es bewusst nicht.
 */

import { addDaysYmd, parseYmdKey, ymdKey } from '../lib/berlinTime';

const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  /** Montag der angezeigten Woche (ymdKey). */
  monday: string;
  selected: string;
  today: string;
  /** Tage (ymdKey) mit mindestens einem Termin. */
  busyDays: Set<string>;
  onSelect: (day: string) => void;
  onWeekChange: (monday: string) => void;
}

export function WeekStrip({ monday, selected, today, busyDays, onSelect, onWeekChange }: Props) {
  const mondayYmd = parseYmdKey(monday);
  const days = Array.from({ length: 7 }, (_, i) => ({
    key: ymdKey(addDaysYmd(mondayYmd, i)),
    weekdayIndex: i,
  })).filter(({ key, weekdayIndex }) => weekdayIndex < 5 || busyDays.has(key));

  const shiftWeek = (delta: number) => onWeekChange(ymdKey(addDaysYmd(mondayYmd, delta * 7)));

  return (
    <nav className="weekstrip">
      <button className="weekstrip__arrow" aria-label="Vorherige Woche" onClick={() => shiftWeek(-1)}>
        ‹
      </button>
      {days.map(({ key: day, weekdayIndex }) => {
        const num = parseYmdKey(day).d;
        const cls = [
          'weekstrip__day',
          day === selected && 'is-selected',
          day === today && 'is-today',
        ]
          .filter(Boolean)
          .join(' ');
        return (
          <button key={day} className={cls} onClick={() => onSelect(day)}>
            <span className="weekstrip__wd">{WEEKDAY_SHORT[weekdayIndex]}</span>
            <span className="weekstrip__num">{num}</span>
            <span className={`weekstrip__dot${busyDays.has(day) ? ' is-busy' : ''}`} />
          </button>
        );
      })}
      <button className="weekstrip__arrow" aria-label="Nächste Woche" onClick={() => shiftWeek(1)}>
        ›
      </button>
    </nav>
  );
}
