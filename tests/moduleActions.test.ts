import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EntryCard } from '../src/ui/EntryCard';
import { WeekView } from '../src/ui/WeekView';
import { WeekEventSheet } from '../src/ui/WeekEventSheet';
import { ConfirmDialog } from '../src/ui/ConfirmDialog';
import type { ScheduleEntry } from '../src/types';

let root: Root, container: HTMLDivElement;
const entry: ScheduleEntry = { title: 'Mobile Netzwerkarchitekturen', course: 'MA-TINF24', start: new Date('2026-10-12T09:00:00+02:00'), end: new Date('2026-10-12T11:00:00+02:00'), rooms: ['A1'], lecturers: [], type: 'lecture' };
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); vi.useRealTimers(); });
function pointer(target: Element, type: string, x = 20, y = 20) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: y });
  act(() => target.dispatchEvent(event));
  return event;
}

it('opens the day-card action only after release and consumes the following click', () => {
  const onSelect = vi.fn(), onToggleModule = vi.fn();
  act(() => root.render(createElement(EntryCard, { entry, onSelect, onToggleModule })));
  const card = container.querySelector('button')!;
  pointer(card, 'pointerdown'); act(() => vi.advanceTimersByTime(460));
  expect(onToggleModule).not.toHaveBeenCalled();
  expect(pointer(card, 'pointerup').defaultPrevented).toBe(true);
  expect(onToggleModule).toHaveBeenCalledExactlyOnceWith(entry.title);
  act(() => card.click()); expect(onSelect).not.toHaveBeenCalled();
  pointer(card, 'pointerdown'); pointer(card, 'pointerup'); act(() => card.click());
  expect(onSelect).toHaveBeenCalledExactlyOnceWith(entry);
});

it.each(['pointermove', 'pointercancel'])('cancels a held day card after %s', type => {
  const onToggleModule = vi.fn();
  act(() => root.render(createElement(EntryCard, { entry, onSelect: vi.fn(), onToggleModule })));
  const card = container.querySelector('button')!;
  pointer(card, 'pointerdown'); pointer(card, type, 40); act(() => vi.advanceTimersByTime(460)); pointer(card, 'pointerup');
  expect(onToggleModule).not.toHaveBeenCalled();
});

it('cancels a pending press on unmount', () => {
  const onToggleModule = vi.fn();
  act(() => root.render(createElement(EntryCard, { entry, onSelect: vi.fn(), onToggleModule })));
  pointer(container.querySelector('button')!, 'pointerdown');
  act(() => root.render(null)); act(() => vi.advanceTimersByTime(460));
  expect(onToggleModule).not.toHaveBeenCalled();
});

it('long-presses a specific parallel event without opening the cluster details', () => {
  const other = { ...entry, title: 'Parallelmodul' };
  const onToggleModule = vi.fn(), onSelectEntries = vi.fn();
  act(() => root.render(createElement(WeekView, { weekDays: ['2026-10-12'], today: '2026-10-12', entriesByDay: { '2026-10-12': [entry, other] }, onOpenDay: vi.fn(), onSwipeWeek: vi.fn(), onToggleModule, onSelectEntries })));
  const items = container.querySelectorAll('.weekview__parallel-item');
  pointer(items[1], 'pointerdown'); act(() => vi.advanceTimersByTime(460));
  expect(onToggleModule).not.toHaveBeenCalled(); pointer(items[1], 'pointerup');
  act(() => container.querySelector<HTMLButtonElement>('.weekview__event--parallel-group')!.click());
  expect(onToggleModule).toHaveBeenCalledExactlyOnceWith('Parallelmodul');
  expect(onSelectEntries).not.toHaveBeenCalled();
});

it('offers a direct module action in overlap details and closes the sheet before confirmation', () => {
  const onClose = vi.fn(), onToggleModule = vi.fn();
  act(() => root.render(createElement(WeekEventSheet, { day: '2026-10-12', entries: [entry], onClose, onOpenDay: vi.fn(), onToggleModule })));
  const action = document.querySelector<HTMLButtonElement>('.weekdetails__module-action')!;
  expect(action.textContent).toBe('Modul ausblenden'); act(() => action.click());
  expect(onClose).toHaveBeenCalledOnce(); expect(onToggleModule).toHaveBeenCalledExactlyOnceWith(entry.title);
  expect(onClose.mock.invocationCallOrder[0]).toBeLessThan(onToggleModule.mock.invocationCallOrder[0]);
});

it('clears a previous text selection and prevents the native context menu in the confirmation', () => {
  container.textContent = 'Selected text'; const range = document.createRange(); range.selectNodeContents(container); window.getSelection()!.addRange(range);
  act(() => root.render(createElement(ConfirmDialog, { title: 'Modul ausblenden?', message: entry.title, confirmLabel: 'Modul ausblenden', onConfirm: vi.fn(), onCancel: vi.fn() })));
  expect(window.getSelection()?.toString()).toBe('');
  const dialog = container.querySelector('[role=dialog]')!;
  expect(dialog.getAttribute('aria-labelledby')).toBe(container.querySelector('h3')!.id);
  const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); act(() => dialog.dispatchEvent(context));
  expect(context.defaultPrevented).toBe(true);
});

it('cancels a ready week-card press when a second finger begins a pinch', () => {
  const onToggleModule = vi.fn(), onSelectEntries = vi.fn();
  act(() => root.render(createElement(WeekView, { weekDays: ['2026-10-12'], today: '2026-10-12', entriesByDay: { '2026-10-12': [entry, { ...entry, title: 'Parallel' }] }, onOpenDay: vi.fn(), onSwipeWeek: vi.fn(), onToggleModule, onSelectEntries })));
  const item = container.querySelector('.weekview__parallel-item')!;
  pointer(item, 'pointerdown'); act(() => vi.advanceTimersByTime(460));
  const pinch = new Event('touchstart', { bubbles: true, cancelable: true });
  Object.assign(pinch, { touches: [{ clientX: 20, clientY: 20 }, { clientX: 60, clientY: 20 }] });
  act(() => item.dispatchEvent(pinch)); pointer(item, 'pointerup');
  act(() => container.querySelector<HTMLButtonElement>('.weekview__event--parallel-group')!.click());
  expect(onToggleModule).not.toHaveBeenCalled(); expect(onSelectEntries).not.toHaveBeenCalled();
});
