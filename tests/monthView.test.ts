import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MonthView } from '../src/ui/MonthView';
import { monthDays, monthTitle, monthWeekKeys, shiftMonth } from '../src/ui/monthLayout';
import type { ScheduleEntry } from '../src/types';

describe('Berliner Monatskalender', () => {
  it.each([
    ['2026-02-15', '2026-01-26', '2026-03-01', 35],
    ['2026-03-29', '2026-02-23', '2026-04-05', 42],
    ['2026-10-25', '2026-09-28', '2026-11-01', 35],
    ['2028-02-29', '2028-01-31', '2028-03-05', 35],
    ['2027-02-01', '2027-02-01', '2027-02-28', 28],
  ])('bildet ganze Mo–So-Wochen für %s einschließlich DST und Schaltjahr', (day, first, last, count) => {
    const days = monthDays(String(day));
    expect(days).toHaveLength(Number(count));
    expect(days[0]).toBe(first);
    expect(days[days.length - 1]).toBe(last);
    expect(new Set(days).size).toBe(count);
    expect(monthWeekKeys(String(day))).toEqual(days.filter((_, i) => i % 7 === 0));
  });

  it.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2028-01-31', 1, '2028-02-29'],
    ['2026-03-31', -1, '2026-02-28'],
    ['2026-12-20', 1, '2027-01-20'],
    ['2026-01-10', -1, '2025-12-10'],
  ])('wechselt von %s ohne Monatsüberlauf', (day, delta, expected) => {
    expect(shiftMonth(String(day), delta as 1 | -1)).toBe(expected);
  });

  it('zeigt den Monat und das Jahr unabhängig von der Gerätezeitzone', () => {
    expect(monthTitle('2026-10-31')).toBe('Oktober 2026');
  });
});

let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
});

describe('Monatsansicht', () => {
  it('zeigt Wochenenden, Nachbarmonat, heutigen Tag, Terminzähler und Prüfungen', () => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div'); document.body.append(container);
    root = createRoot(container);
    const onSelectDay = vi.fn(); const onShiftMonth = vi.fn();
    const entries: ScheduleEntry[] = [0, 1, 2].map((i) => ({ start: new Date(`2026-10-11T${10 + i}:00:00+02:00`), end: new Date(`2026-10-11T${11 + i}:00:00+02:00`), title: `Termin ${i}`, type: i === 2 ? 'exam' : 'lecture', lecturers: [], rooms: [] }));
    act(() => root!.render(createElement(MonthView, { selectedDay: '2026-10-01', today: '2026-10-11', entriesByDay: { '2026-10-11': entries }, onSelectDay, onShiftMonth })));
    const today = container.querySelector<HTMLButtonElement>('[data-day="2026-10-11"]')!;
    expect(container.querySelectorAll('.monthview__day')).toHaveLength(35);
    expect(today.getAttribute('aria-current')).toBe('date');
    expect(today.getAttribute('aria-label')).toContain('3 Termine');
    expect(today.querySelector('.monthview__more')?.textContent).toBe('+1 weitere');
    expect(today.querySelector('.monthview__dots .is-exam')).not.toBeNull();
    expect(container.querySelector('[data-day="2026-09-28"]')?.classList.contains('is-outside')).toBe(true);
    act(() => today.click()); expect(onSelectDay).toHaveBeenCalledWith('2026-10-11');
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Vorheriger Monat"]')!.click());
    act(() => container.querySelector<HTMLButtonElement>('[aria-label="Nächster Monat"]')!.click());
    expect(onShiftMonth.mock.calls).toEqual([[-1], [1]]);
    const empty = container.querySelector<HTMLButtonElement>('[data-day="2026-09-28"]')!;
    expect(empty.getAttribute('aria-label')).toContain('keine Termine');
    act(() => empty.click()); expect(onSelectDay).toHaveBeenCalledWith('2026-09-28');
  });
});

function mountSwipe() {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  const onSelectDay = vi.fn(), onShiftMonth = vi.fn();
  act(() => root!.render(createElement(MonthView, { selectedDay: '2026-10-01', today: '2026-10-11', entriesByDay: {}, onSelectDay, onShiftMonth })));
  return { onSelectDay, onShiftMonth, day: container.querySelector<HTMLButtonElement>('[data-day="2026-10-11"]')! };
}
function touch(target: Element, type: string, points: number[][]) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const touches = points.map(([clientX, clientY]) => ({ clientX, clientY }));
  Object.defineProperties(event, { touches: { value: type === 'touchend' ? [] : touches }, changedTouches: { value: touches } });
  act(() => target.dispatchEvent(event)); return event;
}
it.each([[-100, 1], [100, -1]])('wechselt beim horizontalen Wischen %s genau einen Monat ohne Tagespopup', (dx, delta) => {
  const { day, onShiftMonth, onSelectDay } = mountSwipe();
  touch(day, 'touchstart', [[160, 200]]);
  expect(touch(day, 'touchmove', [[160 + dx, 205]]).defaultPrevented).toBe(true);
  touch(day, 'touchend', [[160 + dx, 205]]);
  act(() => day.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 })));
  expect(onShiftMonth.mock.calls).toEqual([[delta]]); expect(onSelectDay).not.toHaveBeenCalled();
  touch(day, 'touchstart', [[160, 200]]); touch(day, 'touchend', [[160, 200]]);
  act(() => day.click()); expect(onSelectDay).toHaveBeenCalledOnce();
});
it('lässt vertikales Scrollen zu und ignoriert kurze, abgebrochene und Mehrfinger-Gesten', () => {
  const { day, onShiftMonth } = mountSwipe();
  touch(day, 'touchstart', [[160, 200]]);
  expect(touch(day, 'touchmove', [[165, 300]]).defaultPrevented).toBe(false);
  touch(day, 'touchend', [[165, 300]]);
  touch(day, 'touchstart', [[160, 200]]); touch(day, 'touchmove', [[140, 200]]); touch(day, 'touchend', [[140, 200]]);
  touch(day, 'touchstart', [[160, 200]]); touch(day, 'touchmove', [[60, 200]]); touch(day, 'touchcancel', []); touch(day, 'touchend', [[60, 200]]);
  touch(day, 'touchstart', [[160, 200]]); touch(day, 'touchstart', [[160, 200], [180, 200]]); touch(day, 'touchmove', [[60, 200]]); touch(day, 'touchend', [[60, 200]]);
  expect(onShiftMonth).not.toHaveBeenCalled();
});
