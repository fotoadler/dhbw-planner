import { describe, expect, it } from 'vitest';
import { BackNavigationState, resolveBackAction } from '../src/ui/backNavigation';

function state(overrides: Partial<BackNavigationState> = {}): BackNavigationState {
  return {
    showSettings: false,
    selectedBlockKey: null,
    section: 'calendar',
    calendarView: 'day',
    dualisPage: 'overview',
    dualisLoggedIn: false,
    ...overrides,
  };
}

describe('resolveBackAction', () => {
  it('beendet die App auf der obersten Ebene (Kalender/Tagesansicht)', () => {
    expect(resolveBackAction(state())).toBe('exit-app');
  });

  it('schließt zuerst das Einstellungen-Sheet', () => {
    expect(resolveBackAction(state({ showSettings: true }))).toBe('close-settings');
  });

  it('schließt das Sheet auch, wenn darunter noch Ebenen offen sind', () => {
    const open = state({ showSettings: true, selectedBlockKey: 'block', section: 'mail' });
    expect(resolveBackAction(open)).toBe('close-settings');
  });

  it('schließt das Kursdetail vor dem Bereichswechsel', () => {
    expect(resolveBackAction(state({ selectedBlockKey: 'block' }))).toBe('close-course');
  });

  it('verlässt die Mail-Ansicht zum Kalender', () => {
    expect(resolveBackAction(state({ section: 'mail' }))).toBe('to-calendar');
  });

  it('geht von den Dualis-Prüfungen zurück zur Übersicht', () => {
    const exams = state({ section: 'dualis', dualisPage: 'exams', dualisLoggedIn: true });
    expect(resolveBackAction(exams)).toBe('to-dualis-overview');
  });

  it('verlässt Dualis zum Kalender, sobald die Übersicht offen ist', () => {
    const overview = state({ section: 'dualis', dualisPage: 'overview', dualisLoggedIn: true });
    expect(resolveBackAction(overview)).toBe('to-calendar');
  });

  it('überspringt die Unterseite, wenn niemand angemeldet ist', () => {
    // Ohne Login gibt es keine Subnav — 'exams' wäre eine unsichtbare Ebene.
    const loggedOut = state({ section: 'dualis', dualisPage: 'exams', dualisLoggedIn: false });
    expect(resolveBackAction(loggedOut)).toBe('to-calendar');
  });

  it('wechselt von der Wochen- in die Tagesansicht', () => {
    expect(resolveBackAction(state({ calendarView: 'week' }))).toBe('to-calendar-day');
  });

  it('baut den Zustand Ebene für Ebene ab, statt mehrere zu überspringen', () => {
    const deep = state({
      showSettings: true,
      selectedBlockKey: 'block',
      section: 'dualis',
      dualisPage: 'exams',
      dualisLoggedIn: true,
      calendarView: 'week',
    });
    expect(resolveBackAction(deep)).toBe('close-settings');
    expect(resolveBackAction({ ...deep, showSettings: false })).toBe('close-course');
    expect(resolveBackAction({ ...deep, showSettings: false, selectedBlockKey: null })).toBe(
      'to-dualis-overview',
    );
  });
});
