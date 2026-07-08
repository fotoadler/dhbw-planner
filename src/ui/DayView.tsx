/**
 * Tagesansicht — die Standardansicht der App.
 *
 * Gesten: horizontales Wischen wechselt den Tag, Ziehen nach unten am oberen
 * Rand löst Pull-to-Refresh aus. Beides bewusst schlicht implementiert,
 * ohne zusätzliche Gesten-Bibliothek.
 */

import { useRef, useState } from 'react';
import { ScheduleEntry } from '../types';
import { EntryCard } from './EntryCard';

const SWIPE_THRESHOLD = 60;
const PULL_THRESHOLD = 70;

interface Props {
  entries: ScheduleEntry[];
  onSelectEntry: (entry: ScheduleEntry) => void;
  onSwipeDay: (delta: 1 | -1) => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

export function DayView({ entries, onSelectEntry, onSwipeDay, onRefresh, refreshing }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; pulling: boolean } | null>(null);
  const [pull, setPull] = useState(0);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, pulling: (scrollRef.current?.scrollTop ?? 0) <= 0 };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.touches[0];
    const dy = t.clientY - touch.current.y;
    const dx = t.clientX - touch.current.x;
    if (touch.current.pulling && dy > 0 && Math.abs(dy) > Math.abs(dx) && !refreshing) {
      setPull(Math.min(dy * 0.4, 90)); // gedämpfter Zug
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.current.x;
    const dy = t.clientY - touch.current.y;

    if (pull >= PULL_THRESHOLD * 0.4) {
      // Schwelle (in gedämpften Pixeln) erreicht → Refresh
      void onRefresh();
    } else if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onSwipeDay(dx < 0 ? 1 : -1);
    }
    setPull(0);
    touch.current = null;
  };

  return (
    <div
      className="dayview"
      ref={scrollRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={`dayview__pull${refreshing ? ' is-refreshing' : ''}`}
        style={{ height: refreshing ? 36 : pull }}
      >
        <span className="spinner" />
      </div>
      {entries.length === 0 ? (
        <p className="dayview__empty">Keine Termine — freier Tag.</p>
      ) : (
        entries.map((e, i) => (
          <EntryCard key={`${e.start.toISOString()}-${i}`} entry={e} onSelect={onSelectEntry} />
        ))
      )}
    </div>
  );
}
