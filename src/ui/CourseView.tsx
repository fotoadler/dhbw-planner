import { useRef } from 'react';
import { ScheduleEntry } from '../types';
import { berlinDayKey, berlinParts, formatTime, isDeadlineOrAllDay } from '../lib/berlinTime';
import { ENTRY_TYPE_LABEL } from './EntryCard';

const SWIPE_BACK_THRESHOLD = 60;

const weekdayFmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short' });
const dayMonthFmt = new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit' });
const dayMonthYearFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
});

function isPast(entry: ScheduleEntry, now: Date): boolean {
  return entry.end.getTime() < now.getTime();
}

/**
 * Zeitspanne des Termins. Alle Einträge einer Reihe tragen denselben Titel –
 * der steht in der Kopfzeile –, deshalb ist die Uhrzeit hier die Hauptzeile.
 * Sie ist immer vorhanden, während Dozent und Raum bei vielen Kursen fehlen.
 */
export function timeLabel(entry: ScheduleEntry): string {
  if (entry.start.getTime() === entry.end.getTime()) return formatTime(entry.start);
  if (isDeadlineOrAllDay(entry)) return 'Ganztägig';
  return `${formatTime(entry.start)}–${formatTime(entry.end)}`;
}

/**
 * Datumsspalte einer Zeile. Der Wochentag wird für heute durch „Heute“ ersetzt,
 * die Datumszeile bleibt aber bestehen – sonst springen die Zeilenhöhen. Das
 * Jahr steht nur dort, wo es nicht das laufende ist; ein Kursplan reicht über
 * mehrere Jahrgänge zurück.
 */
export function courseDateLabel(
  start: Date,
  today: string,
  currentYear: number,
): { weekday: string; day: string; isToday: boolean } {
  const isToday = berlinDayKey(start) === today;
  const sameYear = berlinParts(start).y === currentYear;
  return {
    weekday: isToday ? 'Heute' : weekdayFmt.format(start),
    day: (sameYear ? dayMonthFmt : dayMonthYearFmt).format(start),
    isToday,
  };
}

interface Props {
  entries: ScheduleEntry[];
  today: string;
  onOpenDay: (day: string) => void;
  onBack: () => void;
}

export function CourseView({ entries, today, onOpenDay, onBack }: Props) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const didSwipeBack = useRef(false);
  const now = new Date();
  const currentYear = berlinParts(now).y;
  const upcoming = entries.filter((entry) => !isPast(entry, now));
  // Absteigend, damit der zuletzt vergangene Termin oben steht.
  const past = entries.filter((entry) => isPast(entry, now)).reverse();

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;
    if (dx > SWIPE_BACK_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      // Die Wischgeste startet auf einer Zeile; der Folge-Click darf danach
      // nicht noch den Tag öffnen.
      didSwipeBack.current = true;
      onBack();
    }
    touch.current = null;
  };

  const renderEntries = (items: ScheduleEntry[]) =>
    items.map((entry, i) => {
      const dayKey = berlinDayKey(entry.start);
      const { weekday, day, isToday } = courseDateLabel(entry.start, today, currentYear);
      const badge = isDeadlineOrAllDay(entry) ? 'Deadline' : ENTRY_TYPE_LABEL[entry.type];
      const meta = [entry.lecturers.join(', '), entry.rooms.join(', '), entry.extra]
        .filter((value): value is string => Boolean(value))
        .join(' · ');
      return (
        <button
          type="button"
          className={`courseitem courseitem--${entry.type}`}
          key={`${entry.start.toISOString()}-${i}`}
          onClick={() => {
            if (didSwipeBack.current) {
              didSwipeBack.current = false;
              return;
            }
            onOpenDay(dayKey);
          }}
          aria-label={`${entry.title}, ${isToday ? 'heute' : dayKey}, ${timeLabel(entry)} – Tag öffnen`}
        >
          {/* Wochentag und Datum stehen immer beide da, auch heute: sonst
              springen die Zeilenhöhen innerhalb der Liste. */}
          <span className="courseitem__date">
            <span className={`courseitem__weekday${isToday ? ' is-today' : ''}`}>{weekday}</span>
            <span className="courseitem__day">{day}</span>
          </span>
          <span className="courseitem__main">
            <span className="courseitem__time">
              {timeLabel(entry)}
              {badge && <span className="courseitem__badge">{badge}</span>}
            </span>
            {meta && <span className="courseitem__meta">{meta}</span>}
          </span>
          <span className="courseitem__chevron" aria-hidden="true">
            ›
          </span>
        </button>
      );
    });

  return (
    <main className="courseview" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {upcoming.length > 0 && (
        <section className="coursesection" aria-labelledby="course-upcoming">
          <h2 id="course-upcoming" className="coursesection__title">
            Kommend
          </h2>
          {renderEntries(upcoming)}
        </section>
      )}
      {past.length > 0 && (
        <section className="coursesection" aria-labelledby="course-past">
          <h2 id="course-past" className="coursesection__title">
            Vergangen
          </h2>
          {renderEntries(past)}
        </section>
      )}
    </main>
  );
}
