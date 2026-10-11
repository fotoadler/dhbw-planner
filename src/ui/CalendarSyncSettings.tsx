import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CalendarSync } from '@dhbw/capacitor-calendar-sync';

interface Props { enabled: boolean; demo: boolean; onChange: (enabled: boolean) => void; }

export function CalendarSyncSettings({ enabled, demo, onChange }: Props) {
  const native = Capacitor.isNativePlatform();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const onSync = (event: Event) => setMessage((event as CustomEvent<{ success: boolean }>).detail.success
      ? 'Kalender aktualisiert.' : 'Der Kalender konnte nicht aktualisiert werden. Bitte Kalenderzugriff in den Systemeinstellungen prüfen und den Stundenplan erneut aktualisieren.');
    window.addEventListener('device-calendar-sync', onSync);
    return () => window.removeEventListener('device-calendar-sync', onSync);
  }, []);
  const toggle = async () => {
    setMessage('');
    if (enabled) { onChange(false); return; }
    setBusy(true);
    try {
      const access = await CalendarSync.requestAccess();
      if (!access.available || access.permission !== 'granted') {
        setMessage('Kalenderzugriff wurde nicht erteilt. Bitte den Zugriff in den Systemeinstellungen erlauben.');
        return;
      }
      onChange(true);
    } catch { setMessage('Kalendersynchronisierung konnte nicht aktiviert werden. Bitte später erneut versuchen.'); }
    finally { setBusy(false); }
  };
  return <section className="sheet__section">
    <div className="sheet__row calendar-sync__row">
      <div><span>Mit Gerätekalender synchronisieren</span>
        <p className="sheet__note">Im eigenen Kalender „DHBW Planner“. Nach erfolgreichen Stundenplan-Aktualisierungen werden Termine ergänzt, geändert und entfernt.</p>
      </div>
      <button type="button" className="setup__button" disabled={!native || demo || busy}
        aria-pressed={enabled} onClick={() => void toggle()}>{busy ? 'Bitte warten …' : enabled ? 'Deaktivieren' : 'Aktivieren'}</button>
    </div>
    <p className="sheet__note">{!native ? 'Nur in der installierten Android- oder iOS-App verfügbar.' : demo ? 'In der Demo werden keine Termine übertragen.' : 'Benötigt Kalenderzugriff. Beim Deaktivieren bleiben bereits übertragene Termine erhalten. Aktualisierung bei geschlossener App ist nicht garantiert.'}</p>
    {message && <p role="status" className="sheet__note">{message}</p>}
  </section>;
}
