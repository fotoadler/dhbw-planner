/**
 * Wochenübersicht als Zeitraster (Mo–Fr, Wochenende nur bei Terminen) —
 * in der Designsprache der App: weiße Fläche, feine Linien, Karten mit
 * Akzent-Balken statt der roten Block-Optik der alten App.
 *
 * Tippen auf einen Termin oder Tageskopf öffnet die Tagesansicht;
 * horizontales Wischen wechselt die Woche.
 */

import { useRef } from 'react';
import { ScheduleEntry } from '../types';
import { berlinParts, formatTime, parseYmdKey } from '../lib/berlinTime';

// Etwas großzügiger als eine reine Tabellenansicht: Lange Kurstitel bleiben
// dadurch auch bei fünf sichtbaren Wochentagen lesbar.
const HOUR_PX = 64;
const SWIPE_THRESHOLD = 60;
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  /** Die 7 Tage (ymdKeys) der angezeigten Woche, Mo–So. */
  weekDays: string[];
  entriesByDay: Record<string, ScheduleEntry[]>;
  today: string;
  onOpenDay: (day: string) => void;
  onSwipeWeek: (delta: 1 | -1) => void;
}

/** Minuten seit Mitternacht (Berlin-Wandzeit) — Positionsbasis im Raster. */
function minutesOfDay(date: Date): number {
  const p = berlinParts(date);
  return p.hh * 60 + p.mm;
}

interface Positioned {
  entry: ScheduleEntry;
  lane: number;
  laneCount: number;
}

/** Überlappende Termine nebeneinander legen (greedy Lane-Zuweisung pro Cluster). */
function layoutDay(entries: ScheduleEntry[]): Positioned[] {
  const sorted = [...entries].sort((a, b) => a.start.getTime() - b.start.getTime());
  const result: Positioned[] = [];
  let cluster: Positioned[] = [];
  let laneEnds: number[] = []; // Ende (ms) des letzten Termins je Lane
  let clusterEnd = -Infinity;

  const flush = () => {
    for (const p of cluster) p.laneCount = laneEnds.length;
    result.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const entry of sorted) {
    if (entry.start.getTime() >= clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end <= entry.start.getTime());
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = entry.end.getTime();
    cluster.push({ entry, lane, laneCount: 1 });
    clusterEnd = Math.max(clusterEnd, entry.end.getTime());
  }
  flush();
  return result;
}

export function WeekView({ weekDays, entriesByDay, today, onOpenDay, onSwipeWeek }: Props) {
  const touch = useRef<{ x: number; y: number } | null>(null);

  // Wochenende nur einblenden, wenn dort tatsächlich Termine liegen
  // (gleiche Regel wie in der Wochenleiste der Tagesansicht).
  const days = weekDays
    .map((key, weekdayIndex) => ({ key, weekdayIndex }))
    .filter(({ key, weekdayIndex }) => weekdayIndex < 5 || (entriesByDay[key]?.length ?? 0) > 0);

  // Stundenbereich: Standard 08–18 Uhr, bei früheren/späteren Terminen erweitern.
  let firstHour = 8;
  let lastHour = 18;
  for (const { key: day } of days) {
    for (const e of entriesByDay[day] ?? []) {
      firstHour = Math.min(firstHour, Math.floor(minutesOfDay(e.start) / 60));
      lastHour = Math.max(lastHour, Math.ceil(minutesOfDay(e.end) / 60));
    }
  }
  const hours = Array.from({ length: lastHour - firstHour }, (_, i) => firstHour + i);

  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return;
    const dx = e.changedTouches[0].clientX - touch.current.x;
    const dy = e.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
      onSwipeWeek(dx < 0 ? 1 : -1);
    }
    touch.current = null;
  };

  return (
    <div className="weekview" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="weekview__header">
        <div className="weekview__gutter" />
        {days.map(({ key: day, weekdayIndex }) => {
          const ymd = parseYmdKey(day);
          return (
            <button
              key={day}
              className={`weekview__dayhead${day === today ? ' is-today' : ''}`}
              onClick={() => onOpenDay(day)}
            >
              <span className="weekview__wd">{WEEKDAY_SHORT[weekdayIndex]}</span>
              <span className="weekview__num">{ymd.d}.</span>
            </button>
          );
        })}
      </div>

      <div className="weekview__scroll">
        <div className="weekview__grid" style={{ height: hours.length * HOUR_PX }}>
          <div className="weekview__times">
            {hours.map((h) => (
              <span key={h} className="weekview__hour" style={{ top: (h - firstHour) * HOUR_PX }}>
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {days.map(({ key: day }) => (
            <div key={day} className={`weekview__col${day === today ? ' is-today' : ''}`}>
              {layoutDay(entriesByDay[day] ?? []).map(({ entry, lane, laneCount }, i) => {
                const top = ((minutesOfDay(entry.start) - firstHour * 60) / 60) * HOUR_PX;
                const height = Math.max(
                  28,
                  ((entry.end.getTime() - entry.start.getTime()) / 3_600_000) * HOUR_PX,
                );
                const lecturers = entry.lecturers.join(', ');
                const isCompact = height < 52;
                const density = height >= 176 ? 'is-roomy' : height >= 112 ? 'is-tall' : 'is-regular';
                // Der Titel ist die wichtigste Information. Namen erscheinen
                // nur dann in der Karte, wenn sie ihm keinen Leseraum nehmen.
                const showLecturers = Boolean(lecturers) && height >= 176;
                return (
                  <button
                    key={i}
                    className={[
                      'weekview__event',
                      `weekview__event--${entry.type}`,
                      showLecturers ? 'has-lecturers' : '',
                      isCompact ? 'is-compact' : '',
                      density,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      top,
                      height,
                      left: `${(lane / laneCount) * 100}%`,
                      width: `${100 / laneCount}%`,
                    }}
                    onClick={() => onOpenDay(day)}
                    aria-label={`${entry.title}, ${formatTime(entry.start)} bis ${formatTime(entry.end)}${lecturers ? `, ${lecturers}` : ''}`}
                  >
                    <span className="weekview__etime">{formatTime(entry.start)}</span>
                    <span className="weekview__etitle">
                      {entry.title}
                      {lecturers && isCompact ? ` · ${lecturers}` : ''}
                    </span>
                    {showLecturers && (
                      <span className="weekview__emeta">{lecturers}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
