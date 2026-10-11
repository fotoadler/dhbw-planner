import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { ScheduleEntry } from '../types';
import { berlinDayKey, formatTime, parseYmdKey } from '../lib/berlinTime';
import { weekNowMarker } from './weekNow';
import { entryMinuteRange, isUntimedEntry, isCurrentWeekendWeek, timedGeometry, weekClusters, WEEK_FIRST_HOUR } from './weekLayout';
import { useCurrentTime } from './useCurrentTime';
import { timeLabel } from './CourseView';
import { scheduleModuleKey } from '../schedule/modules';
import { selectionHaptic } from '../lib/haptics';

const SWIPE_THRESHOLD = 60;
const WEEKDAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

interface Props {
  /** Die 7 Tage (ymdKeys) der angezeigten Woche, Mo–So. */
  weekDays: string[];
  entriesByDay: Record<string, ScheduleEntry[]>;
  today: string;
  now?: Date;
  /** Unfiltered schedule days keep weekends visible even with hidden modules. */
  scheduledDays?: Set<string>;
  hourHeight?: number;
  hiddenModuleKeys?: Set<string>;
  onToggleModule?: (moduleKey: string) => void;
  onHourHeightChange?: (newHeight: number) => void;
  onOpenDay: (day: string) => void;
  onSelectEntries: (day: string, entries: ScheduleEntry[]) => void;
  onSwipeWeek: (delta: 1 | -1) => void;
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
function AdaptiveEventTitle({ children, metadataKey }: { children: string; metadataKey: string }) {
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
  }, [children, metadataKey]);

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
  now: suppliedNow,
  scheduledDays,
  hourHeight = 64,
  hiddenModuleKeys,
  onToggleModule,
  onHourHeightChange,
  onOpenDay,
  onSelectEntries,
  onSwipeWeek,
}: Props) {
  // Während einer Pinch-Geste wird die Stundenhöhe nur lokal gehalten und erst
  // beim Loslassen gespeichert: `onHourHeightChange` schreibt in die Settings und
  // stößt dort die komplette Benachrichtigungsplanung an – das darf nicht bei
  // jedem touchmove passieren.
  const [pinchHourHeight, setPinchHourHeight] = useState<number | null>(null);
  const hourPx = pinchHourHeight ?? hourHeight;
  const clock = useCurrentTime(suppliedNow === undefined);
  const now = suppliedNow ?? clock;
  const currentDay = berlinDayKey(now);
  const showWeekend = weekDays.length > 0 && isCurrentWeekendWeek(weekDays[0], currentDay);
  const highlightedDay = suppliedNow ? today : currentDay;
  const touch = useRef<{ x: number; y: number; axis: 'horizontal' | 'vertical' | null } | null>(null);
  const initialPinchDist = useRef<number | null>(null);
  const initialHourHeight = useRef<number>(hourPx);
  const longPressTimer = useRef<number | null>(null);
  const didLongPress = useRef(false);
  const suppressTap = useRef(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const moveHandlerRef = useRef<((event: TouchEvent) => void) | null>(null);

  useEffect(() => {
    const view = viewRef.current;
    const move = (event: TouchEvent) => moveHandlerRef.current?.(event);
    // React delegates touchmove passively. Pinch and horizontal week swipes
    // need a cancellable listener so the browser cannot also scroll/zoom.
    view?.addEventListener('touchmove', move, { passive: false });
    return () => view?.removeEventListener('touchmove', move);
  }, []);

  useEffect(() => () => {
    if (longPressTimer.current !== null) window.clearTimeout(longPressTimer.current);
  }, []);

  // Sobald die gespeicherte Höhe nachgezogen ist, den Übergangswert verwerfen.
  useEffect(() => {
    setPinchHourHeight(null);
  }, [hourHeight]);

  // Both weekend days stay visible during the current week’s Saturday/Sunday. Scheduled days
  // always stay visible, including notices and entries hidden by module filters.
  const days = weekDays
    .map((key, weekdayIndex) => ({ key, weekdayIndex }))
    .filter(({ key, weekdayIndex }) => weekdayIndex < 5 || showWeekend || scheduledDays?.has(key) || (entriesByDay[key]?.length ?? 0) > 0);
  const dayLayouts = days.map(({ key }) => {
    const entries = entriesByDay[key] ?? [];
    return {
      key,
      untimed: entries.filter(isUntimedEntry),
      early: entries.filter((entry) => !isUntimedEntry(entry) && entryMinuteRange(entry).start < WEEK_FIRST_HOUR * 60),
      clusters: weekClusters(entries.filter((entry) => !isUntimedEntry(entry) && entryMinuteRange(entry).end > WEEK_FIRST_HOUR * 60)),
    };
  });
  const gridColumns = `44px repeat(${days.length}, minmax(0, 1fr))`;

  // Ein fester Tagesstart verhindert, dass Ganztags-/Frühtermine das Raster verschieben.
  const firstHour = WEEK_FIRST_HOUR;
  let lastHour = 18;
  for (const { key: day } of days) {
    for (const e of entriesByDay[day] ?? []) {
      if (!isUntimedEntry(e)) lastHour = Math.max(lastHour, Math.ceil(entryMinuteRange(e).end / 60));
    }
  }
  // Eine abschließende Rasterstunde hält die letzte horizontale Linie sichtbar,
  // auch wenn ein Termin genau auf einer vollen Stunde endet.
  const displayLastHour = Math.min(24, lastHour + 1);
  const hours = Array.from({ length: displayLastHour - firstHour }, (_, i) => firstHour + i);
  const nowMarker = weekNowMarker(now, weekDays, hourPx, displayLastHour);

  const startLongPress = (entry: ScheduleEntry) => {
    if (!onToggleModule) return;
    didLongPress.current = false;
    longPressTimer.current = window.setTimeout(() => {
      didLongPress.current = true;
      selectionHaptic();
      onToggleModule(scheduleModuleKey(entry));
    }, 450);
  };

  /** Nach einem Long-Press folgt trotzdem ein Click – der darf nicht zusätzlich den Tag öffnen. */
  const consumeLongPressClick = () => {
    if (suppressTap.current) { suppressTap.current = false; return true; }
    if (!didLongPress.current) return false;
    didLongPress.current = false;
    return true;
  };

  const cancelLongPress = () => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      initialPinchDist.current = d;
      initialHourHeight.current = hourPx;
      // Der erste Finger hat einen Swipe-Start hinterlassen. Würde der beim
      // Loslassen noch ausgewertet, sprang das Zoomen in die Nachbarwoche.
      touch.current = null;
      cancelLongPress();
      suppressTap.current = true;
    } else if (e.touches.length === 1) {
      if (initialPinchDist.current !== null) return;
      suppressTap.current = false;
      touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDist.current !== null && onHourHeightChange) {
      e.preventDefault();
      const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const scale = d / Math.max(1, initialPinchDist.current);
      const nextHeight = Math.min(120, Math.max(40, Math.round(initialHourHeight.current * scale)));
      setPinchHourHeight(nextHeight);
      return;
    }
    if (e.touches.length === 1 && touch.current) {
      const dx = e.touches[0].clientX - touch.current.x;
      const dy = e.touches[0].clientY - touch.current.y;
      if (!touch.current.axis && Math.max(Math.abs(dx), Math.abs(dy)) >= 8) {
        touch.current.axis = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
        suppressTap.current = true;
        cancelLongPress();
      }
      if (touch.current.axis === 'horizontal') {
        // Horizontale Sprünge dürfen den vertikalen Stundenplan nicht mitziehen.
        e.preventDefault();
      }
    }
  };
  moveHandlerRef.current = onTouchMove;

  const onTouchEnd = (e: React.TouchEvent) => {
    const wasPinching = initialPinchDist.current !== null;
    initialPinchDist.current = null;
    if (wasPinching) {
      // Erst jetzt persistieren – einmal pro Geste statt einmal pro Frame.
      if (pinchHourHeight !== null && pinchHourHeight !== hourHeight) onHourHeightChange?.(pinchHourHeight);
      touch.current = null;
      return;
    }
    if (!touch.current) return;
    if (e.changedTouches.length > 0) {
      const dx = e.changedTouches[0].clientX - touch.current.x;
      const dy = e.changedTouches[0].clientY - touch.current.y;
      if (touch.current.axis === 'horizontal' && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.5) {
        onSwipeWeek(dx < 0 ? 1 : -1);
      }
    }
    touch.current = null;
  };

  return (
    <div ref={viewRef} className="weekview" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      onTouchCancel={() => { touch.current = null; initialPinchDist.current = null; setPinchHourHeight(null); cancelLongPress(); suppressTap.current = true; }}>
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
              className={`weekview__dayhead${day === highlightedDay ? ' is-today' : ''}`}
              onClick={() => onOpenDay(day)}
            >
              <span className="weekview__wd">{WEEKDAY_SHORT[weekdayIndex]}</span>
              <span className="weekview__num">{ymd.d}.</span>
            </button>
          );
        })}
      </div>

      {dayLayouts.some((day) => day.untimed.length > 0 || day.early.length > 0) && (
        <div className="weekview__notices" style={{ gridTemplateColumns: gridColumns }}>
          <span className="weekview__notice-label">Hinweise</span>
          {dayLayouts.map(({ key, untimed, early }) => (
            <div key={key} className="weekview__notice-day">
              {untimed.map((entry, index) => (
                <button key={index} type="button" className={`weekview__notice weekview__notice--${entry.type}`}
                  onClick={() => onSelectEntries(key, [entry])} aria-label={`${entry.title}, ${timeLabel(entry)}`}>
                  {entry.title}
                </button>
              ))}
              {early.length > 0 && <button type="button" className="weekview__notice" onClick={() => onSelectEntries(key, early)}
                aria-label={`${early.length} Termine vor 08:00 anzeigen`}>Vor 08:00 · {early.length}</button>}
            </div>
          ))}
        </div>
      )}

      <div className="weekview__scroll">
        <div
          className="weekview__grid"
          style={{ height: hours.length * hourPx, gridTemplateColumns: gridColumns, '--weekview-hour-height': `${hourPx}px` } as CSSProperties}
        >
          {nowMarker && (
            <div className="weekview__now" style={{ top: nowMarker.top }} role="img"
              aria-label={`Aktuelle Uhrzeit ${nowMarker.label} Uhr (Europe/Berlin)`}>
              <span className="weekview__now-label" aria-hidden="true">{nowMarker.label}</span>
              <span className="weekview__now-line" aria-hidden="true">
                <span className="weekview__now-dot" style={{ left: `${days.findIndex(({ key }) => key === nowMarker.day) / days.length * 100}%` }} />
              </span>
            </div>
          )}
          <div className="weekview__times">
            {hours.map((h) => (
              <span key={h} className="weekview__hour" style={{ top: (h - firstHour) * hourPx }}>
                {String(h).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {dayLayouts.map(({ key: day, clusters }) => (
            <div key={day} className={`weekview__col${day === highlightedDay ? ' is-today' : ''}`}>
              {clusters.map((cluster, clusterIndex) => {
                if (cluster.entries.length > 1) {
                  const top = ((Math.max(firstHour * 60, cluster.start) - firstHour * 60) / 60) * hourPx;
                  const height = Math.max(2, ((Math.min(1440, cluster.end) - Math.max(firstHour * 60, cluster.start)) / 60) * hourPx);
                  const titles = cluster.entries.map((entry) => entry.title);
                  const hasExam = cluster.entries.some((entry) => entry.type === 'exam');
                  return (
                    <button
                      key={`parallel-${clusterIndex}`}
                      className={`weekview__event weekview__event--parallel-group${hasExam ? ' weekview__event--exam' : ''}`}
                      style={{ top, height, left: '2px', width: 'calc(100% - 4px)' }}
                      onClick={() => { if (!consumeLongPressClick()) onSelectEntries(day, cluster.entries); }}
                      aria-label={`${cluster.entries.length} überschneidende Termine: ${titles.join(', ')}`}
                    >
                      <span className="weekview__parallel-summary">
                        <span className="weekview__parallel-count">{cluster.entries.length}</span>
                        <span className="weekview__parallel-label">Termine</span>
                      </span>
                      <span className="weekview__parallel-items">
                        {cluster.entries.map((entry, index) => (
                          <span key={index} className="weekview__parallel-item">
                            <span className="weekview__parallel-time">{timeLabel(entry)}</span>
                            <span>{entry.title}</span>
                            {entry.rooms.length > 0 && <span className="weekview__emeta">{entry.rooms.join(', ')}</span>}
                          </span>
                        ))}
                      </span>
                    </button>
                  );
                }

                const [entry] = cluster.entries;
                const { top, height } = timedGeometry(entry, hourPx);
                const lecturers = entry.lecturers.join(', ');
                const isCompact = height < 52;
                const isHidden = hiddenModuleKeys?.has(scheduleModuleKey(entry));
                const showLecturers = Boolean(lecturers) && height >= 176;
                const rooms = entry.rooms.join(', ');
                return (
                  <button
                    key={`event-${clusterIndex}`}
                    className={[
                      'weekview__event',
                      `weekview__event--${entry.type}`,
                      showLecturers ? 'has-lecturers' : '',
                      isCompact ? 'is-compact' : '',
                      height < 28 ? 'is-tiny' : '',
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
                    onClick={() => {
                      if (consumeLongPressClick()) return;
                      onSelectEntries(day, [entry]);
                    }}
                    onTouchStart={() => startLongPress(entry)}
                    onTouchEnd={cancelLongPress}
                    onTouchMove={cancelLongPress}
                    onMouseDown={() => startLongPress(entry)}
                    onMouseUp={cancelLongPress}
                    onMouseLeave={cancelLongPress}
                    aria-label={`${entry.title}, ${timeLabel(entry)}${rooms ? `, Raum ${rooms}` : ''}${lecturers ? `, ${lecturers}` : ''}${isHidden ? ' (ausgeblendetes Modul)' : ''}`}
                  >
                    <span className="weekview__etime">{formatTime(entry.start)}</span>
                    <AdaptiveEventTitle metadataKey={`${showLecturers ? lecturers : ''}|${height >= 64 ? rooms : ''}`}>
                      {(isHidden ? '[Ausgeblendet] ' : '') + entry.title}
                    </AdaptiveEventTitle>
                    {rooms && height >= 64 && <span className="weekview__emeta weekview__erooms">{rooms}</span>}
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
