import { useEffect, useRef } from 'react';
import type { ScheduleEntry } from '../types';
import { formatDayLong, parseYmdKey } from '../lib/berlinTime';
import { timeLabel } from './CourseView';
import { monthDays } from './monthLayout';

interface Props {
  selectedDay: string;
  today: string;
  entriesByDay: Record<string, ScheduleEntry[]>;
  onSelectDay: (day: string) => void;
  onShiftMonth: (delta: 1 | -1) => void;
}

export function MonthView({ selectedDay, today, entriesByDay, onSelectDay, onShiftMonth }: Props) {
  const gridRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ x: number; y: number; axis: 'horizontal' | 'vertical' | null } | null>(null);
  const suppressTap = useRef(false);
  const shiftRef = useRef(onShiftMonth);
  shiftRef.current = onShiftMonth;

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const start = (event: TouchEvent) => {
      suppressTap.current = event.touches.length !== 1;
      gesture.current = event.touches.length === 1
        ? { x: event.touches[0].clientX, y: event.touches[0].clientY, axis: null }
        : null;
    };
    const move = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        gesture.current = null;
        suppressTap.current = true;
        return;
      }
      const current = gesture.current;
      if (!current) return;
      const dx = event.touches[0].clientX - current.x;
      const dy = event.touches[0].clientY - current.y;
      if (!current.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
        current.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        suppressTap.current = true;
      }
      if (current.axis === 'horizontal' && event.cancelable) event.preventDefault();
    };
    const end = (event: TouchEvent) => {
      const current = gesture.current;
      gesture.current = null;
      if (!current || event.touches.length || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - current.x;
      const dy = event.changedTouches[0].clientY - current.y;
      if (current.axis === 'horizontal' && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        shiftRef.current(dx < 0 ? 1 : -1);
      }
    };
    const cancel = () => { gesture.current = null; suppressTap.current = true; };
    grid.addEventListener('touchstart', start, { passive: true });
    grid.addEventListener('touchmove', move, { passive: false });
    grid.addEventListener('touchend', end);
    grid.addEventListener('touchcancel', cancel);
    return () => {
      grid.removeEventListener('touchstart', start);
      grid.removeEventListener('touchmove', move);
      grid.removeEventListener('touchend', end);
      grid.removeEventListener('touchcancel', cancel);
    };
  }, []);

  const month = selectedDay.slice(0, 7);
  const days = monthDays(selectedDay);
  return (
    <section className="monthview" aria-label="Monatsansicht">
      <nav className="monthview__navigation" aria-label="Monat wechseln">
        <button type="button" onClick={() => onShiftMonth(-1)} aria-label="Vorheriger Monat">‹</button>
        <button type="button" onClick={() => onShiftMonth(1)} aria-label="Nächster Monat">›</button>
      </nav>
      <div className="monthview__weekdays" aria-hidden="true">
        {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div ref={gridRef} className="monthview__grid" onClickCapture={(event) => {
        // Swiping must not open the day under the finger; keyboard activation remains available.
        if (suppressTap.current && event.detail !== 0) {
          event.preventDefault(); event.stopPropagation(); suppressTap.current = false;
        }
      }} style={{ gridTemplateRows: `repeat(${days.length / 7}, minmax(88px, 1fr))` }}>
        {days.map((day) => {
          const entries = [...(entriesByDay[day] ?? [])].sort((a, b) => a.start.getTime() - b.start.getTime());
          const date = formatDayLong(parseYmdKey(day));
          return (
            <button key={day} type="button" data-day={day}
              className={['monthview__day', day.slice(0, 7) !== month && 'is-outside', day === today && 'is-today', day === selectedDay && 'is-selected'].filter(Boolean).join(' ')}
              onClick={() => onSelectDay(day)}
              aria-current={day === today ? 'date' : undefined}
              aria-label={`${date}, ${entries.length === 0 ? 'keine Termine' : `${entries.length} ${entries.length === 1 ? 'Termin' : 'Termine'}`}${day === today ? ', heute' : ''}`}>
              <span className="monthview__number" aria-hidden="true">{parseYmdKey(day).d}</span>
              <span className="monthview__entries" aria-hidden="true">
                {entries.slice(0, 2).map((entry, index) => (
                  <span key={index} className={`monthview__entry${entry.type === 'exam' ? ' is-exam' : ''}`}>
                    <span>{timeLabel(entry)}</span><span>{entry.title}</span>
                  </span>
                ))}
                {entries.length > 2 && <span className="monthview__more">+{entries.length - 2} weitere</span>}
              </span>
              {entries.length > 0 && <span className="monthview__compact" aria-hidden="true">
                <span className="monthview__dots">{entries.slice(0, 3).map((entry, index) => <i key={index} className={entry.type === 'exam' ? 'is-exam' : ''} />)}</span>
                <span>{entries.length} {entries.length === 1 ? 'Termin' : 'Termine'}</span>
              </span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
