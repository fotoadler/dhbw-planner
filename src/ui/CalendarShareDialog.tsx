import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { CalendarSync } from '@dhbw/capacitor-calendar-sync';
import { ConfirmDialog } from './ConfirmDialog';

interface Props {
  enabled: boolean;
  demo: boolean;
  onEnable: () => Promise<void>;
  onRefresh: () => Promise<void>;
  onDisable: () => Promise<void>;
  onClose: () => void;
  onBusyChange?: (busy: boolean) => void;
}

export function CalendarShareDialog({ enabled, demo, onEnable, onRefresh, onDisable, onClose, onBusyChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const available = Capacitor.isNativePlatform() && !demo;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    const onSync = (event: Event) => setMessage((event as CustomEvent<{ success: boolean }>).detail.success
      ? 'Kalender aktualisiert.' : 'Der Kalender konnte nicht aktualisiert werden. Bitte Kalenderzugriff in den Systemeinstellungen prüfen und erneut versuchen.');
    window.addEventListener('device-calendar-sync', onSync);
    return () => window.removeEventListener('device-calendar-sync', onSync);
  }, []);
  const confirm = async () => {
    if (busy || !available) return;
    setBusy(true); setMessage('');
    try {
      const access = await CalendarSync.requestAccess();
      if (!access.available || access.permission !== 'granted') {
        setMessage('Kalenderzugriff wurde nicht erteilt. Bitte den Zugriff in den Systemeinstellungen erlauben.');
        return;
      }
      if (enabled) await onRefresh();
      else await onEnable();
    } catch { setMessage('Kalendersynchronisierung fehlgeschlagen. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  };
  return <ConfirmDialog title={enabled ? 'Kalender verbunden' : 'Stundenplan mit Kalender teilen'}
    className="calendar-share-dialog"
    isDanger={false} confirmLabel={busy ? 'Bitte warten …' : enabled ? 'Jetzt aktualisieren' : 'Kalender verbinden'}
    confirmDisabled={busy || !available} cancelDisabled={busy} cancelLabel="Schließen"
    onConfirm={() => void confirm()} onCancel={() => { if (!busy) onClose(); }}
    message={<>
      {message ? <p role="status">{message}</p> : <p>
        {enabled ? 'Dein Stundenplan ist mit dem Kalender „DHBW Planner“ verbunden.' : 'Mit Kalenderzugriff überträgt die App deinen Stundenplan in den Kalender „DHBW Planner“.'}
        {available && ' Änderungen werden nach Aktualisierungen in der App automatisch übernommen.'}
      </p>}
      {enabled && <button type="button" className="dialog-btn dialog-btn--secondary" disabled={busy || !available}
        title="Bereits übertragene Termine bleiben erhalten" onClick={() => {
          setBusy(true);
          void onDisable().then(onClose).catch(() => setMessage('Synchronisierung konnte nicht pausiert werden.')).finally(() => setBusy(false));
        }}>Synchronisierung pausieren</button>}
    </>} />;
}
