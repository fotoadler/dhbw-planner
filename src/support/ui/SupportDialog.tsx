import { useEffect, useId, useRef, useState } from 'react';
import type { Product } from '@capgo/native-purchases';
import { isGoldProduct, loadSupportProducts, nativeSupportAvailable, purchaseSupport, type SupportProductId } from '../purchases';
import { setSupporterIcon } from '../icon';
import { SupportCopy } from './SupportCopy';
import { SupportThanks } from './SupportThanks';
import { SupportBenefits } from './SupportBenefits';

interface Props {
  automatic: boolean;
  storePending?: boolean;
  products: Product[];
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onProducts: (products: Product[]) => void;
  onClose: () => void;
  onSupported: () => Promise<void>;
}

export function SupportDialog({ automatic, storePending = false, products, busy, onBusy, onProducts, onClose, onSupported }: Props) {
  const titleId = useId();
  const descriptionId = useId();
  const card = useRef<HTMLDivElement>(null);
  const locked = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [goldUnlocked, setGoldUnlocked] = useState(false);
  const [iconBusy, setIconBusy] = useState(false);
  const repeatSupport = products.length > 0 && products.every(product => !isGoldProduct(product.identifier));
  const [iconMessage, setIconMessage] = useState('');

  useEffect(() => { setPending(storePending); }, [storePending]);

  useEffect(() => { if (success) card.current?.focus(); }, [success]);

  useEffect(() => {
    let active = true;
    void loadSupportProducts().then(items => { if (active) onProducts(items); })
      .catch(() => { if (active) setMessage('Die Unterstützung ist gerade nicht verfügbar. Bitte später erneut versuchen.'); })
      .finally(() => { if (active) setLoading(false); });
    const previous = document.activeElement as HTMLElement | null;
    card.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); }
      if (event.key === 'Tab') {
        const buttons = [...card.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)') ?? []];
        if (!buttons.length) { event.preventDefault(); return; }
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === card.current)) {
          event.preventDefault(); last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === card.current)) {
          event.preventDefault(); first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => { active = false; document.removeEventListener('keydown', handleKey); previous?.focus(); };
  }, []);

  const purchase = async (id: SupportProductId) => {
    if (locked.current || busy || loading || pending || storePending) return;
    locked.current = true; onBusy(true); setMessage('');
    try {
      const result = await purchaseSupport(id, () => { setSuccess(true); setMessage(''); setGoldUnlocked(isGoldProduct(id)); });
      if (result === 'success') {
        setSuccess(true); setMessage('');
        await onSupported();
      } else if (result === 'pending') {
        setPending(true);
        setMessage('Die Zahlung wartet noch auf Bestätigung. Bitte nicht erneut kaufen.');
        await onSupported();
      } else setMessage('Kauf abgebrochen. Es wurde keine Unterstützung abgeschlossen.');
    } catch {
      setMessage('Der Kauf konnte nicht vollständig bestätigt werden. Bitte prüfe deine Käufe im Store, bevor du es erneut versuchst.');
    } finally { locked.current = false; onBusy(false); }
  };

  return <div className="dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby={titleId}
    aria-describedby={descriptionId} onClick={onClose}>
    <div className="dialog-card support-dialog" ref={card} tabIndex={-1} onClick={event => event.stopPropagation()}>
      {success ? <SupportThanks titleId={titleId} descriptionId={descriptionId} alreadyUnlocked={repeatSupport} /> : busy ? <div className="support-purchasing" role="status" aria-live="polite">
        <span className="support-spinner" aria-hidden="true" />
        <h3 id={titleId} className="dialog-title">Einen Moment …</h3>
        <p id={descriptionId} className="dialog-message">Dein Kauf wird bestätigt.</p>
      </div> : <>
        <h3 id={titleId} className="dialog-title">{repeatSupport ? 'Erneut unterstützen' : 'DHBW Planner unterstützen'}</h3>
        <p id={descriptionId} className="dialog-message support-copy">{repeatSupport ? 'Deine Extras bleiben freigeschaltet. Danke, dass du die App erneut unterstützen möchtest!' : <SupportCopy />}</p>
      </>}
      {!success && !busy && <SupportBenefits gold unlocked={repeatSupport} heading={repeatSupport ? 'Bereits für dich freigeschaltet:' : undefined} />}
      {!success && !busy && <div className="support-prices" aria-label="Betrag auswählen" aria-busy={loading}>
        {products.map(product => <button type="button" className="dialog-btn dialog-btn--primary"
          key={product.identifier} disabled={busy || loading || pending || storePending}
          aria-label={`Mit ${product.priceString} unterstützen`}
          onClick={() => void purchase(product.identifier as SupportProductId)}>{product.priceString}</button>)}
      </div>}
      {success && goldUnlocked && <>
        <button type="button" className="dialog-btn dialog-btn--primary" disabled={busy || iconBusy}
          onClick={() => {
            setIconBusy(true);
            void setSupporterIcon(true).then(() => setIconMessage('Dein goldenes App-Symbol ist aktiviert.'))
              .catch(() => setIconMessage('Das Symbol konnte nicht geändert werden. Du kannst es in den Einstellungen erneut versuchen.'))
              .finally(() => setIconBusy(false));
          }}>Goldenes Symbol aktivieren</button>
        {iconMessage && <p className="support-status" role="status">{iconMessage}</p>}
      </>}
      {!success && !busy && <p className="support-status" role="status" aria-live="polite">{message || (pending || storePending ? 'Die Zahlung wartet noch auf Bestätigung. Bitte nicht erneut kaufen.' : loading ? 'Preise werden geladen …' :
        products.length === 0 ? nativeSupportAvailable() ? 'Die Unterstützung ist gerade nicht verfügbar. Bitte später erneut versuchen.' :
          'Unterstützung ist in der installierten iOS- und Android-App möglich.' : '')}</p>}
      {(!busy || success) && <button type="button" className="dialog-btn dialog-btn--secondary support-close" disabled={busy} onClick={onClose}>
        {success || !automatic ? 'Schließen' : 'Später erinnern'}
      </button>}

    </div>
  </div>;
}
