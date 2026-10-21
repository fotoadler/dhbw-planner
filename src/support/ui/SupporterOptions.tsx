import { useState } from 'react';
import { restoreSupportPurchases } from '../purchases';

export function SupporterOptions({ onRestored }: { onRestored: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const restore = async () => {
    if (busy) return;
    setBusy(true); setMessage('Käufe werden wiederhergestellt …');
    try {
      const found = await restoreSupportPurchases();
      await onRestored();
      setMessage(found ? 'Widgets und Gold-Symbol sind freigeschaltet.' : 'Keine Freischaltung gefunden. Bitte dasselbe Store-Konto verwenden.');
    } catch { setMessage('Wiederherstellen gerade nicht möglich. Bitte später erneut versuchen.'); }
    finally { setBusy(false); }
  };
  return <>
    <div className="support-settings-actions">
      <button type="button" className="sheet__textbtn" disabled={busy} onClick={() => void restore()}>Käufe wiederherstellen</button>
    </div>
    {message && <p className="sheet__note" role="status">{message}</p>}
  </>;
}
