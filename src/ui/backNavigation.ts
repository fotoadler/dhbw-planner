/**
 * Zurück-Navigation (pure, testbar — ohne Plugin- oder React-Zugriff).
 *
 * Die App hat keine History: Alle Ebenen sind React-State. Diese Funktion
 * entscheidet allein aus dem sichtbaren Zustand, welche Ebene ein Zurück-Druck
 * abbaut. Reihenfolge = Stapelreihenfolge auf dem Bildschirm, von oben nach
 * unten. Ist keine Ebene mehr offen, wird die App beendet.
 *
 * Der Plugin-Teil liegt in useBackButton.ts.
 */

export type Section = 'calendar' | 'dualis' | 'mail';
export type CalendarView = 'day' | 'week';
export type DualisPage = 'overview' | 'exams';

export interface BackNavigationState {
  /** Einstellungen-Sheet liegt über allem. */
  showSettings: boolean;
  /** Kursdetail (CourseView) innerhalb des Kalenders. */
  selectedBlockKey: string | null;
  section: Section;
  calendarView: CalendarView;
  dualisPage: DualisPage;
  /** Die Dualis-Unterseiten existieren nur in der angemeldeten Ansicht. */
  dualisLoggedIn: boolean;
}

export type BackAction =
  | 'close-settings'
  | 'close-course'
  | 'to-calendar'
  | 'to-dualis-overview'
  | 'to-calendar-day'
  | 'exit-app';

export function resolveBackAction(state: BackNavigationState): BackAction {
  if (state.showSettings) return 'close-settings';
  if (state.selectedBlockKey) return 'close-course';
  if (state.section === 'mail') return 'to-calendar';
  if (state.section === 'dualis') {
    return state.dualisPage === 'exams' && state.dualisLoggedIn ? 'to-dualis-overview' : 'to-calendar';
  }
  if (state.calendarView === 'week') return 'to-calendar-day';
  return 'exit-app';
}
