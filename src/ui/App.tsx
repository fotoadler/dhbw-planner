/**
 * Wurzelkomponente.
 *
 * Struktur: unten eine feste Navigation zwischen den zwei Bereichen
 * „Kalender" und „Dualis". Oben schaltet ein kontextueller Segment-Umschalter
 * die Unteransicht (Kalender: Tag/Woche, Dualis: Übersicht/Prüfungen).
 *
 * Der Dualis-Hook lebt hier oben, damit die angemeldete Session einen
 * Bereichswechsel überlebt (sonst müsste man sich bei jedem Tab-Wechsel neu
 * anmelden, weil DualisView sonst ab- und wieder aufgebaut würde).
 */

import { useMemo, useState } from 'react';
import { useSchedule } from './useSchedule';
import { useDualis } from './useDualis';
import { LinkSetup } from './LinkSetup';
import { WeekStrip } from './WeekStrip';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { CourseView } from './CourseView';
import { SettingsSheet } from './SettingsSheet';
import { DualisView } from './DualisView';
import { blockKey } from './courseBlocks';
import { shareIcs } from '../ical/export';
import { ensurePermission } from '../notifications/scheduler';
import {
  addDaysYmd,
  berlinDayKey,
  formatDayLong,
  formatWeekRange,
  isoWeekNumber,
  mondayOfYmd,
  parseYmdKey,
  ymdKey,
} from '../lib/berlinTime';

type Section = 'calendar' | 'dualis';
type CalendarView = 'day' | 'week';
type DualisPage = 'overview' | 'exams';

export function App() {
  const { settings, entries, updatedAt, refreshing, offline, refresh, ensureWeek, applySettings } =
    useSchedule();
  const dualis = useDualis();

  const today = berlinDayKey(new Date());
  const [section, setSection] = useState<Section>('calendar');
  const [calendarView, setCalendarView] = useState<CalendarView>('day');
  const [dualisPage, setDualisPage] = useState<DualisPage>('overview');
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const monday = ymdKey(mondayOfYmd(parseYmdKey(selectedDay)));
  const todayMonday = ymdKey(mondayOfYmd(parseYmdKey(today)));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ymdKey(addDaysYmd(parseYmdKey(monday), i))),
    [monday],
  );

  const busyDays = useMemo(() => new Set(entries.map((e) => berlinDayKey(e.start))), [entries]);
  const dayEntries = useMemo(
    () => entries.filter((e) => berlinDayKey(e.start) === selectedDay),
    [entries, selectedDay],
  );
  const blockEntries = useMemo(
    () => (selectedBlockKey ? entries.filter((e) => blockKey(e) === selectedBlockKey) : []),
    [entries, selectedBlockKey],
  );
  const entriesByDay = useMemo(() => {
    const map: Record<string, typeof entries> = {};
    for (const e of entries) {
      const key = berlinDayKey(e.start);
      (map[key] ??= []).push(e);
    }
    return map;
  }, [entries]);
  const selectedBlock = blockEntries[0] ?? null;

  if (settings === null) {
    return <div className="splash">Lade …</div>;
  }

  // Erststart: nur das Rapla-Link-Eingabefeld, kein Wizard.
  if (!settings.rapla) {
    return (
      <LinkSetup
        initialLink={settings.raplaLink}
        onSave={(link, config) => {
          void ensurePermission();
          void applySettings({ ...settings, raplaLink: link, rapla: config });
        }}
      />
    );
  }

  const isVisiblePlanDay = (day: string): boolean => {
    const { y, m, d } = parseYmdKey(day);
    const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
    const isWeekend = weekday === 0 || weekday === 6;
    return !isWeekend || busyDays.has(day);
  };

  const selectDay = (day: string) => {
    setSelectedBlockKey(null);
    setSelectedDay(day);
    void ensureWeek(ymdKey(mondayOfYmd(parseYmdKey(day))));
  };

  const shiftDay = (delta: 1 | -1) => {
    let next = parseYmdKey(selectedDay);
    for (let i = 0; i < 7; i++) {
      next = addDaysYmd(next, delta);
      const key = ymdKey(next);
      if (isVisiblePlanDay(key)) {
        selectDay(key);
        return;
      }
    }
  };

  const inCalendar = section === 'calendar';
  const dualisLoggedIn = dualis.loginState === 'logged-in';

  // Kopf: Titel/Untertitel je nach Bereich und Unteransicht.
  let title: string;
  let subtitle: string | null;
  if (!inCalendar) {
    title = 'Dualis';
    subtitle = 'Noten und Prüfungen';
  } else if (selectedBlock) {
    title = selectedBlock.title;
    subtitle = `${blockEntries.length} ${blockEntries.length === 1 ? 'Termin' : 'Termine'}`;
  } else if (calendarView === 'day') {
    title = selectedDay === today ? 'Heute' : formatDayLong(parseYmdKey(selectedDay));
    subtitle = selectedDay === today ? formatDayLong(parseYmdKey(selectedDay)) : null;
  } else {
    title = `KW ${isoWeekNumber(parseYmdKey(monday))}`;
    subtitle = formatWeekRange(parseYmdKey(monday));
  }

  const showTodayBtn =
    inCalendar &&
    !selectedBlock &&
    ((calendarView === 'day' && selectedDay !== today) ||
      (calendarView === 'week' && monday !== todayMonday));

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__date">
          {inCalendar && selectedBlock && (
            <button className="app__backbtn" aria-label="Zurück zum Kalender" onClick={() => setSelectedBlockKey(null)}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
          )}
          <h1 className="app__day">{title}</h1>
          <p className={`app__subtitle${subtitle ? '' : ' is-placeholder'}`}>{subtitle ?? ' '}</p>
        </div>
        <div className="app__actions">
          {showTodayBtn && (
            <button className="app__todaybtn" onClick={() => selectDay(today)}>
              Heute
            </button>
          )}
          {inCalendar && !selectedBlock && (
            <button
              className="iconbtn"
              aria-label="Als Kalenderdatei teilen"
              onClick={() => void shareIcs(entries)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
              </svg>
            </button>
          )}
          <button className="iconbtn" aria-label="Einstellungen" onClick={() => setShowSettings(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Kontextueller Segment-Umschalter für die Unteransicht */}
      {inCalendar && !selectedBlock && (
        <div className="app__viewbar">
          {offline && (
            <div className="app__offline" aria-label="Offline - gespeicherter Stand wird angezeigt.">Offline</div>
          )}
          <nav className="segmented segmented--top" aria-label="Kalenderansicht">
            <button className={calendarView === 'day' ? 'is-active' : ''} onClick={() => setCalendarView('day')}>
              Tag
            </button>
            <button className={calendarView === 'week' ? 'is-active' : ''} onClick={() => setCalendarView('week')}>
              Woche
            </button>
          </nav>
        </div>
      )}
      {!inCalendar && dualisLoggedIn && (
        <div className="dualis__subnav">
          <nav className="segmented" aria-label="Dualis-Ansicht">
            <button className={dualisPage === 'overview' ? 'is-active' : ''} onClick={() => setDualisPage('overview')}>
              Übersicht
            </button>
            <button className={dualisPage === 'exams' ? 'is-active' : ''} onClick={() => setDualisPage('exams')}>
              Prüfungen
            </button>
          </nav>
          <button className="iconbtn dualis__logoutbtn" aria-label="Abmelden" onClick={() => void dualis.logout()}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="m16 17 5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>
      )}

      {/* Inhalt */}
      {inCalendar && selectedBlock ? (
        <CourseView entries={blockEntries} today={today} onBack={() => setSelectedBlockKey(null)} />
      ) : inCalendar && calendarView === 'day' ? (
        <>
          <WeekStrip
            monday={monday}
            selected={selectedDay}
            today={today}
            busyDays={busyDays}
            onSelect={selectDay}
            onWeekChange={(newMonday) => selectDay(newMonday)}
          />
          <DayView
            entries={dayEntries}
            onSelectEntry={(entry) => setSelectedBlockKey(blockKey(entry))}
            onSwipeDay={shiftDay}
            onRefresh={refresh}
            refreshing={refreshing}
          />
        </>
      ) : inCalendar ? (
        <WeekView
          weekDays={weekDays}
          entriesByDay={entriesByDay}
          today={today}
          onOpenDay={(day) => {
            selectDay(day);
            setCalendarView('day');
          }}
          onSwipeWeek={(delta) => selectDay(ymdKey(addDaysYmd(parseYmdKey(monday), delta * 7)))}
        />
      ) : (
        <DualisView dualis={dualis} page={dualisPage} />
      )}

      {/* Feste Bereichsnavigation unten */}
      <nav className="tabbar" aria-label="Bereich">
        <button
          className={`tabbar__item${inCalendar ? ' is-active' : ''}`}
          onClick={() => setSection('calendar')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>Kalender</span>
        </button>
        <button
          className={`tabbar__item${!inCalendar ? ' is-active' : ''}`}
          onClick={() => setSection('dualis')}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
          </svg>
          <span>Dualis</span>
        </button>
      </nav>

      {showSettings && (
        <SettingsSheet
          settings={settings}
          updatedAt={updatedAt}
          onChange={(next) => void applySettings(next)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
