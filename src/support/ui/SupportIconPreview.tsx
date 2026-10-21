import { useEffect, useState } from 'react';
import { getSupporterIcon, setSupporterIcon } from '../icon';
import { SupportPreviewDialog } from './SupportPreviewDialog';
import standardIcon from '../../../assets/app-icon-1024.png';
import goldIcon from '../assets/app-icon-gold.png';

export function SupportIconPreview({ unlocked, onClose, chooseInitially = false }: {
  unlocked: boolean; onClose: () => void; chooseInitially?: boolean;
}) {
  const [choosing, setChoosing] = useState(chooseInitially && unlocked);
  const [gold, setGold] = useState(false);
  const [available, setAvailable] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    void getSupporterIcon().then(icon => { if (active) { setGold(icon.gold); setAvailable(icon.available); } })
      .catch(() => { if (active) setMessage('App-Symbol gerade nicht verfügbar.'); })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, []);
  const choose = async (next: boolean) => {
    if (busy || !unlocked || !available || !loaded) return;
    setBusy(true); setMessage('');
    try { await setSupporterIcon(next); setGold(next); setMessage(next ? 'Dein Gold-Symbol ist aktiviert.' : 'Dein rotes App-Symbol ist aktiviert.'); }
    catch { setMessage('Das Symbol konnte nicht geändert werden. Bitte erneut versuchen.'); }
    finally { setBusy(false); }
  };
  return <SupportPreviewDialog title={choosing ? 'App-Symbol ändern' : 'Dein App-Symbol in Gold'} onClose={onClose} busy={busy}>
    <p className="support-preview-copy">{choosing ? 'Welches Symbol möchtest du verwenden?' : 'Ein goldener Look als Dankeschön.'}</p>
    <div className={`support-icon-showcase${choosing ? ' is-choosing' : ''}`} role={choosing ? 'group' : undefined} aria-label={choosing ? 'App-Symbol auswählen' : undefined}>
      {[false, true].map(next => choosing ? <button type="button" className="support-icon-choice" key={String(next)} aria-pressed={gold === next}
        disabled={busy || !available || !loaded} onClick={() => void choose(next)}>
        <img src={next ? goldIcon : standardIcon} alt="" width="96" height="96" /><span>{next ? 'Gold' : 'Rot'}</span>
        <span className="support-icon-selected" aria-hidden="true">{gold === next ? '✓' : ''}</span>
      </button> : <figure key={String(next)}><img src={next ? goldIcon : standardIcon} alt={next ? 'Goldenes DHBW-Planner-App-Symbol' : 'Rotes DHBW-Planner-App-Symbol'} width="104" height="104" /><figcaption>{next ? 'Gold' : 'Rot'}</figcaption></figure>)}
    </div>
    {choosing && !loaded && <p className="support-status" role="status">App-Symbole werden geladen …</p>}
    {choosing && loaded && !available && !message && <p className="support-status">In der installierten App kannst du dein Symbol wechseln.</p>}
    {message && <p className="support-status" role="status">{message}</p>}
    {!choosing && unlocked && <button type="button" className="dialog-btn dialog-btn--primary" onClick={() => setChoosing(true)}>App-Symbol ändern</button>}
    <button type="button" className="dialog-btn dialog-btn--secondary" disabled={busy} onClick={onClose}>Schließen</button>
  </SupportPreviewDialog>;
}
