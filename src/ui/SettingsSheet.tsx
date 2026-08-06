/**
 * Einstellungen als einfaches Sheet — bewusst minimal (Design-Philosophie):
 * Rapla-Link, Mensa-Speiseplan (an/aus + Mensa-Auswahl), Morgen-Benachrichtigung
 * (an/aus + Uhrzeit), Live-Aktivitaeten, Vorab-Erinnerung (an/aus + Minuten).
 */

import { useState } from 'react';
import { AppSettings } from '../store/preferences';
import { parseRaplaLink } from '../rapla/client';
import { API_MENSA_OPTIONS, Mensa, mensaLabel } from '../seezeit/types';

interface Props {
  settings: AppSettings;
  updatedAt: Date | null;
  onChange: (next: AppSettings) => void;
  onClose: () => void;
}

export function SettingsSheet({ settings, updatedAt, onChange, onClose }: Props) {
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
    });
  };

  const set = (patch: Partial<AppSettings>) => onChange({ ...settings, ...patch });

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
            onClick={() => onChange({ ...settings, raplaLink: '', rapla: null, apiSelection: null, scheduleSource: 'rapla' })}
          >
            Stundenplan ändern
          </button>
        </section>

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

        <section className="sheet__section">
          <div className="sheet__row">
            <span>Mensa-Speiseplan</span>
            <select
              value={settings.mensaEnabled ? settings.mensaAuto && settings.apiSelection ? 'auto' : settings.mensa : 'off'}
              onChange={(e) => {
                const value = e.target.value;
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
      </div>
    </div>
  );
}
