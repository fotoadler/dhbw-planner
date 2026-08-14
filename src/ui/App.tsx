import { useEffect, useMemo, useState } from 'react';
import { applyTheme, isThemeMode, readThemeHint, systemTheme, type ResolvedTheme } from '../lib/theme';
import { useBackButton } from './useBackButton';
import { resolveBackAction, type CalendarView, type DualisPage, type Section } from './backNavigation';
import { useSchedule } from './useSchedule';
import { useMensa } from './useMensa';
import { useDualis } from './useDualis';
import { SetupWizard } from './SetupWizard';
import { WeekStrip } from './WeekStrip';
import { DayView } from './DayView';
import { WeekView } from './WeekView';
import { CourseView } from './CourseView';
import { SettingsView } from './SettingsView';
import { DualisView } from './DualisView';
import { MailView } from './MailView';
import { ConfirmDialog } from './ConfirmDialog';
import { mailProviderForSite } from '../mail/providers';
import { siteConfigurationFor } from '../dhbw/siteConfiguration';
import { blockKey } from './courseBlocks';
import { shareIcs } from '../ical/export';
import { ensureExactAlarmPermission, ensurePermission } from '../notifications/scheduler';
import { APP_STORE_DEMO_DAY, appStoreDemoScreen } from '../demo/appStoreDemo';
import {
  addDaysYmd,
  berlinDayKey,
  formatDateLong,
  formatDayLong,
  formatWeekRange,
  formatWeekdayLong,
  isoWeekNumber,
  mondayOfYmd,
  parseYmdKey,
  ymdKey,
} from '../lib/berlinTime';

export function App() {
  const demoScreen = appStoreDemoScreen();
  const { settings, entries, allEntries, availableModules, updatedAt, refreshing, offline, isReviewDemo, refresh, ensureWeek, applySettings } =
    useSchedule();
  const [systemThemeMode, setSystemThemeMode] = useState<ResolvedTheme>(() => systemTheme());
  const mensaTarget = settings?.mensaAuto && settings.apiSelection ? settings.apiSelection.site : settings?.mensa ?? 'RV';
  const dining = useMensa(
    mensaTarget,
    (settings?.mensaEnabled ?? true) && Boolean(settings?.rapla || settings?.apiSelection),
  );
  const dualis = useDualis(settings?.apiSelection?.site);

  const today = demoScreen ? APP_STORE_DEMO_DAY : berlinDayKey(new Date());
  const [section, setSection] = useState<Section>(demoScreen === 'grades' ? 'dualis' : 'calendar');
  const [calendarView, setCalendarView] = useState<CalendarView | null>(() => {
    if (!demoScreen) return null;
    return demoScreen === 'week' ? 'week' : 'day';
  });
  const [dualisPage, setDualisPage] = useState<DualisPage>(demoScreen === 'grades' ? 'exams' : 'overview');
  const [selectedDay, setSelectedDay] = useState<string>(today);
  const [selectedBlockKey, setSelectedBlockKey] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHiddenModules, setShowHiddenModules] = useState(false);
  const [confirmModuleKey, setConfirmModuleKey] = useState<string | null>(null);

  const activeCalendarView = calendarView ?? settings?.defaultCalendarView ?? 'day';
  const mailProvider = mailProviderForSite(settings?.apiSelection?.site);
  const siteConfig = siteConfigurationFor(settings?.apiSelection?.site);
  const showMailTab = Boolean(settings?.apiSelection?.site);

  const inSettings = section === 'settings' || showSettings;
  const inCalendar = section === 'calendar' && !inSettings;
  const inDualis = section === 'dualis' && !inSettings;
  const inMail = section === 'mail' && !inSettings;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemThemeMode(media.matches ? 'dark' : 'light');
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  useEffect(() => {
    const configuredMode = settings?.themeMode ?? readThemeHint();
    applyTheme(isThemeMode(configuredMode) ? configuredMode : 'auto', systemThemeMode);
  }, [settings?.themeMode, systemThemeMode]);

  useEffect(() => {
    if (section === 'mail' && !showMailTab) setSection('calendar');
  }, [section, showMailTab]);

  // Zurück-Button: eine Ebene abbauen (Entscheidung in backNavigation.ts).
  useBackButton(() => {
    const action = resolveBackAction({
      showSettings: inSettings,
      selectedBlockKey,
      section,
      calendarView: activeCalendarView,
      dualisPage,
      dualisLoggedIn: dualis.loginState === 'logged-in',
    });
    switch (action) {
      case 'close-settings':
        setShowSettings(false);
        if (section === 'settings') setSection('calendar');
        return true;
      case 'close-course':
        setSelectedBlockKey(null);
        return true;
      case 'to-calendar':
        setSection('calendar');
        return true;
      case 'to-dualis-overview':
        setDualisPage('overview');
        return true;
      case 'to-calendar-day':
        setCalendarView('day');
        return true;
      case 'exit-app':
        return false;
    }
  });

  const monday = ymdKey(mondayOfYmd(parseYmdKey(selectedDay)));
  const todayMonday = ymdKey(mondayOfYmd(parseYmdKey(today)));
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => ymdKey(addDaysYmd(parseYmdKey(monday), i))),
    [monday],
  );

  const displayEntries = showHiddenModules ? allEntries : entries;

  const busyDays = useMemo(() => new Set(displayEntries.map((e) => berlinDayKey(e.start))), [displayEntries]);
  const dayEntries = useMemo(
    () => displayEntries.filter((e) => berlinDayKey(e.start) === selectedDay),
    [displayEntries, selectedDay],
  );
  const blockEntries = useMemo(
    () => (selectedBlockKey ? displayEntries.filter((e) => blockKey(e) === selectedBlockKey) : []),
    [displayEntries, selectedBlockKey],
  );
  const entriesByDay = useMemo(() => {
    const map: Record<string, typeof displayEntries> = {};
    for (const e of displayEntries) {
      const key = berlinDayKey(e.start);
      (map[key] ??= []).push(e);
    }
    return map;
  }, [displayEntries]);
  const selectedBlock = blockEntries[0] ?? null;

  const toggleModuleKey = (mKey: string) => {
    if (!settings || !mKey) return;
    const hidden = new Set(settings.hiddenModules);
    if (hidden.has(mKey)) hidden.delete(mKey);
    else hidden.add(mKey);
    void applySettings({ ...settings, hiddenModules: [...hidden] });
  };

  if (settings === null) {
    return <div className="splash">Lade …</div>;
  }

  // Erststart: geführter API-Modus oder manueller Rapla-Fallback.
  if (!settings.rapla && !(settings.scheduleSource === 'dhbw-api' && settings.apiSelection)) {
    return (
      <SetupWizard
        initialLink={settings.raplaLink}
        onSaveRapla={(link, config) => {
          void ensurePermission();
          void ensureExactAlarmPermission();
          void applySettings({
            ...settings,
            raplaLink: link,
            rapla: config,
            scheduleSource: 'rapla',
            apiSelection: null,
            mensaAuto: false,
            hiddenModules: [],
          });
        }}
        onSaveApi={(selection) => {
          void ensurePermission();
          void applySettings({
            ...settings,
            raplaLink: '',
            rapla: null,
            scheduleSource: 'dhbw-api',
            apiSelection: selection,
            mensaAuto: true,
            mensa: selection.site,
            hiddenModules: [],
          });
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

  const showNextWeek = () => {
    const nextMonday = ymdKey(addDaysYmd(parseYmdKey(monday), 7));
    selectDay(nextMonday);
    setCalendarView('week');
  };

  const dualisLoggedIn = dualis.loginState === 'logged-in';
  const showsReviewDemo = isReviewDemo || dualis.isReviewDemo;

  // Kopf: Titel/Untertitel je nach Bereich und Unteransicht.
  let title: string;
  let subtitle: string | null;
  if (inSettings) {
    title = 'Einstellungen';
    subtitle = null;
  } else if (inMail) {
    title = 'Mail';
    subtitle = null;
  } else if (inDualis) {
    title = 'Dualis';
    subtitle = 'Noten und Prüfungen';
  } else if (selectedBlock) {
    title = selectedBlock.title;
    subtitle = `${blockEntries.length} ${blockEntries.length === 1 ? 'Termin' : 'Termine'}`;
  } else if (activeCalendarView === 'day') {
    if (selectedDay === today) {
      title = 'Heute';
      subtitle = formatDayLong(parseYmdKey(selectedDay));
    } else {
      const ymd = parseYmdKey(selectedDay);
      title = formatWeekdayLong(ymd);
      subtitle = formatDateLong(ymd);
    }
  } else {
    title = `KW ${isoWeekNumber(parseYmdKey(monday))}`;
    subtitle = formatWeekRange(parseYmdKey(monday));
  }

  const showTodayBtn =
    inCalendar &&
    !selectedBlock &&
    ((activeCalendarView === 'day' && selectedDay !== today) ||
      (activeCalendarView === 'week' && monday !== todayMonday));

  const openSettings = () => {
    setSection('settings');
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
    if (section === 'settings') setSection('calendar');
  };

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__date">
          {((inCalendar && selectedBlock) || inSettings) && (
            <button
              className="app__backbtn"
              aria-label={inSettings ? 'Zurück zum Kalender' : 'Zurück zum Kalender'}
              onClick={() => {
                if (inSettings) closeSettings();
                else setSelectedBlockKey(null);
              }}
            >
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
            <>
              {settings.hiddenModules.length > 0 && (
                <button
                  className={`iconbtn${showHiddenModules ? ' is-active' : ''}`}
                  aria-label={
                    showHiddenModules
                      ? 'Ausgeblendete Module ausblenden'
                      : `${settings.hiddenModules.length} ausgeblendete Module anzeigen`
                  }
                  title={
                    showHiddenModules
                      ? 'Ausgeblendete Module ausblenden'
                      : `${settings.hiddenModules.length} ausgeblendete Module anzeigen`
                  }
                  onClick={() => setShowHiddenModules((prev) => !prev)}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  <span className="iconbtn__badge">{settings.hiddenModules.length}</span>
                </button>
              )}
              <button
                className="iconbtn"
                aria-label="Als Kalenderdatei teilen"
                onClick={() => void shareIcs(entries)}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v12" /><path d="m7 8 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
                </svg>
              </button>
            </>
          )}
          {!inSettings && (
            <button className="iconbtn" aria-label="Einstellungen" onClick={openSettings}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55h0a1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
              </svg>
            </button>
          )}
        </div>
      </header>

      {showsReviewDemo && (
        <p className="app__review-demo" role="status">
          App-Review-Demo · ausschließlich Beispieldaten
        </p>
      )}

      {/* Kontextueller Segment-Umschalter für die Unteransicht */}
      {inCalendar && !selectedBlock && (
        <div className="app__viewbar">
          {offline && (
            <div className="app__offline" aria-label="Offline - gespeicherter Stand wird angezeigt.">Offline</div>
          )}
          <nav className="segmented segmented--top" aria-label="Kalenderansicht">
            <button className={activeCalendarView === 'day' ? 'is-active' : ''} onClick={() => setCalendarView('day')}>
              Tag
            </button>
            <button className={activeCalendarView === 'week' ? 'is-active' : ''} onClick={() => setCalendarView('week')}>
              Woche
            </button>
          </nav>
        </div>
      )}
      {inDualis && dualisLoggedIn && (
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
      {inSettings ? (
        <SettingsView
          settings={settings}
          availableModules={availableModules}
          updatedAt={updatedAt}
          onChange={(next) => {
            if (next.defaultCalendarView !== settings.defaultCalendarView) {
              setCalendarView(next.defaultCalendarView);
            }
            void applySettings(next);
          }}
          onClose={closeSettings}
        />
      ) : inMail ? (
        <MailView site={settings.apiSelection?.site ?? ''} />
      ) : inCalendar && selectedBlock ? (
        <CourseView
          entries={blockEntries}
          today={today}
          onOpenDay={(day) => {
            selectDay(day);
            setCalendarView('day');
          }}
          onBack={() => setSelectedBlockKey(null)}
        />
      ) : inCalendar && activeCalendarView === 'day' ? (
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
            hiddenModuleKeys={new Set(settings.hiddenModules)}
            onToggleModule={(mKey) => setConfirmModuleKey(mKey)}
            dining={settings.mensaEnabled ? {
              ...dining,
              selectedDay,
              homeSite: settings.apiSelection?.site,
              onSelectSite: (site) => void applySettings({
                ...settings,
                mensaEnabled: true,
                mensaAuto: false,
                mensa: site,
              }),
            } : null}
            onSelectEntry={(entry) => setSelectedBlockKey(blockKey(entry))}
            onSwipeDay={shiftDay}
            selectedDay={selectedDay}
            onShowNextWeek={showNextWeek}
            onRefresh={refresh}
            refreshing={refreshing}
          />
        </>
      ) : inCalendar ? (
        <WeekView
          weekDays={weekDays}
          entriesByDay={entriesByDay}
          today={today}
          hourHeight={settings.calendarHourHeight}
          hiddenModuleKeys={new Set(settings.hiddenModules)}
          onToggleModule={(mKey) => setConfirmModuleKey(mKey)}
          onHourHeightChange={(newHeight) => void applySettings({ ...settings, calendarHourHeight: newHeight })}
          onOpenDay={(day) => {
            selectDay(day);
            setCalendarView('day');
          }}
          onSwipeWeek={(delta) => selectDay(ymdKey(addDaysYmd(parseYmdKey(monday), delta * 7)))}
        />
      ) : (
        <DualisView dualis={dualis} site={settings.apiSelection?.site} page={dualisPage} />
      )}

      {/* In-App Bestätigungs-Dialog */}
      {confirmModuleKey && (
        <ConfirmDialog
          title={settings.hiddenModules.includes(confirmModuleKey) ? 'Modul wieder einblenden?' : 'Modul ausblenden?'}
          message={
            settings.hiddenModules.includes(confirmModuleKey) ? (
              <>
                Möchtest du das Modul <strong>„{confirmModuleKey}“</strong> wieder im Stundenplan anzeigen?
              </>
            ) : (
              <>
                Möchtest du das Modul <strong>„{confirmModuleKey}“</strong> im Stundenplan ausblenden?
              </>
            )
          }
          confirmLabel={settings.hiddenModules.includes(confirmModuleKey) ? 'Einblenden' : 'Modul ausblenden'}
          isDanger={!settings.hiddenModules.includes(confirmModuleKey)}
          onConfirm={() => {
            toggleModuleKey(confirmModuleKey);
            setConfirmModuleKey(null);
          }}
          onCancel={() => setConfirmModuleKey(null)}
        />
      )}

      {/* Feste Bereichsnavigation unten */}
      <nav className="tabbar" aria-label="Bereich">
        <button
          className={`tabbar__item${inCalendar ? ' is-active' : ''}`}
          onClick={() => {
            setShowSettings(false);
            setSection('calendar');
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span>Kalender</span>
        </button>
        <button
          className={`tabbar__item${inDualis ? ' is-active' : ''}`}
          onClick={() => {
            setShowSettings(false);
            setSection('dualis');
          }}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5" />
          </svg>
          <span>Dualis</span>
        </button>
        {showMailTab && (
          <button
            className={`tabbar__item${inMail ? ' is-active' : ''}`}
            onClick={() => {
              setShowSettings(false);
              setSection('mail');
            }}
            aria-label={`${mailProvider?.label ?? siteConfig.label} Uni-Mail`}
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" />
            </svg>
            <span>Mail</span>
          </button>
        )}
      </nav>
    </div>
  );
}
