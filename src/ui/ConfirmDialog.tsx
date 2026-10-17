import React, { useEffect, useId } from 'react';

interface Props {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  isDanger?: boolean;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  className?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel = 'Abbrechen',
  isDanger = true,
  confirmDisabled = false,
  cancelDisabled = false,
  className = '',
  onConfirm,
  onCancel,
}: Props) {
  const titleId = useId();
  useEffect(() => {
    window.getSelection()?.removeAllRanges();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" onClick={onCancel} role="dialog" aria-modal="true" aria-labelledby={titleId} onContextMenu={event => { if (!(event.target as HTMLElement).closest('input, textarea, [contenteditable="true"]')) event.preventDefault(); }}>
      <div className={`dialog-card ${className}`} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} className="dialog-title">{title}</h3>
        <div className="dialog-message">{message}</div>
        <div className="dialog-actions">
          <button type="button" className="dialog-btn dialog-btn--secondary" disabled={cancelDisabled} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirmDisabled}
            className={`dialog-btn dialog-btn--primary${isDanger ? ' is-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
