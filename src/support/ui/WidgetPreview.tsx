import { useRef, useState } from 'react';
import { SupportPreviewDialog } from './SupportPreviewDialog';
import small from '../assets/widget-small.png';
import medium from '../assets/widget-medium.png';
import large from '../assets/widget-large.png';
const sizes = [
  { name: 'Klein', image: small, className: 'is-small', alt: 'Kleines Stundenplan-Widget mit Medienwirtschaft von 17:50 bis 18:50' },
  { name: 'Mittel', image: medium, className: 'is-medium', alt: 'Mittleres Stundenplan-Widget mit Medienwirtschaft, Kommunikation und Raumangabe' },
  { name: 'Groß', image: large, className: 'is-large', alt: 'Großes Stundenplan-Widget mit fünf Vorlesungen, Uhrzeiten und Räumen' },
];
export function WidgetPreview({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const go = (next: number) => {
    const selected = Math.max(0, Math.min(2, next)); setIndex(selected);
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    track.current?.scrollTo?.({ left: selected * track.current.clientWidth, behavior: reduced ? 'auto' : 'smooth' });
  };
  return <SupportPreviewDialog title="Stundenplan-Widgets" onClose={onClose}>
    <p className="support-preview-copy">Dein Hauptkurs auf dem Home-Bildschirm.</p>
    <div className="support-widget-carousel" ref={track} role="region" aria-roledescription="Karussell" aria-label="Drei Widget-Größen" tabIndex={0}
      onKeyDown={event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(index + (event.key === 'ArrowRight' ? 1 : -1)); }
      }} onScroll={() => { if (track.current?.clientWidth) setIndex(Math.max(0, Math.min(2, Math.round(track.current.scrollLeft / track.current.clientWidth)))); }}>
      {sizes.map((size, position) => <figure key={size.name} className="support-widget-slide" aria-label={`${position + 1} von 3: ${size.name}`}>
        <div className="support-widget-stage"><img className={size.className} src={size.image} alt={size.alt} draggable={false} /></div>
        <figcaption>{size.name}</figcaption>
      </figure>)}
    </div>
    <div className="support-carousel-nav">
      <button type="button" className="support-carousel-arrow" disabled={index === 0} onClick={() => go(index - 1)} aria-label="Vorherige Widget-Größe">‹</button>
      <div className="support-carousel-dots" aria-label="Größe auswählen">{sizes.map((size, position) => <button type="button" key={size.name}
        aria-label={`${size.name} anzeigen`} aria-current={position === index ? 'true' : undefined} onClick={() => go(position)}><span /></button>)}</div>
      <button type="button" className="support-carousel-arrow" disabled={index === 2} onClick={() => go(index + 1)} aria-label="Nächste Widget-Größe">›</button>
    </div>
    <p className="support-preview-caption">Beispielansichten · klein, mittel und groß inklusive.</p>
    <button type="button" className="dialog-btn dialog-btn--secondary" onClick={onClose}>Schließen</button>
  </SupportPreviewDialog>;
}
