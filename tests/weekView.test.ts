import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WeekView, weekTitleLineCapacity } from '../src/ui/WeekView';
import { WeekEventSheet } from '../src/ui/WeekEventSheet';
import { entryMinuteRange, isUntimedEntry, timedGeometry, weekClusters } from '../src/ui/weekLayout';
import type { ScheduleEntry } from '../src/types';
import { effectiveEndMs, isDeadlineOrAllDay } from '../src/lib/berlinTime';

describe('weekTitleLineCapacity', () => {
  it('uses every complete title line that fits into a regular event card', () => {
    expect(weekTitleLineCapacity(94, 14, 11, 3, 15)).toBe(4);
  });

  it('reserves the actually occupied lecturer height', () => {
    expect(weekTitleLineCapacity(174, 14 + 39, 11, 6, 15)).toBe(6);
    expect(weekTitleLineCapacity(174, 14 + 13, 11, 6, 15)).toBe(8);
  });

  it('keeps at least one title line in very short cards', () => {
    expect(weekTitleLineCapacity(26, 14, 6, 0, 15)).toBe(1);
  });

  it('detects 00:00 deadlines and caps effective duration to prevent full-day blocking', () => {
    const deadline = {
      start: new Date('2026-08-31T00:00:00+02:00'),
      end: new Date('2026-08-31T23:59:59+02:00'),
      title: 'Deadline Online-Marketing',
    };
    expect(isDeadlineOrAllDay(deadline)).toBe(true);
    expect(effectiveEndMs(deadline)).toBe(new Date('2026-08-31T00:15:00+02:00').getTime());

    const regularLecture = {
      start: new Date('2026-08-31T09:00:00+02:00'),
      end: new Date('2026-08-31T12:15:00+02:00'),
      title: 'Online Marketing',
    };
    expect(isDeadlineOrAllDay(regularLecture)).toBe(false);
    expect(effectiveEndMs(regularLecture)).toBe(regularLecture.end.getTime());
  });
});

function entry(start: string, end: string, title = 'Vorlesung'): ScheduleEntry {
  return { start: new Date(start), end: new Date(end), title, lecturers: ['Dozent Beispiel'], rooms: ['A1'], type: 'lecture' };
}

describe('Wochenraster in Berliner Zeit', () => {
  it.each([40, 64, 120])('hält bei %s px pro Stunde Uhrzeiten, Raster und Termine synchron', (zoom) => {
    const e = entry('2026-10-05T10:15:00+02:00', '2026-10-05T11:45:00+02:00');
    expect(timedGeometry(e, zoom)).toEqual({ top: 2.25 * zoom, height: 1.5 * zoom });
  });
  it('streckt kurze Termine nicht in den nächsten Termin hinein', () => {
    expect(timedGeometry(entry('2026-10-05T10:00:00+02:00', '2026-10-05T10:15:00+02:00'), 40)).toEqual({ top: 80, height: 10 });
  });
  it('legt volle Tage und Mitternachts-Hinweise oberhalb des Rasters ab', () => {
    expect(isUntimedEntry(entry('2026-10-05T00:00:00+02:00', '2026-10-06T00:00:00+02:00'))).toBe(true);
    expect(isUntimedEntry(entry('2026-10-05T00:00:00+02:00', '2026-10-05T00:00:00+02:00', 'Abgabe'))).toBe(true);
    expect(isUntimedEntry(entry('2026-10-05T10:00:00+02:00', '2026-10-05T10:00:00+02:00', 'Abgabe'))).toBe(false);
  });
  it('schneidet Frühtermine und den Tageswechsel exakt am sichtbaren Raster ab', () => {
    expect(timedGeometry(entry('2026-10-05T07:30:00+02:00', '2026-10-05T08:30:00+02:00'), 64)).toEqual({ top: 0, height: 32 });
    expect(entryMinuteRange(entry('2026-10-05T23:00:00+02:00', '2026-10-06T00:00:00+02:00'))).toEqual({ start: 1380, end: 1440 });
  });
  it('verwendet auch beim DST-Wechsel Wandzeit statt UTC-Dauer', () => {
    expect(entryMinuteRange(entry('2026-10-25T01:30:00+02:00', '2026-10-25T03:30:00+01:00'))).toEqual({ start: 90, end: 210 });
  });
  it('gruppiert echte Überschneidungen und lässt direkt anschließende Termine separat', () => {
    const a = entry('2026-10-05T09:00:00+02:00', '2026-10-05T10:30:00+02:00', 'A');
    const b = entry('2026-10-05T10:00:00+02:00', '2026-10-05T11:00:00+02:00', 'B');
    const c = entry('2026-10-05T11:00:00+02:00', '2026-10-05T12:00:00+02:00', 'C');
    expect(weekClusters([c, b, a]).map((cluster) => cluster.entries.map((e) => e.title))).toEqual([['A', 'B'], ['C']]);
  });
});

let root: Root | undefined;
let container: HTMLDivElement;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});
function mount(element: ReturnType<typeof createElement>) {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  act(() => root?.render(element));
}

describe('Wochenansicht und Detailfenster', () => {
  it('zoomt auch bei horizontaler Pinch-Geste, speichert einmal und öffnet keinen Termin', () => {
    const onHourHeightChange = vi.fn(); const onSwipeWeek = vi.fn(); const onSelectEntries = vi.fn();
    const e = entry('2026-10-05T10:00:00+02:00', '2026-10-05T12:00:00+02:00');
    mount(createElement(WeekView, { weekDays: ['2026-10-05'], today: '2026-10-05', entriesByDay: { '2026-10-05': [e] }, hourHeight: 64,
      onHourHeightChange, onSwipeWeek, onSelectEntries, onOpenDay: vi.fn() }));
    const view = container.querySelector<HTMLElement>('.weekview')!;
    const touches = (xs: number[]) => xs.map((clientX) => ({ clientX, clientY: 100 }));
    const touchEvent = (type: string, xs: number[], changed: number[] = xs) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { touches: touches(xs), changedTouches: touches(changed) });
      act(() => view.dispatchEvent(event)); return event;
    };
    touchEvent('touchstart', [100]); touchEvent('touchstart', [100, 180]);
    const move = touchEvent('touchmove', [60, 220]);
    expect(move.defaultPrevented).toBe(true);
    expect(container.querySelector<HTMLElement>('.weekview__grid')!.style.getPropertyValue('--weekview-hour-height')).toBe('120px');
    expect(onHourHeightChange).not.toHaveBeenCalled();
    touchEvent('touchend', [220], [60]); touchEvent('touchend', [], [220]);
    expect(onHourHeightChange).toHaveBeenCalledExactlyOnceWith(120);
    expect(onSwipeWeek).not.toHaveBeenCalled();
    act(() => container.querySelector<HTMLButtonElement>('.weekview__event')!.click());
    expect(onSelectEntries).not.toHaveBeenCalled();
  });

  it('verwirft eine abgebrochene Zoom-Geste ohne Einstellungsschreibzugriff', () => {
    const onHourHeightChange = vi.fn();
    mount(createElement(WeekView, { weekDays: ['2026-10-05'], today: '2026-10-05', entriesByDay: {}, hourHeight: 64,
      onHourHeightChange, onSwipeWeek: vi.fn(), onSelectEntries: vi.fn(), onOpenDay: vi.fn() }));
    const view = container.querySelector<HTMLElement>('.weekview')!;
    const dispatch = (type: string, xs: number[]) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { touches: xs.map((clientX) => ({ clientX, clientY: 100 })), changedTouches: [] });
      act(() => view.dispatchEvent(event));
    };
    dispatch('touchstart', [100, 180]); dispatch('touchmove', [80, 200]); dispatch('touchcancel', []);
    expect(container.querySelector<HTMLElement>('.weekview__grid')!.style.getPropertyValue('--weekview-hour-height')).toBe('64px');
    expect(onHourHeightChange).not.toHaveBeenCalled();
  });

  it('zeigt Räume und öffnet bei einem Termin die Details ohne Tageswechsel', () => {
    const onOpenDay = vi.fn(); const onSelectEntries = vi.fn();
    const e = entry('2026-10-05T10:00:00+02:00', '2026-10-05T12:00:00+02:00');
    mount(createElement(WeekView, { weekDays: ['2026-10-05'], today: '2026-10-05', entriesByDay: { '2026-10-05': [e] }, hourHeight: 120, onOpenDay, onSelectEntries, onSwipeWeek: vi.fn() }));
    const grid = container.querySelector<HTMLElement>('.weekview__grid')!;
    expect(grid.style.getPropertyValue('--weekview-hour-height')).toBe('120px');
    const card = container.querySelector<HTMLButtonElement>('.weekview__event')!;
    expect(card.textContent).toContain('A1');
    expect(card.style.top).toBe('240px');
    act(() => card.click());
    expect(onSelectEntries).toHaveBeenCalledWith('2026-10-05', [e]);
    expect(onOpenDay).not.toHaveBeenCalled();
  });
  it('behält ganztägige und frühe Termine sichtbar, beginnt das Raster aber bei 08:00', () => {
    const early = entry('2026-10-05T07:00:00+02:00', '2026-10-05T07:45:00+02:00');
    const full = entry('2026-10-05T00:00:00+02:00', '2026-10-06T00:00:00+02:00', 'Ganzer Tag');
    mount(createElement(WeekView, { weekDays: ['2026-10-05'], today: '2026-10-05', entriesByDay: { '2026-10-05': [early, full] }, onOpenDay: vi.fn(), onSelectEntries: vi.fn(), onSwipeWeek: vi.fn() }));
    expect(container.querySelector('.weekview__hour')?.textContent).toBe('08:00');
    expect(container.textContent).toContain('Ganzer Tag');
    expect(container.textContent).toContain('Vor 08:00');
    expect(container.querySelectorAll('.weekview__event')).toHaveLength(0);
  });
  it('zeigt bei Parallelterminen beide individuellen Zeitspannen, Räume und Prüfungsfarbe', () => {
    const a = entry('2026-10-05T09:00:00+02:00', '2026-10-05T10:30:00+02:00', 'Klausur'); a.type = 'exam';
    const b = entry('2026-10-05T10:00:00+02:00', '2026-10-05T11:00:00+02:00', 'Übung'); b.rooms = ['B2'];
    const onSelectEntries = vi.fn();
    mount(createElement(WeekView, { weekDays: ['2026-10-05'], today: '2026-10-05', entriesByDay: { '2026-10-05': [a, b] }, onOpenDay: vi.fn(), onSelectEntries, onSwipeWeek: vi.fn() }));
    const group = container.querySelector<HTMLButtonElement>('.weekview__event--parallel-group')!;
    expect(group.classList.contains('weekview__event--exam')).toBe(true);
    expect(group.textContent).toContain('09:00–10:30'); expect(group.textContent).toContain('10:00–11:00');
    expect(group.textContent).toContain('B2');
    act(() => group.click()); expect(onSelectEntries).toHaveBeenCalledWith('2026-10-05', [a, b]);
  });
  it('zeigt alle Paralleltermindetails und wechselt erst über den Tagesansicht-Button', () => {
    const onClose = vi.fn(); const onOpenDay = vi.fn();
    const a = entry('2026-10-05T09:00:00+02:00', '2026-10-05T10:30:00+02:00', 'A');
    const b = entry('2026-10-05T10:00:00+02:00', '2026-10-05T11:00:00+02:00', 'B');
    mount(createElement(WeekEventSheet, { day: '2026-10-05', entries: [a, b], onClose, onOpenDay }));
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain('09:00–10:30'); expect(dialog.textContent).toContain('10:00–11:00');
    expect(dialog.textContent).toContain('Raum: A1'); expect(dialog.textContent).toContain('Dozent Beispiel');
    expect(onOpenDay).not.toHaveBeenCalled();
    act(() => dialog.querySelector<HTMLButtonElement>('.weekdetails__footer button')!.click());
    expect(onOpenDay).toHaveBeenCalledWith('2026-10-05');
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it('schließt durch Abwärtswischen am Griff und fängt den Fokus im Dialog ein', () => {
    const onClose = vi.fn();
    mount(createElement(WeekEventSheet, { day: '2026-10-05', entries: [entry('2026-10-05T09:00:00+02:00', '2026-10-05T10:30:00+02:00')], onClose, onOpenDay: vi.fn() }));
    const header = document.querySelector<HTMLElement>('.weekdetails__header')!;
    header.setPointerCapture = vi.fn();
    const pointer = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true });
      Object.assign(event, { clientY: y, pointerId: 1, isPrimary: true });
      act(() => header.dispatchEvent(event));
    };
    const close = document.querySelector<HTMLButtonElement>('.weekdetails__close')!;
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true })));
    expect(document.activeElement).toBe(document.querySelector('.weekdetails__footer button'));
    act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(close);
    pointer('pointerdown', 100); pointer('pointermove', 190); pointer('pointerup', 190);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
