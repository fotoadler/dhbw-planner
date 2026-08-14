/**
 * Ein Termin als ruhige Karte: klare Typografie-Hierarchie statt Tabellen-Wall —
 * Uhrzeit, Titel, Dozent, Raum klar gestaffelt.
 */

import { ScheduleEntry } from '../types';
import { formatTime } from '../lib/berlinTime';

const TYPE_LABEL: Partial<Record<ScheduleEntry['type'], string>> = {
  exam: 'Prüfung',
  online: 'Online',
  holiday: 'Feiertag',
};

interface Props {
  entry: ScheduleEntry;
  onSelect?: (entry: ScheduleEntry) => void;
}

export function EntryCard({ entry, onSelect }: Props) {
  const badge = TYPE_LABEL[entry.type];
  const lecturers = entry.lecturers.join(', ');
  const content = (
    <>
      <div className="entry__time">
        <span className="entry__start">{formatTime(entry.start)}</span>
        <span className="entry__end">{formatTime(entry.end)}</span>
      </div>
      <div className="entry__main">
        <h3 className="entry__title">
          {entry.title}
          {badge && <span className="entry__badge">{badge}</span>}
        </h3>
        {lecturers && <p className="entry__lecturers">{lecturers}</p>}
        {entry.rooms.length > 0 && <p className="entry__meta">{entry.rooms.join(', ')}</p>}
        {entry.extra && <p className="entry__meta">{entry.extra}</p>}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        className={`entry entry--${entry.type} entry--button`}
        onClick={() => onSelect(entry)}
        aria-label={`${entry.title} öffnen`}
      >
        {content}
      </button>
    );
  }

  return (
    <article className={`entry entry--${entry.type}`}>
      {content}
    </article>
  );
}
