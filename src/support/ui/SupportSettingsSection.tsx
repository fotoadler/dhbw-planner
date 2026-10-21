import { SUPPORT_COPY } from '../products';
import { SupportBenefits } from './SupportBenefits';

export function SupportSettingsSection({ onSupport, goldUnlocked }: {
  onSupport: () => void;
  goldUnlocked: boolean;
}) {
  return <section className="sheet__section support-settings">
    <p className="sheet__note">{SUPPORT_COPY}</p>
    <SupportBenefits unlocked={goldUnlocked} gold />
    <button type="button" className="setup__button sheet__feedback-button" onClick={onSupport}>App unterstützen</button>
  </section>;
}
