import { useState } from 'react';
import { WidgetPreview } from './WidgetPreview';
import { SupportIconPreview } from './SupportIconPreview';

export function SupportBenefits({ unlocked = false, gold = false }: { unlocked?: boolean; gold?: boolean }) {
  const [preview, setPreview] = useState<'widgets' | 'icon' | null>(null);
  return <>
    {gold ? <section className="support-gold-benefits" aria-label="Als Dankeschön erhältst du:">
      <h4>Als Dankeschön erhältst du:</h4>
      <div className="support-gold-benefits-grid">
        <button type="button" className="support-gold-benefit" onClick={() => setPreview('widgets')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/></svg>
          <span>Stundenplan-Widgets</span><span className="support-benefit-arrow" aria-hidden="true">↗</span>
        </button>
        <button type="button" className="support-gold-benefit" onClick={() => setPreview('icon')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><path d="m12 7 1.5 3 3.3.5-2.4 2.3.6 3.2-3-1.5-3 1.5.6-3.2-2.4-2.3 3.3-.5Z" strokeLinejoin="round"/></svg>
          <span>Goldenes App-Symbol</span><span className="support-benefit-arrow" aria-hidden="true">↗</span>
        </button>
      </div>
    </section> : <ul className="support-benefits" aria-label="Bei jedem Betrag inklusive">
      <li><button type="button" onClick={() => setPreview('widgets')}>Stundenplan-Widgets <span aria-hidden="true">↗</span></button></li>
      <li><button type="button" onClick={() => setPreview('icon')}>Goldenes App-Symbol <span aria-hidden="true">↗</span></button></li>
    </ul>}
    {preview === 'widgets' && <WidgetPreview onClose={() => setPreview(null)} />}
    {preview === 'icon' && <SupportIconPreview unlocked={unlocked} onClose={() => setPreview(null)} />}
  </>;
}
