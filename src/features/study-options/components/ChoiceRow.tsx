import type { ScheduleModule } from '../../../schedule/modules';
import { choiceLabel } from '../model/presentation';

interface Props {
  module: ScheduleModule;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function ChoiceRow({ module, checked, onChange }: Props) {
  const { title, detail } = choiceLabel(module.label);
  return <label className="sheet__module study-choice__row">
    <input type="checkbox" aria-label={module.label} checked={checked} onChange={e => onChange(e.target.checked)} />
    <span>{title}{detail && <small>{detail}</small>}</span>
  </label>;
}
