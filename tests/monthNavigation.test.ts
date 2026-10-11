import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_SETTINGS } from '../src/store/preferences';
import { monthWeekKeys } from '../src/ui/monthLayout';

const { ensureWeek, applySettings } = vi.hoisted(() => ({ ensureWeek: vi.fn(), applySettings: vi.fn() }));
vi.mock('../src/ui/useSchedule', () => ({ useSchedule: () => ({
  settings: { ...DEFAULT_SETTINGS, rapla: { baseUrl: 'https://example.test', user: 'test', file: 'test' }, mensaEnabled: false },
  entries: [], allEntries: [], availableModules: [], updatedAt: null, refreshing: false, offline: false, isReviewDemo: false,
  ensureWeek, applySettings, refresh: vi.fn(),
}) }));
vi.mock('../src/ui/useMensa', () => ({ useMensa: () => ({}) }));
vi.mock('../src/ui/useDualis', () => ({ useDualis: () => ({ loginState: 'logged-out', isReviewDemo: false }) }));
vi.mock('../src/ui/useBackButton', () => ({ useBackButton: vi.fn() }));
import { App } from '../src/ui/App';

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-31T12:00:00Z'));
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  ensureWeek.mockReset(); applySettings.mockReset();
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container);
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

  it('öffnet auch einen Nachbarmonatstag in der Tagesansicht', () => {
    click('.segmented button:nth-child(3)');
    click('[data-day="2026-04-05"]');
    expect(container.querySelector('.monthview')).toBeNull();
    expect(container.querySelector('.segmented .is-active')?.textContent).toBe('Tag');
    expect(container.querySelector('.app__day')?.textContent).toBe('Sonntag');
    expect(container.querySelector('.app__subtitle')?.textContent).toBe('5. April');
  });

  it('bietet die Monatsansicht als gespeicherte Standardansicht an', () => {
    click('[aria-label="Einstellungen"]');
    const select = container.querySelector<HTMLSelectElement>('[aria-label="Standardansicht auswählen"]')!;
    expect([...select.options].map((option) => option.value)).toEqual(['day', 'week', 'month']);
    act(() => { select.value = 'month'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(applySettings).toHaveBeenCalledWith(expect.objectContaining({ defaultCalendarView: 'month' }));
  });
});
