/**
 * Tagesansicht — die Standardansicht der App.
 *
 * Gesten: horizontales Wischen wechselt den Tag, Ziehen nach unten am oberen
 * Rand löst Pull-to-Refresh aus. Beides bewusst schlicht implementiert,
 * ohne zusätzliche Gesten-Bibliothek.
 */

import { useRef, useState } from 'react';
import { ScheduleEntry } from '../types';
import { parseYmdKey } from '../lib/berlinTime';
import type { DiningLoadStatus, DiningSnapshot } from '../mensa/model';
import type { DiningSiteProfile } from '../mensa/sites';
import { scheduleModuleKey } from '../schedule/modules';
import { EntryCard } from './EntryCard';
import { MensaSection } from './MensaSection';

const SWIPE_THRESHOLD = 60;
const PULL_THRESHOLD = 70;

interface Props {
  entries: ScheduleEntry[];
  hiddenModuleKeys?: Set<string>;
  onToggleModule?: (moduleKey: string) => void;
  dining: {
    profile: DiningSiteProfile;
    snapshot: DiningSnapshot | null;
    status: DiningLoadStatus;
    error: string | null;
    selectedDay: string;
    /** Studienstandort; entscheidet ueber den Wechsel des Essensstandorts. */
    homeSite?: string;
    onSelectSite?: (site: string) => void;
  } | null;
  onSelectEntry: (entry: ScheduleEntry) => void;
  onSwipeDay: (delta: 1 | -1) => void;
  selectedDay: string;
  onShowNextWeek: () => void;
  onRefresh: () => Promise<void>;
  refreshing: boolean;
}

export function DayView({
  entries,
  hiddenModuleKeys,
  onToggleModule,
  dining,
  onSelectEntry,
  onSwipeDay,
  selectedDay,
  onShowNextWeek,
  onRefresh,
  refreshing,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; pulling: boolean; axis: 'horizontal' | 'vertical' | null } | null>(null);
  const [pull, setPull] = useState(0);
  const { y, m, d } = parseYmdKey(selectedDay);
  const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
  const isWeekendWithoutLectures = entries.length === 0 && (weekday === 0 || weekday === 6);
  const weekendDayName = weekday === 6 ? 'Samstag' : 'Sonntag';

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touch.current = {
      x: t.clientX,
      y: t.clientY,
      pulling: (scrollRef.current?.scrollTop ?? 0) <= 0,
      axis: null,
    };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const t = e.touches[0];
    const dy = t.clientY - touch.current.y;
    const dx = t.clientX - touch.current.x;
    if (!touch.current.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
      touch.current.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
    }
    if (touch.current.axis === 'horizontal') {
      // Der horizontale Swipe darf keinen vertikalen Scroll-Impuls an den
      // nativen Scroll-Container weitergeben.
      e.preventDefault();
      return;
    }
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
    } else if (touch.current.axis === 'horizontal' && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
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
        isWeekendWithoutLectures ? (
          <div className="dayview__weekend-state" role="status">
            <p className="dayview__weekend-note">
              Wochenendtage ohne Termine werden in der Leiste ausgeblendet.
            </p>
            <div className="dayview__weekend-empty">
              <h2>Freier {weekendDayName}</h2>
              <p>Für heute sind keine Vorlesungen geplant.</p>
              <button type="button" className="dayview__next-week" onClick={onShowNextWeek}>
                Nächste Woche anzeigen
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="dayview__empty">Keine Termine — freier Tag.</p>
        )
      ) : (
        entries.map((e, i) => (
          <EntryCard
            key={`${e.start.toISOString()}-${i}`}
            entry={e}
            hidden={hiddenModuleKeys?.has(scheduleModuleKey(e))}
            onSelect={onSelectEntry}
            onToggleModule={onToggleModule}
          />
        ))
      )}
      {dining && <MensaSection {...dining} />}
    </div>
  );
}
