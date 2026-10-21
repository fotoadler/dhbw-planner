/**
 * Einstellungen als eigene vollwertige Seite (kein Popup-Sheet) —
 * mit allen Optionen: Rapla-Link, Kalenderansicht, Kalenderhöhe,
 * Mensa-Speiseplan, Benachrichtigungen, Vorlesungsmodule.
 */

import { useState } from 'react';
import { ModuleSelection } from '../features/study-options';
import type { ScheduleEntry } from '../types';
import { AppSettings } from '../store/preferences';
import { parseRaplaLink } from '../rapla/client';
import { API_MENSA_OPTIONS, Mensa, mensaLabel } from '../seezeit/types';
import { ScheduleModule } from '../schedule/modules';
import { isThemeMode, type ThemeMode } from '../lib/theme';
import { FEEDBACK_EMAIL, PROJECT_REPOSITORY_URL, PRIVACY_POLICY_URL } from '../lib/projectLinks';
import { selectionHaptic } from '../lib/haptics';
import { SupportSettingsSection, SupporterOptions } from '../support';

interface Props {
  settings: AppSettings;
  availableModules: ScheduleModule[];
  updatedAt: Date | null;
  scheduleEntries?: ScheduleEntry[];
  openModules?: boolean;
  onChange: (next: AppSettings) => void;
  onClose?: () => void;
  onChangeSource?: () => void;
  onSupport?: () => void;
  goldUnlocked?: boolean;
  onSupportRestored?: () => Promise<void>;
}

export function SettingsView({ settings, availableModules, updatedAt, onChange, onChangeSource, onSupport, goldUnlocked = false, onSupportRestored, scheduleEntries, openModules }: Props) {
  const [link, setLink] = useState(settings.raplaLink);
  const [linkError, setLinkError] = useState(false);


  const saveLink = () => {
    const config = parseRaplaLink(link);
    if (!config) {
      setLinkError(true);
      return;
    }
    setLinkError(false);
    onChange({
      ...settings,
      raplaLink: link.trim(),
      rapla: config,
      scheduleSource: 'rapla',
      apiSelection: null,
      mensaAuto: false,
      hiddenModules: [],
    });
  };

  const set = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });
  const feedbackHref = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
    'DHBW Planner – App-Feedback',
  )}&body=${encodeURIComponent(
    'Hallo Christian,\n\nmein Feedback zur DHBW Planner App:\n\n',
  )}`;

  return (
    <div className="settings-page">


        <section className="settings-group" aria-labelledby="settings-schedule-title">
          <h2 id="settings-schedule-title">Dein Stundenplan</h2>
          <div className="settings-group-body">
        <section className="settings-block">
          <div className="sheet__row">
            <span className="settings-course">{settings.scheduleSource === 'dhbw-api' && settings.apiSelection ? settings.apiSelection.course : 'Dein Rapla-Kalender'}</span>
            <strong className="sheet__value">
              {settings.scheduleSource === 'dhbw-api' && settings.apiSelection ? 'DHBW' : 'Rapla'}
            </strong>
          </div>
          <button
            className="sheet__textbtn"
            onClick={() => onChangeSource ? onChangeSource() : onChange({
              ...settings,
              raplaLink: '',
              rapla: null,
              apiSelection: null,
              scheduleSource: 'rapla',
              hiddenModules: [],
            })}
          >
            {onChangeSource ? 'Kurs hinzufügen' : 'Stundenplan ändern'}
          </button>
        </section>

        {settings.scheduleSource === 'rapla' && (
          <details className="settings-block settings-source-details">
            <summary>Rapla-Link bearbeiten</summary>
            <label className="sheet__label" htmlFor="rapla-link">
              Rapla-Link
            </label>
            <input
              id="rapla-link"
              className="sheet__input"
              type="url"
              value={link}
              spellCheck={false}
              autoCapitalize="off"
              onChange={(e) => setLink(e.target.value)}
            />
            {linkError && <p className="setup__error">Link ungültig — „user“/„file“ oder „key“/„salt“ fehlen.</p>}
            {link !== settings.raplaLink && (
              <button className="sheet__save" onClick={saveLink}>
                Link übernehmen
              </button>
            )}
          </details>
        )}

        <section className="settings-block">
          <ModuleSelection key={settings.apiSelection?.course ?? settings.raplaLink} settings={settings} modules={availableModules}
            entries={scheduleEntries} initiallyOpen={openModules} onChange={onChange} />
        </section>

        {updatedAt && (
          <p className="settings-updated">
            Stundenplan aktualisiert:{' '}
            {updatedAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' })}
          </p>
        )}

          </div>
        </section>
        <section className="settings-group" aria-labelledby="settings-general-title">
          <h2 id="settings-general-title">Allgemein</h2>
          <div className="settings-group-body">
        <section className="settings-block">
          <div className="sheet__row">
            <div>
              <span>Design</span>
            </div>
            <select
              className="sheet__theme-select"
              value={settings.themeMode}
              aria-label="Darstellung auswählen"
              onChange={(event) => {
                const value = event.target.value;
                if (isThemeMode(value)) set({ themeMode: value as ThemeMode });
              }}
            >
              <option value="auto">Automatisch</option>
              <option value="light">Hell</option>
              <option value="dark">Dunkel</option>
            </select>
          </div>
        </section>

        <section className="settings-block">
          <div className="sheet__row">
            <div>
              <span>Kalenderstart</span>
            </div>
            <select
              value={settings.defaultCalendarView}
              aria-label="Standardansicht auswählen"
              onChange={(event) => {
                const value = event.target.value;
                selectionHaptic();
                if (value === 'day' || value === 'week' || value === 'month') set({ defaultCalendarView: value });
              }}
            >
              <option value="day">Tagesansicht</option>
              <option value="week">Wochenansicht</option>
              <option value="month">Monatsansicht</option>
            </select>
          </div>
        </section>

        <section className="settings-block">
          <div className="sheet__row">
            <span>Mensa-Speiseplan</span>
            <select
              aria-label="Mensa-Speiseplan"
              value={settings.mensaEnabled ? settings.mensaAuto && settings.apiSelection ? 'auto' : settings.mensa : 'off'}
              onChange={(e) => {
                const value = e.target.value;
                selectionHaptic();
                if (value === 'off') set({ mensaEnabled: false });
                else if (value === 'auto' && settings.apiSelection) {
                  set({ mensaEnabled: true, mensaAuto: true, mensa: settings.apiSelection.site });
                } else {
                  set({ mensaEnabled: true, mensaAuto: false, mensa: value as Mensa });
                }
              }}
            >
              <option value="off">Aus</option>
              {settings.apiSelection && (
                <option value="auto">Automatisch · {mensaLabel(settings.apiSelection.site)}</option>
              )}
              {[
                ...(settings.mensa === 'ravensburg' ? [{ value: 'ravensburg', label: 'Ravensburg' }] : []),
                ...(settings.mensa === 'friedrichshafen' ? [{ value: 'friedrichshafen', label: 'Friedrichshafen' }] : []),
                ...API_MENSA_OPTIONS,
              ].filter((option, index, all) => all.findIndex((item) => item.value === option.value) === index).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </section>

          </div>
        </section>
        <section className="settings-group" aria-labelledby="settings-notifications-title">
          <h2 id="settings-notifications-title">Mitteilungen</h2>
          <div className="settings-group-body">
        <section className="settings-block">
          <div className="sheet__row">
            <label htmlFor="setting-morning">Tagesübersicht am Morgen</label>
            <input
              type="checkbox"
              role="switch"
              id="setting-morning"
              checked={settings.morningEnabled}
              onChange={(e) => set({ morningEnabled: e.target.checked })}
            />
          </div>
          {settings.morningEnabled && (
            <div className="sheet__row sheet__row--sub">
              <label htmlFor="setting-morning-time">Uhrzeit</label>
              <input
                id="setting-morning-time"
                type="time"
                value={settings.morningTime}
                onChange={(e) => set({ morningTime: e.target.value || '07:00' })}
              />
            </div>
          )}

          <div className="sheet__row">
            <label htmlFor="setting-live">Live-Aktivität</label>
            <input
              type="checkbox"
              role="switch"
              id="setting-live"
              checked={settings.liveEnabled}
              onChange={(e) => set({ liveEnabled: e.target.checked })}
            />
          </div>

          <div className="sheet__row">
            <label htmlFor="setting-reminder">Vorlesungserinnerung</label>
            <input
              type="checkbox"
              role="switch"
              id="setting-reminder"
              checked={settings.reminderEnabled}
              onChange={(e) => set({ reminderEnabled: e.target.checked })}
            />
          </div>
          {settings.reminderEnabled && (
            <div className="sheet__row sheet__row--sub">
              <label htmlFor="setting-reminder-minutes">Minuten vorher</label>
              <input
                id="setting-reminder-minutes"
                type="number"
                min={1}
                max={120}
                value={settings.reminderMinutes}
                onChange={(e) => set({ reminderMinutes: Math.max(1, Number(e.target.value) || 15) })}
              />
            </div>
          )}
        </section>

          </div>
        </section>

        {onSupport && <SupportSettingsSection onSupport={onSupport} goldUnlocked={goldUnlocked} />}
        {onSupportRestored && <SupporterOptions onRestored={onSupportRestored} />}

        <section className="sheet__section sheet__feedback">
          <span>App-Feedback</span>
          <p className="sheet__note">Ideen, Fehler oder Hinweise direkt an den Entwickler senden.</p>
          <a className="setup__button sheet__feedback-button" href={feedbackHref}>
            Feedback senden <span aria-hidden="true">✉</span>
          </a>
          <div className="sheet__opensource">
            <p>DHBW Planner ist Open Source – schau dir den Code an oder entwickle mit.</p>
            <a
              className="setup__button sheet__feedback-button sheet__opensource-button"
              href={PROJECT_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
            >
              Projekt auf GitHub öffnen <span aria-hidden="true">↗</span>
            </a>
            <p className="sheet__support"><a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">Datenschutz</a></p>
            <p className="sheet__support">
              Mit freundlicher Unterstützung von{' '}
              <a href="https://dhbw.app/" target="_blank" rel="noreferrer">dhbw.app</a>
            </p>
          </div>
        </section>
    </div>
  );
}
