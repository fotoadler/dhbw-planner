import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { WeekView } from '../src/ui/WeekView';
import { weekNowMarker } from '../src/ui/weekNow';
import { wallMinutes } from '../src/ui/weekLayout';
import { berlinDayKey, formatTime } from '../src/lib/berlinTime';
import { parseRaplaWeek } from '../src/rapla/parser';
import { WEEK_FIXTURE } from './fixtures';
const resume = vi.hoisted(() => ({ current: undefined as (() => void) | undefined }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn((_name: string, handler: () => void) => {
  resume.current = handler;
  return Promise.resolve({ remove: vi.fn() });
}) } }));

const weekDays = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'];

describe('Jetzt-Linie in Berliner Wandzeit', () => {
  it.each([40, 64, 120])('verwendet bei Zoom %s dieselbe Geometrie wie Termine', (height) => {
    expect(weekNowMarker(new Date('2026-10-07T08:15:30Z'), weekDays, height, 19))
      .toEqual({ day: '2026-10-07', top: 2.2583333333333333 * height, label: '10:15' });
  });

  it.each([
    ['2026-03-29T00:30:00Z', '01:30', 1.5],
    ['2026-03-29T01:30:00Z', '03:30', 3.5],
    ['2026-10-25T00:30:00Z', '02:30', 2.5],
    ['2026-10-25T01:30:00Z', '02:30', 2.5],
  ])('kennt die Wandzeit beim Sommerzeitwechsel %s', (instant, label, hours) => {
    expect(formatTime(new Date(instant))).toBe(label);
    expect(wallMinutes(new Date(instant))).toBe(Number(hours) * 60);
    // Both transitions happen before the visible 08:00 grid.
    expect(weekNowMarker(new Date(instant), [instant.slice(0, 10)], 64, 24)).toBeNull();
  });

  it.each([
    ['2026-03-28T08:15:00Z', '2026-03-28', 1.25],
    ['2026-03-29T08:15:00Z', '2026-03-29', 2.25],
    ['2026-10-24T08:15:00Z', '2026-10-24', 2.25],
    ['2026-10-25T08:15:00Z', '2026-10-25', 1.25],
  ])('berücksichtigt den korrekten UTC-Offset am %s', (instant, day, hours) => {
    expect(weekNowMarker(new Date(instant), [day], 64, 19)?.top).toBe(hours * 64);
  });

  it('prüft das Berliner Datum auch wenn UTC noch am Vortag liegt', () => {
    expect(berlinDayKey(new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05');
    expect(weekNowMarker(new Date('2026-10-04T22:30:00Z'), ['2026-10-04'], 64, 24)).toBeNull();
  });

  it('zeigt keine Linie in einer vergangenen oder zukünftigen Woche', () => {
    const now = new Date('2026-10-07T08:00:00Z');
    expect(weekNowMarker(now, ['2026-09-30'], 64, 19)).toBeNull();
    expect(weekNowMarker(now, ['2026-10-14'], 64, 19)).toBeNull();
  });

  it('versteckt die Linie außerhalb des Rasters statt eine falsche Randzeit darzustellen', () => {
    expect(weekNowMarker(new Date('2026-10-07T05:59:59Z'), weekDays, 64, 19)).toBeNull();
    expect(weekNowMarker(new Date('2026-10-07T06:00:00Z'), weekDays, 64, 19)?.top).toBe(0);
    expect(weekNowMarker(new Date('2026-10-07T16:59:59Z'), weekDays, 64, 19)).not.toBeNull();
    expect(weekNowMarker(new Date('2026-10-07T17:00:00Z'), weekDays, 64, 19)).toBeNull();
  });
});

let root: Root | undefined;
let container: HTMLDivElement;
const props = { weekDays, today: '2026-10-07', entriesByDay: {}, onOpenDay: vi.fn(), onSelectEntries: vi.fn(), onSwipeWeek: vi.fn() };
const marker = () => container.querySelector<HTMLElement>('.weekview__now');
function render(extra: Partial<Parameters<typeof WeekView>[0]> = {}) {
  if (!root) {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  }
  act(() => root!.render(createElement(WeekView, { ...props, ...extra })));
}
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('dynamische Jetzt-Linie', () => {
  it('behält Samstagstermine und sonntägliche Mitternachts-Hinweise aus Rapla auch am Dienstag sichtbar', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-07-07T08:00:00Z'));
    const entries = parseRaplaWeek(WEEK_FIXTURE.replace('Do 09.07.', 'So 12.07.').replace('Fr 10.07.', 'Sa 11.07.'));
    const entriesByDay: Record<string, typeof entries> = {};
    for (const entry of entries) (entriesByDay[berlinDayKey(entry.start)] ??= []).push(entry);
    expect(entriesByDay['2026-07-11'][0].title).toBe('Selbststudium');
    expect(entriesByDay['2026-07-12'][0].title).toContain('Deadline');
    render({ weekDays: ['2026-07-06', '2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12'], entriesByDay });
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(7);
    expect(container.querySelector('.weekview__notice')?.textContent).toContain('Deadline');
    expect(container.textContent).toContain('Sa11.');
    expect(container.textContent).toContain('So12.');
  });
  it('aktualisiert Position und Beschriftung regelmäßig und räumt den Timer auf', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T08:15:00Z'));
    render();
    expect(marker()?.style.top).toBe('144px');
    expect(marker()?.getAttribute('aria-label')).toContain('10:15 Uhr');
    expect(container.querySelector<HTMLElement>('.weekview__now-dot')?.style.left).toBe('40%');
    act(() => vi.advanceTimersByTime(60_000));
    expect(marker()?.style.top).toBe(`${(136 / 60) * 64}px`);
    expect(marker()?.textContent).toBe('10:16');
    act(() => root!.unmount()); root = undefined;
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['focus', 'pageshow', 'visibilitychange'])('aktualisiert nach Rückkehr über %s sofort', (event) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T08:00:00Z'));
    render();
    vi.setSystemTime(new Date('2026-10-07T09:30:00Z'));
    if (event === 'visibilitychange') vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
    act(() => (event === 'visibilitychange' ? document : window).dispatchEvent(new Event(event)));
    expect(marker()?.style.top).toBe('224px');
    expect(marker()?.textContent).toBe('11:30');
  });

  it('verwendet den echten heutigen Tag statt eines veralteten today-Props und zeigt leere Wochenendtage', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-10T08:00:00Z'));
    render();
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(7);
    expect(marker()).not.toBeNull();
    expect(container.querySelector<HTMLElement>('.weekview__now-dot')?.style.left).toBe(`${5 / 7 * 100}%`);
    expect(container.querySelector('.weekview__dayhead.is-today')?.textContent).toBe('Sa10.');
    act(() => vi.advanceTimersByTime(24 * 60 * 60_000));
    expect(marker()).not.toBeNull();
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(7);
    expect(container.querySelector('.weekview__dayhead.is-today')?.textContent).toBe('So11.');
    render({ weekDays: ['2026-10-12'] });
    expect(marker()).toBeNull();
  });

  it('blendet beide leeren Wochenendtage ab Berliner Samstag ein, obwohl UTC noch Freitag ist', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-09T21:59:59Z')); render();
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(5);
    vi.setSystemTime(new Date('2026-10-09T22:00:00Z'));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(7);
    expect(container.querySelector('.weekview__dayhead.is-today')?.textContent).toBe('Sa10.');
  });

  it('zeigt beim nativen App-Resume sofort das Wochenende nach einem suspendierten Freitag', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T18:00:00Z')); render();
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(5);
    vi.setSystemTime(new Date('2026-10-10T08:00:00Z'));
    act(() => resume.current!());
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(7);
    expect(container.querySelector('.weekview__dayhead.is-today')?.textContent).toBe('Sa10.');
  });

  it.each([
    ['2026-10-10', '09:00', '10:00', 'weekview__event'],
    ['2026-10-11', '09:00', '10:00', 'weekview__event'],
    ['2026-10-10', '00:00', '23:59', 'weekview__notice'],
    ['2026-10-11', '00:00', '00:00', 'weekview__notice'],
  ])('zeigt unter der Woche den belegten Wochenendtag %s auch für Hinweise', (day, start, end, cssClass) => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-07T08:00:00Z'));
    const entry = { title: 'Rapla-Termin', start: new Date(`${day}T${start}:00+02:00`), end: new Date(`${day}T${end}:00+02:00`), rooms: [], lecturers: [], type: 'lecture' as const };
    render({ entriesByDay: { [day]: [entry] } });
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(6);
    expect([...container.querySelectorAll('.weekview__dayhead')].map(el => el.textContent)).toContain(day.endsWith('10') ? 'Sa10.' : 'So11.');
    expect(container.querySelector(`.${cssClass}`)?.textContent).toContain('Rapla-Termin');
  });

  it('hält beide belegten Wochenendtage auch nach dem Wechsel zum Montag sichtbar', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-11T21:59:59Z'));
    render({ scheduledDays: new Set(['2026-10-10', '2026-10-11']) });
    vi.setSystemTime(new Date('2026-10-11T22:00:00Z'));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(7);
    expect(container.querySelector('.weekview__dayhead.is-today')).toBeNull();
  });

  it('entfernt die Linie bei Berliner Wochenwechsel auch mit veraltetem today-Prop', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T16:30:00Z'));
    render();
    expect(marker()).not.toBeNull();
    vi.setSystemTime(new Date('2026-10-11T22:00:00Z'));
    act(() => window.dispatchEvent(new Event('focus')));
    expect(marker()).toBeNull();
    expect(container.querySelectorAll('.weekview__col')).toHaveLength(5);
  });

  it('folgt Zoom-Änderungen ohne einen weiteren Timer anzulegen', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T08:15:00Z'));
    for (const hourHeight of [40, 64, 120]) {
      render({ hourHeight });
      expect(marker()?.style.top).toBe(`${2.25 * hourHeight}px`);
      expect(vi.getTimerCount()).toBe(1);
    }
  });

  it('folgt der lokalen Pinch-Höhe bereits während der Geste', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-07T08:15:00Z'));
    const onHourHeightChange = vi.fn();
    render({ onHourHeightChange });
    const view = container.querySelector<HTMLElement>('.weekview')!;
    const touch = (type: string, xs: number[]) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { touches: xs.map((clientX) => ({ clientX, clientY: 100 })), changedTouches: [] });
      act(() => view.dispatchEvent(event));
    };
    touch('touchstart', [100, 180]);
    touch('touchmove', [60, 220]);
    expect(marker()?.style.top).toBe('270px');
    expect(onHourHeightChange).not.toHaveBeenCalled();
    touch('touchcancel', []);
    expect(marker()?.style.top).toBe('144px');
  });
});
