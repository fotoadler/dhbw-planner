import type { CSSProperties } from 'react';

const COLORS = ['#e60028', '#edb94f', '#f7d889', '#ef718c', '#729bca'];

/** A single, decorative burst. No ongoing animation or purchase logic. */
export function SupportThanks({ titleId, descriptionId }: { titleId: string; descriptionId: string }) {
  return <div className="support-thanks" role="status" aria-live="polite">
    <div className="support-confetti" aria-hidden="true">
      {Array.from({ length: 44 }, (_, i) => <span key={i} style={{
        '--confetti-x': `${((i * 47) % 320) - 160}px`,
        '--confetti-y': `${-80 - (i * 31) % 130}px`,
        '--confetti-turn': `${180 + (i * 73) % 540}deg`,
        '--confetti-delay': `${(i % 8) * 35}ms`,
        '--confetti-color': COLORS[i % COLORS.length],
      } as CSSProperties} />)}
    </div>
    <div className="support-thanks-heart" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="48" height="48" fill="currentColor">
        <path d="M24 41 7.6 25.3C-4.2 13.9 12.3-1.3 24 11.7 35.7-1.3 52.2 13.9 40.4 25.3Z" />
      </svg>
    </div>
    <h3 id={titleId} className="dialog-title">Ein großes Dankeschön an dich!</h3>
    <p id={descriptionId} className="dialog-message">Mit deiner Unterstützung hilfst du, die laufenden Kosten der App zu decken. Das bedeutet mir viel!</p>
    <p className="support-thanks-signature">Deine Widgets und das goldene App-Symbol sind freigeschaltet.<br />Danke! Christian</p>
  </div>;
}
