import React, { useEffect } from 'react';

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
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div className="dialog-backdrop" onClick={onCancel} role="dialog" aria-modal="true">
      <div className={`dialog-card ${className}`} onClick={(e) => e.stopPropagation()}>
        <h3 className="dialog-title">{title}</h3>
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
