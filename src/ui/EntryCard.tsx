import { useRef } from 'react';
import { ScheduleEntry } from '../types';
import { formatTime, isDeadlineOrAllDay } from '../lib/berlinTime';
import { scheduleModuleKey } from '../schedule/modules';
import { selectionHaptic } from '../lib/haptics';

const TYPE_LABEL: Partial<Record<ScheduleEntry['type'], string>> = {
  exam: 'Prüfung',
  online: 'Online',
  holiday: 'Feiertag',
};

interface Props {
  entry: ScheduleEntry;
  hidden?: boolean;
  onSelect?: (entry: ScheduleEntry) => void;
  onToggleModule?: (moduleKey: string) => void;
}

export function EntryCard({ entry, hidden, onSelect, onToggleModule }: Props) {
  const isDeadline = isDeadlineOrAllDay(entry);
  const isPointInTime = entry.start.getTime() === entry.end.getTime();
  const isFullDay = (entry.end.getTime() - entry.start.getTime()) >= 23 * 3600 * 1000;
  const badge = isDeadline ? 'Deadline' : TYPE_LABEL[entry.type];
  const lecturers = entry.lecturers.join(', ');
  const timerRef = useRef<number | null>(null);

  const endTimeText = isPointInTime
    ? ''
    : isFullDay
    ? 'Ganztägig'
    : formatTime(entry.end);

  const startLongPress = () => {
    if (!onToggleModule) return;
    timerRef.current = window.setTimeout(() => {
      selectionHaptic();
      onToggleModule(scheduleModuleKey(entry));
    }, 450);
  };

  const cancelLongPress = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const content = (
    <>
      <div className="entry__time">
        <span className="entry__start">{formatTime(entry.start)}</span>
        {endTimeText && <span className="entry__end">{endTimeText}</span>}
      </div>
      <div className="entry__main">
        <h3 className="entry__title">
          {entry.title}
          {badge && <span className="entry__badge">{badge}</span>}
          {hidden && <span className="entry__badge" style={{ background: 'var(--border-color, rgba(255,255,255,0.2))' }}>Ausgeblendet</span>}
        </h3>
        {lecturers && <p className="entry__lecturers">{lecturers}</p>}
        {entry.rooms.length > 0 && <p className="entry__meta">{entry.rooms.join(', ')}</p>}
        {entry.extra && <p className="entry__meta">{entry.extra}</p>}
      </div>
    </>
  );

  const cardStyle = hidden ? { opacity: 0.55, filter: 'grayscale(0.3)' } : undefined;

  if (onSelect) {
    return (
      <button
        type="button"
        className={`entry entry--${entry.type} entry--button${hidden ? ' is-hidden-module' : ''}`}
        style={cardStyle}
        onClick={() => onSelect(entry)}
        onTouchStart={startLongPress}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        onMouseDown={startLongPress}
        onMouseUp={cancelLongPress}
        onMouseLeave={cancelLongPress}
        aria-label={`${entry.title} öffnen${hidden ? ' (ausgeblendet)' : ''}`}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={`entry entry--${entry.type}${hidden ? ' is-hidden-module' : ''}`} style={cardStyle}>
      {content}
    </article>
  );
}
