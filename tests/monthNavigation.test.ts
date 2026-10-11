import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_SETTINGS } from '../src/store/preferences';
import { monthWeekKeys } from '../src/ui/monthLayout';
import type { ScheduleEntry } from '../src/types';

const { ensureWeek, applySettings } = vi.hoisted(() => ({ ensureWeek: vi.fn(), applySettings: vi.fn() }));
const scheduleState = vi.hoisted(() => ({ entries: [] as ScheduleEntry[] }));
const backHandler = vi.hoisted(() => ({ current: undefined as (() => boolean) | undefined }));
vi.mock('../src/ui/useSchedule', () => ({ useSchedule: () => ({
  settings: { ...DEFAULT_SETTINGS, rapla: { baseUrl: 'https://example.test', user: 'test', file: 'test' }, mensaEnabled: false },
  entries: scheduleState.entries, allEntries: scheduleState.entries, availableModules: [], updatedAt: null, refreshing: false, offline: false, isReviewDemo: false,
  ensureWeek, applySettings, refresh: vi.fn(),
}) }));
vi.mock('../src/ui/useMensa', () => ({ useMensa: () => ({}) }));
vi.mock('../src/ui/useDualis', () => ({ useDualis: () => ({ loginState: 'logged-out', isReviewDemo: false }) }));
vi.mock('../src/ui/useBackButton', () => ({ useBackButton: (handler: () => boolean) => { backHandler.current = handler; } }));
import { App } from '../src/ui/App';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-31T12:00:00Z'));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  ensureWeek.mockReset(); applySettings.mockReset();
  scheduleState.entries = [];
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); container.id = 'root'; document.body.append(container);
  root = createRoot(container);
  act(() => root.render(createElement(App)));
});
afterEach(() => {
  act(() => root.unmount()); container.remove();
  vi.unstubAllGlobals(); vi.useRealTimers();
});
function click(selector: string) { act(() => container.querySelector<HTMLButtonElement>(selector)!.click()); }

describe('Monatsnavigation in der App', () => {
  it('lädt alle sichtbaren Wochen, wechselt Monate und springt über Heute zurück', () => {
    expect(container.querySelectorAll('.segmented button')).toHaveLength(3);
    click('.segmented button:nth-child(3)');
    expect(container.querySelector('.app__day')?.textContent).toBe('März 2026');
    expect(ensureWeek.mock.calls.map(([day]) => day)).toEqual(monthWeekKeys('2026-03-31'));
    ensureWeek.mockClear();
    click('[aria-label="Nächster Monat"]');
    expect(container.querySelector('.app__day')?.textContent).toBe('April 2026');
    expect(container.querySelector('[data-day="2026-04-30"]')?.classList.contains('is-selected')).toBe(true);
    expect(ensureWeek.mock.calls.map(([day]) => day)).toEqual(['2026-04-27', ...monthWeekKeys('2026-04-30')]);
    click('.app__todaybtn');
    expect(container.querySelector('.app__day')?.textContent).toBe('März 2026');
    expect(container.querySelector('.app__todaybtn')).toBeNull();
  });

  it('öffnet für einen leeren Nachbarmonatstag zuerst das Detailfenster und dann die Tagesansicht', () => {
    click('.segmented button:nth-child(3)');
    click('[data-day="2026-04-05"]');
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('Termine des Tages');
    expect(dialog.textContent).toContain('An diesem Tag sind keine Termine.');
    expect(dialog.textContent).toContain('Sonntag, 5. April');
    expect(container.querySelector('.segmented .is-active')?.textContent).toBe('Monat');
    expect(container.querySelector('.app__day')?.textContent).toBe('März 2026');
    act(() => dialog.querySelector<HTMLButtonElement>('.weekdetails__footer button')!.click());
    expect(container.querySelector('.monthview')).toBeNull();
    expect(container.querySelector('.segmented .is-active')?.textContent).toBe('Tag');
    expect(container.querySelector('.app__day')?.textContent).toBe('Sonntag');
    expect(container.querySelector('.app__subtitle')?.textContent).toBe('5. April');
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it('zeigt alle Tagesereignisse chronologisch und aktualisiert nachgeladene Termine im offenen Fenster', () => {
    const entry = (time: string, title: string): ScheduleEntry => ({
      start: new Date(`2026-03-31T${time}:00+02:00`), end: new Date(`2026-03-31T${time}:00+02:00`),
      title, rooms: ['A1'], lecturers: ['Dozent Beispiel'], type: 'lecture',
    });
    scheduleState.entries = [entry('15:00', 'Nachmittag'), entry('00:00', 'Ganztägig'), entry('09:00', 'Vormittag')];
    act(() => root.render(createElement(App)));
    click('.segmented button:nth-child(3)');
    click('[data-day="2026-03-31"]');
    const titles = () => [...document.querySelectorAll('.weekdetails__entry h3')].map((element) => element.textContent);
    expect(titles()).toEqual(['Ganztägig', 'Vormittag', 'Nachmittag']);
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('Raum: A1');
    expect(document.querySelector('[role="dialog"]')?.textContent).not.toContain('überschneidende Termine');
    scheduleState.entries = [...scheduleState.entries, entry('07:00', 'Früher Termin')];
    act(() => root.render(createElement(App)));
    expect(titles()).toEqual(['Ganztägig', 'Früher Termin', 'Vormittag', 'Nachmittag']);
    act(() => document.querySelector<HTMLButtonElement>('.weekdetails__close')!.click());
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('.segmented .is-active')?.textContent).toBe('Monat');
  });

  it('schließt bei Zurück zuerst die Monatsdetails und behält die Monatsansicht', () => {
    click('.segmented button:nth-child(3)');
    click('[data-day="2026-03-31"]');
    act(() => { expect(backHandler.current!()).toBe(true); });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(container.querySelector('.segmented .is-active')?.textContent).toBe('Monat');
    act(() => { expect(backHandler.current!()).toBe(true); });
    expect(container.querySelector('.segmented .is-active')?.textContent).toBe('Tag');
  });

  it('bietet die Monatsansicht als gespeicherte Standardansicht an', () => {
    click('[aria-label="Einstellungen"]');
    const select = container.querySelector<HTMLSelectElement>('[aria-label="Standardansicht auswählen"]')!;
    expect([...select.options].map((option) => option.value)).toEqual(['day', 'week', 'month']);
    act(() => { select.value = 'month'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(applySettings).toHaveBeenCalledWith(expect.objectContaining({ defaultCalendarView: 'month' }));
  });
});
