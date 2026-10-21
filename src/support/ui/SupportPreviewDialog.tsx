import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { registerSupportPreview } from '../previewNavigation';

export function SupportPreviewDialog({ title, children, onClose, busy = false }: {
  title: string; children: ReactNode; onClose: () => void; busy?: boolean;
}) {
  const titleId = useId();
  const card = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const locked = useRef(busy); locked.current = busy;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dismiss = () => { if (!locked.current) close.current(); };
    const unregister = registerSupportPreview(dismiss);
    const previousOverflow = document.body.style.overflow;
    const background = document.getElementById('root');
    const wasInert = background?.hasAttribute('inert');
    background?.setAttribute('inert', '');
    document.body.style.overflow = 'hidden'; card.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); dismiss(); }
      if (event.key === 'Tab') {
        event.stopImmediatePropagation();
        const controls = [...card.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex="0"]') ?? []];
        const first = controls[0], last = controls[controls.length - 1];
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === first || document.activeElement === card.current)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === card.current)) { event.preventDefault(); first.focus(); }
      }
    };
    // Capture prevents Escape/Tab from reaching an underlying purchase dialog.
    window.addEventListener('keydown', onKey, true);
    return () => {
      unregister(); window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      if (!wasInert) background?.removeAttribute('inert');
      previous?.focus();
    };
  }, []);
  useEffect(() => { card.current?.focus(); }, [title]);
  return createPortal(<div className="dialog-backdrop support-preview-backdrop" onClick={event => { event.stopPropagation(); if (!busy) onClose(); }}>
    <div className="dialog-card support-preview" ref={card} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
      <div className="support-preview-heading">
        <h3 id={titleId} className="dialog-title">{title}</h3>
        <button type="button" className="support-preview-x" disabled={busy} aria-label="Vorschau schließen" onClick={onClose}>×</button>
      </div>
      {children}
    </div>
  </div>, document.body);
}
