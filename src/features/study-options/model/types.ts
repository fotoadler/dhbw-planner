import type { AppSettings } from '../../../store/preferences';
import type { ScheduleModule } from '../../../schedule/modules';
import type { ScheduleEntry } from '../../../types';

export interface ModuleSelectionProps {
  settings: AppSettings;
  modules: ScheduleModule[];
  entries?: ScheduleEntry[];
  initiallyOpen?: boolean;
  setup?: boolean;
  onChange: (settings: AppSettings) => void;
}
