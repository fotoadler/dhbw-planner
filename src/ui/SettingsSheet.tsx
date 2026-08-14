/**
 * Einstellungen als einfaches Sheet — bewusst minimal (Design-Philosophie):
 * Rapla-Link, Mensa-Speiseplan (an/aus + Mensa-Auswahl), Morgen-Benachrichtigung
 * (an/aus + Uhrzeit), Live-Aktivitaeten, Vorab-Erinnerung (an/aus + Minuten).
 */

import { useState } from 'react';
import { AppSettings } from '../store/preferences';
import { parseRaplaLink } from '../rapla/client';
import { API_MENSA_OPTIONS, Mensa, mensaLabel } from '../seezeit/types';
import { ScheduleModule } from '../schedule/modules';
import { isThemeMode, type ThemeMode } from '../lib/theme';
import { PROJECT_REPOSITORY_URL } from '../lib/projectLinks';
import { selectionHaptic } from '../lib/haptics';

interface Props {
  settings: AppSettings;
  availableModules: ScheduleModule[];
  updatedAt: Date | null;
  onChange: (next: AppSettings) => void;
  onClose: () => void;
}

export function SettingsSheet({ settings, availableModules, updatedAt, onChange, onClose }: Props) {
  const [link, setLink] = useState(settings.raplaLink);
  const [linkError, setLinkError] = useState(false);
  const [moduleQuery, setModuleQuery] = useState('');
  const visibleModuleCount = availableModules.filter((module) => !settings.hiddenModules.includes(module.key)).length;
  const normalizedModuleQuery = moduleQuery.trim().toLocaleLowerCase('de-DE');
  const filteredModules = normalizedModuleQuery
    ? availableModules.filter((module) => module.label.toLocaleLowerCase('de-DE').includes(normalizedModuleQuery))
    : availableModules;

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
  const feedbackHref = `mailto:christian@fotoadler.com?subject=${encodeURIComponent(
    'DHBW Planner – App-Feedback',
  )}&body=${encodeURIComponent(
    'Hallo Christian,\n\nmein Feedback zur DHBW Planner App:\n\n',
  )}`;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <header className="sheet__header">
          <h2>Einstellungen</h2>
          <button className="sheet__close" aria-label="Schließen" onClick={onClose}>
            ✕
          </button>
        </header>

        <section className="sheet__section">
          <div className="sheet__row">
            <div>
              <span>Darstellung</span>
              <p className="sheet__note">Automatisch folgt der Systemeinstellung.</p>
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

        <section className="sheet__section">
          <div className="sheet__row">
            <span>Stundenplanquelle</span>
            <strong className="sheet__value">
              {settings.scheduleSource === 'dhbw-api' && settings.apiSelection ? 'Geführter Modus' : 'Manueller Rapla-Modus'}
            </strong>
          </div>
          {settings.apiSelection && settings.scheduleSource === 'dhbw-api' && (
            <p className="sheet__note">
              {settings.apiSelection.site} · {settings.apiSelection.degree} · {settings.apiSelection.course}
            </p>
          )}
          <button
            className="sheet__textbtn"
            onClick={() => onChange({
              ...settings,
              raplaLink: '',
              rapla: null,
              apiSelection: null,
              scheduleSource: 'rapla',
              hiddenModules: [],
            })}
          >
            Stundenplan ändern
          </button>
        </section>

        <section className="sheet__section">
          <div className="sheet__row">
            <span>Vorlesungsmodule</span>
            {availableModules.length > 0 && (
              <strong className="sheet__value">
                {visibleModuleCount} von {availableModules.length} sichtbar
              </strong>
            )}
          </div>
          <p className="sheet__note">
            Blende einzelne Module aus, von denen du befreit bist. Die Auswahl gilt für den angezeigten Plan und seine Erinnerungen.
          </p>
          {availableModules.length > 0 ? (
            <details className="sheet__module-picker">
              <summary>
                <span>Module auswählen</span>
                <span className="sheet__module-picker-count">{visibleModuleCount}/{availableModules.length}</span>
              </summary>
              <div className="sheet__modules">
                <input
                  className="sheet__module-search"
                  type="search"
                  value={moduleQuery}
                  placeholder="Module durchsuchen"
                  aria-label="Module durchsuchen"
                  onFocus={(event) => {
                    const input = event.currentTarget;
                    window.setTimeout(() => input.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 220);
                  }}
                  onChange={(event) => setModuleQuery(event.target.value)}
                />
                {filteredModules.map((module) => {
                  const checked = !settings.hiddenModules.includes(module.key);
                  return (
                    <label className="sheet__module" key={module.key}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          const hidden = new Set(settings.hiddenModules);
                          if (event.target.checked) hidden.delete(module.key);
                          else hidden.add(module.key);
                          set({ hiddenModules: [...hidden] });
                        }}
                      />
                      <span>{module.label}</span>
                    </label>
                  );
                })}
                {filteredModules.length === 0 && <p className="sheet__note">Kein passendes Modul gefunden.</p>}
                <div className="sheet__module-actions">
                  <button type="button" onClick={() => set({ hiddenModules: [] })}>Alle anzeigen</button>
                  <button type="button" onClick={() => set({ hiddenModules: availableModules.map((module) => module.key) })}>
                    Alle ausblenden
                  </button>
                </div>
              </div>
            </details>
          ) : (
            <p className="sheet__note">Module werden nach dem ersten Planabruf angezeigt.</p>
          )}
        </section>

        {settings.scheduleSource === 'rapla' && (
          <section className="sheet__section">
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
          </section>
        )}

        <section className="sheet__section">
          <div className="sheet__row">
            <span>Mensa-Speiseplan</span>
            <select
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

        <section className="sheet__section">
          <div className="sheet__row">
            <span>Morgen-Zusammenfassung</span>
            <input
              type="checkbox"
              checked={settings.morningEnabled}
              onChange={(e) => set({ morningEnabled: e.target.checked })}
            />
          </div>
          {settings.morningEnabled && (
            <div className="sheet__row sheet__row--sub">
              <span>Uhrzeit</span>
              <input
                type="time"
                value={settings.morningTime}
                onChange={(e) => set({ morningTime: e.target.value || '07:00' })}
              />
            </div>
          )}

          <div className="sheet__row">
            <span>Live-Aktivität</span>
            <input
              type="checkbox"
              checked={settings.liveEnabled}
              onChange={(e) => set({ liveEnabled: e.target.checked })}
            />
          </div>

          <div className="sheet__row">
            <span>Vorab-Erinnerung</span>
            <input
              type="checkbox"
              checked={settings.reminderEnabled}
              onChange={(e) => set({ reminderEnabled: e.target.checked })}
            />
          </div>
          {settings.reminderEnabled && (
            <div className="sheet__row sheet__row--sub">
              <span>Minuten vorher</span>
              <input
                type="number"
                min={1}
                max={120}
                value={settings.reminderMinutes}
                onChange={(e) => set({ reminderMinutes: Math.max(1, Number(e.target.value) || 15) })}
              />
            </div>
          )}
        </section>

        {updatedAt && (
          <p className="sheet__footer">
            Zuletzt aktualisiert:{' '}
            {updatedAt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', dateStyle: 'short', timeStyle: 'short' })}
          </p>
        )}

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
          </div>
        </section>
      </div>
    </div>
  );
}
