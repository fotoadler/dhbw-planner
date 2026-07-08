import { useRef } from 'react';
import { ScheduleEntry } from '../types';
import { berlinDayKey, formatTime } from '../lib/berlinTime';

const SWIPE_BACK_THRESHOLD = 60;

const dateFmt = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function isPast(entry: ScheduleEntry, now: Date): boolean {
  return entry.end.getTime() < now.getTime();
}

interface Props {
  entries: ScheduleEntry[];
  today: string;
  onBack: () => void;
}

export function CourseView({ entries, today, onBack }: Props) {
  const touch = useRef<{ x: number; y: number } | null>(null);
  const now = new Date();
  const upcoming = entries.filter((entry) => !isPast(entry, now));
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
      onBack();
    }
    touch.current = null;
  };

  const renderEntries = (items: ScheduleEntry[]) =>
    items.map((entry, i) => {
      const dayKey = berlinDayKey(entry.start);
      return (
        <article className="courseitem" key={`${entry.start.toISOString()}-${i}`}>
          <div className="courseitem__date">
            <span>{dayKey === today ? 'Heute' : dateFmt.format(entry.start)}</span>
            <span>
              {formatTime(entry.start)}-{formatTime(entry.end)}
            </span>
          </div>
          <div className="courseitem__main">
            {entry.lecturers.length > 0 && (
              <p className="courseitem__lecturers">{entry.lecturers.join(', ')}</p>
            )}
            {entry.rooms.length > 0 && <p className="courseitem__meta">{entry.rooms.join(', ')}</p>}
            {entry.extra && <p className="courseitem__meta">{entry.extra}</p>}
          </div>
        </article>
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
