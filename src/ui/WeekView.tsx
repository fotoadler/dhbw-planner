import { useLayoutEffect, useRef } from 'react';
import { ScheduleEntry } from '../types';
import { berlinParts, effectiveEndMs, formatTime, isDeadlineOrAllDay, parseYmdKey } from '../lib/berlinTime';
import { scheduleModuleKey } from '../schedule/modules';
import { selectionHaptic } from '../lib/haptics';

const SWIPE_THRESHOLD = 60;
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  /** Die 7 Tage (ymdKeys) der angezeigten Woche, Mo–So. */
  weekDays: string[];
  entriesByDay: Record<string, ScheduleEntry[]>;
  today: string;
  hourHeight?: number;
  hiddenModuleKeys?: Set<string>;
  onToggleModule?: (moduleKey: string) => void;
  onHourHeightChange?: (newHeight: number) => void;
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
  clusterId: number;
}

/** Überlappende Termine nebeneinander legen (greedy Lane-Zuweisung pro Cluster). */
function layoutDay(entries: ScheduleEntry[]): Positioned[] {
  const sorted = [...entries].sort((a, b) => {
    const startDiff = a.start.getTime() - b.start.getTime();
    if (startDiff !== 0) return startDiff;
    return effectiveEndMs(a) - effectiveEndMs(b);
  });
  const result: Positioned[] = [];
  let cluster: Positioned[] = [];
  let laneEnds: number[] = []; // Ende (ms) des letzten Termins je Lane
  let clusterEnd = -Infinity;
  let clusterId = -1;

  const flush = () => {
    for (const p of cluster) p.laneCount = laneEnds.length;
    result.push(...cluster);
    cluster = [];
    laneEnds = [];
  };

  for (const entry of sorted) {
    const endMs = effectiveEndMs(entry);
    if (entry.start.getTime() >= clusterEnd) {
      flush();
      clusterId += 1;
    }
    let lane = laneEnds.findIndex((end) => end <= entry.start.getTime());
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = endMs;
    cluster.push({ entry, lane, laneCount: 1, clusterId });
    clusterEnd = Math.max(clusterEnd, endMs);
  }
  flush();
  return result;
}

function groupPositionedEntries(positioned: Positioned[]): Positioned[][] {
  const groups = new Map<number, Positioned[]>();
  for (const item of positioned) {
    const group = groups.get(item.clusterId) ?? [];
    group.push(item);
    groups.set(item.clusterId, group);
  }
  return [...groups.values()];
}

export function weekTitleLineCapacity(
  cardHeight: number,
  fixedContentHeight: number,
  paddingHeight: number,
  gapHeight: number,
  lineHeight: number,
): number {
  if (lineHeight <= 0) return 1;
  return Math.max(
    1,
    Math.floor((cardHeight - fixedContentHeight - paddingHeight - gapHeight) / lineHeight),
  );
}

/**
 * WebKit kann mehrzeiligen Text nur mit einer konkreten Zeilenzahl mit
 * Ellipse abschneiden. Diese Komponente ermittelt sie aus dem realen Platz in
 * der Karte, damit weder Smartphone-Breite noch Dozentenzeilen geschätzt
 * werden müssen.
 */
function AdaptiveEventTitle({ children }: { children: string }) {
  const titleRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const title = titleRef.current;
    const card = title?.closest<HTMLElement>('.weekview__event');
    if (!title || !card) return;

    const fixedChildren = [...card.children].filter((child) => child !== title) as HTMLElement[];
    const updateLineCapacity = () => {
      const cardStyle = getComputedStyle(card);
      const titleStyle = getComputedStyle(title);
      const paddingHeight =
        (Number.parseFloat(cardStyle.paddingTop) || 0) +
        (Number.parseFloat(cardStyle.paddingBottom) || 0);
      const rowGap = Number.parseFloat(cardStyle.rowGap || cardStyle.gap) || 0;
      const gapHeight = rowGap * Math.max(0, card.children.length - 1);
      const fixedContentHeight = fixedChildren.reduce(
        (height, child) => height + child.getBoundingClientRect().height,
        0,
      );
      const lineHeight = Number.parseFloat(titleStyle.lineHeight) || 15;
      const lines = weekTitleLineCapacity(
        card.clientHeight,
        fixedContentHeight,
        paddingHeight,
        gapHeight,
        lineHeight,
      );
      title.style.setProperty('--weekview-title-lines', String(lines));
    };

    updateLineCapacity();
    window.addEventListener('resize', updateLineCapacity);
    const resizeObserver =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateLineCapacity);
    resizeObserver?.observe(card);
    fixedChildren.forEach((child) => resizeObserver?.observe(child));

    return () => {
      window.removeEventListener('resize', updateLineCapacity);
      resizeObserver?.disconnect();
    };
  }, [children]);

  return (
    <span ref={titleRef} className="weekview__etitle">
      {children}
    </span>
  );
}

export function WeekView({
  weekDays,
  entriesByDay,
  today,
  hourHeight = 64,
  hiddenModuleKeys,
  onToggleModule,
  onHourHeightChange,
  onOpenDay,
  onSwipeWeek,
}: Props) {
  const hourPx = hourHeight;
  const touch = useRef<{ x: number; y: number } | null>(null);
  const initialPinchDist = useRef<number | null>(null);
  const initialHourHeight = useRef<number>(hourPx);
  const longPressTimer = useRef<number | null>(null);

  // Wochenende nur einblenden, wenn dort tatsächlich Termine liegen
  // (gleiche Regel wie in der Wochenleiste der Tagesansicht).
  const days = weekDays
    .map((key, weekdayIndex) => ({ key, weekdayIndex }))
    .filter(({ key, weekdayIndex }) => weekdayIndex < 5 || (entriesByDay[key]?.length ?? 0) > 0);
  const dayLayouts = days.map(({ key }) => ({ key, positioned: layoutDay(entriesByDay[key] ?? []) }));
  const gridColumns = `44px repeat(${days.length}, minmax(0, 1fr))`;

  // Stundenbereich: Standard 08–18 Uhr, bei früheren/späteren Terminen erweitern.
  let firstHour = 8;
  let lastHour = 18;
  for (const { key: day } of days) {
    for (const e of entriesByDay[day] ?? []) {
      firstHour = Math.min(firstHour, Math.floor(minutesOfDay(e.start) / 60));
      lastHour = Math.max(lastHour, Math.ceil(minutesOfDay(e.end) / 60));
    }
  }
  // Eine abschließende Rasterstunde hält die letzte horizontale Linie sichtbar,
  // auch wenn ein Termin genau auf einer vollen Stunde endet.
  const displayLastHour = lastHour + 1;
  const hours = Array.from({ length: displayLastHour - firstHour }, (_, i) => firstHour + i);

  const startLongPress = (entry: ScheduleEntry) => {
    if (!onToggleModule) return;
    longPressTimer.current = window.setTimeout(() => {
      selectionHaptic();
      onToggleModule(scheduleModuleKey(entry));
    }, 450);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.abs(e.touches[0].clientY - e.touches[1].clientY);
      initialPinchDist.current = d;
      initialHourHeight.current = hourPx;
    } else if (e.touches.length === 1) {
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist.current !== null && onHourHeightChange) {
      const d = Math.abs(e.touches[0].clientY - e.touches[1].clientY);
      const scale = d / Math.max(1, initialPinchDist.current);
      const nextHeight = Math.min(120, Math.max(40, Math.round(initialHourHeight.current * scale)));
      onHourHeightChange(nextHeight);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    initialPinchDist.current = null;
    if (!touch.current) return;
    if (e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touch.current.x;
      const dy = e.changedTouches[0].clientY - touch.current.y;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        onSwipeWeek(dx < 0 ? 1 : -1);
      }
    }
    touch.current = null;
  };

  return (
    <div className="weekview" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div className="weekview__header" style={{ gridTemplateColumns: gridColumns }}>
        <div className="weekview__gutter">
          <button
            className="weekview__arrow"
            aria-label="Vorherige Woche"
            onClick={() => onSwipeWeek(-1)}
          >
            ‹
          </button>
          <button
            className="weekview__arrow"
            aria-label="Nächste Woche"
            onClick={() => onSwipeWeek(1)}
          >
            ›
          </button>
        </div>
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
        <div
          className="weekview__grid"
          style={{ height: hours.length * hourPx, gridTemplateColumns: gridColumns }}
        >
          <div className="weekview__times">
            {hours.map((h) => (
              <span key={h} className="weekview__hour" style={{ top: (h - firstHour) * hourPx }}>
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {dayLayouts.map(({ key: day, positioned }) => (
            <div key={day} className={`weekview__col${day === today ? ' is-today' : ''}`}>
              {groupPositionedEntries(positioned).map((cluster, clusterIndex) => {
                if (cluster.length > 1) {
                  const start = new Date(Math.min(...cluster.map(({ entry }) => entry.start.getTime())));
                  const end = new Date(Math.max(...cluster.map(({ entry }) => effectiveEndMs(entry))));
                  const top = ((minutesOfDay(start) - firstHour * 60) / 60) * hourPx;
                  const height = Math.max(40, ((end.getTime() - start.getTime()) / 3_600_000) * hourPx);
                  const titles = cluster.map(({ entry }) => entry.title);
                  return (
                    <button
                      key={`parallel-${clusterIndex}`}
                      className="weekview__event weekview__event--parallel-group"
                      style={{ top, height, left: '2px', width: 'calc(100% - 4px)' }}
                      onClick={() => onOpenDay(day)}
                      aria-label={`${cluster.length} parallele Termine: ${titles.join(', ')}`}
                    >
                      <span className="weekview__parallel-summary">
                        <span className="weekview__parallel-count">{cluster.length}</span>
                        <span className="weekview__parallel-label">Termine</span>
                      </span>
                      <span className="weekview__parallel-time">ab {formatTime(start)}</span>
                      <span className="weekview__parallel-items">
                        {titles.map((title, index) => (
                          <span key={`${title}-${index}`} className="weekview__parallel-item">{title}</span>
                        ))}
                      </span>
                    </button>
                  );
                }

                const [{ entry, laneCount }] = cluster;
                const top = ((minutesOfDay(entry.start) - firstHour * 60) / 60) * hourPx;
                const endMs = effectiveEndMs(entry);
                const rawDurationHours = (endMs - entry.start.getTime()) / 3_600_000;
                const isDeadline = isDeadlineOrAllDay(entry);
                const height = Math.max(
                  28,
                  Math.min(isDeadline ? 36 : Infinity, rawDurationHours * hourPx),
                );
                const lecturers = entry.lecturers.join(', ');
                const isCompact = height < 52;
                const isHidden = hiddenModuleKeys?.has(scheduleModuleKey(entry));
                const showLecturers = Boolean(lecturers) && height >= 176 && laneCount < 3;
                return (
                  <button
                    key={`event-${clusterIndex}`}
                    className={[
                      'weekview__event',
                      `weekview__event--${entry.type}`,
                      showLecturers ? 'has-lecturers' : '',
                      isCompact ? 'is-compact' : '',
                      isHidden ? 'is-hidden-module' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      top,
                      height,
                      left: '2px',
                      width: 'calc(100% - 4px)',
                      ...(isHidden ? { opacity: 0.55, filter: 'grayscale(0.3)' } : {}),
                    }}
                    onClick={() => onOpenDay(day)}
                    onTouchStart={() => startLongPress(entry)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onMouseDown={() => startLongPress(entry)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    aria-label={`${entry.title}, ${formatTime(entry.start)} bis ${formatTime(entry.end)}${lecturers ? `, ${lecturers}` : ''}${isHidden ? ' (ausgeblendetes Modul)' : ''}`}
                  >
                    <span className="weekview__etime">{formatTime(entry.start)}</span>
                    <AdaptiveEventTitle>
                      {(isHidden ? '[Ausgeblendet] ' : '') + entry.title + (lecturers && isCompact && laneCount < 3 ? ` · ${lecturers}` : '')}
                    </AdaptiveEventTitle>
                    {showLecturers && <span className="weekview__emeta">{lecturers}</span>}
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
