import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ScheduleEntry } from '../types';
import { formatDayLong, parseYmdKey } from '../lib/berlinTime';
import { timeLabel } from './CourseView';
import { scheduleModuleKey } from '../schedule/modules';
import { ENTRY_TYPE_LABEL } from './EntryCard';

interface Props {
  day: string;
  entries: ScheduleEntry[];
  onClose: () => void;
  onOpenDay: (day: string) => void;
  scope?: 'selection' | 'day';
  onToggleModule?: (moduleKey: string) => void;
  hiddenModuleKeys?: Set<string>;
}

export function WeekEventSheet({ day, entries, onClose, onOpenDay, scope = 'selection', onToggleModule, hiddenModuleKeys }: Props) {
  const sortedEntries = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime());
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const drag = useRef<{ y: number; pointerId: number } | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = document.getElementById('root');
    const wasInert = root?.inert ?? false;
    if (root) root.inert = true;
    closeRef.current?.focus({ preventScroll: true });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
      }
      if (event.key !== 'Tab') return;
      const buttons = dialogRef.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      if (root) root.inert = wasInert;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);

  return createPortal(
    <div className="weekdetails-backdrop" onClick={() => onClose()}>
      <section
        ref={dialogRef}
        className="weekdetails"
        role="dialog"
        aria-modal="true"
        aria-labelledby="weekdetails-title"
        style={{ transform: `translateY(${offset}px)` }}
        onClick={(event) => event.stopPropagation()}
      >
        <header
          className="weekdetails__header"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest('button') || !event.isPrimary) return;
            drag.current = { y: event.clientY, pointerId: event.pointerId };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current?.pointerId === event.pointerId) setOffset(Math.max(0, event.clientY - drag.current.y));
          }}
          onPointerUp={(event) => {
            if (drag.current?.pointerId !== event.pointerId) return;
            const distance = event.clientY - drag.current.y;
            drag.current = null;
            if (distance >= 60) onClose();
            else setOffset(0);
          }}
          onPointerCancel={() => { drag.current = null; setOffset(0); }}
        >
          <span className="weekdetails__handle" aria-hidden="true" />
          <div className="weekdetails__heading">
            <div>
              <h2 id="weekdetails-title">{scope === 'day' ? 'Termine des Tages' : entries.length > 1 ? `${entries.length} überschneidende Termine` : 'Termindetails'}</h2>
              <p>{formatDayLong(parseYmdKey(day))}</p>
            </div>
            <button ref={closeRef} type="button" className="weekdetails__close" aria-label="Details schließen" onClick={onClose}>×</button>
          </div>
        </header>
        <div className="weekdetails__content">
          {entries.length === 0 && <p>An diesem Tag sind keine Termine.</p>}
          {sortedEntries.map((entry, index) => (
            <article key={index} className={`weekdetails__entry weekdetails__entry--${entry.type}`}>
              <p className="weekdetails__time">{timeLabel(entry)}{ENTRY_TYPE_LABEL[entry.type] && ` · ${ENTRY_TYPE_LABEL[entry.type]}`}</p>
              <h3>{entry.title}</h3>
              {entry.rooms.length > 0 && <p>Raum: {entry.rooms.join(', ')}</p>}
              {entry.lecturers.length > 0 && <p>{entry.lecturers.join(', ')}</p>}
              {entry.course && <p>Kurs: {entry.course}</p>}
              {entry.extra && <p>{entry.extra}</p>}
              {onToggleModule && entry.course?.trim() && entry.type !== 'holiday' && <button
                type="button" className="weekdetails__module-action"
                aria-label={`${hiddenModuleKeys?.has(scheduleModuleKey(entry)) ? 'Modul einblenden' : 'Modul ausblenden'}: ${entry.title}`}
                onClick={() => { onClose(); onToggleModule(scheduleModuleKey(entry)); }}>
                {hiddenModuleKeys?.has(scheduleModuleKey(entry)) ? 'Modul einblenden' : 'Modul ausblenden'}
              </button>}
            </article>
          ))}
        </div>
        <footer className="weekdetails__footer">
          <button type="button" onClick={() => onOpenDay(day)}>→ Tagesansicht</button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
