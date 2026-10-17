import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/store/preferences';
import type { ScheduleEntry } from '../src/types';
import { scheduleModuleKey } from '../src/schedule/modules';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), calendar: vi.fn(), notifications: vi.fn(), live: vi.fn() }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(async () => ({ remove: vi.fn() })) } }));
vi.mock('../src/dhbwApi/client', async importOriginal => ({ ...await importOriginal<object>(), getCourseSchedule: mocks.fetch }));
vi.mock('../src/calendar/sync', () => ({ syncDeviceCalendar: mocks.calendar }));
vi.mock('../src/notifications/scheduler', () => ({ initNotifications: vi.fn(), syncNotifications: mocks.notifications }));
vi.mock('../src/liveActivity/scheduler', () => ({ syncCourseLiveActivity: mocks.live, nextLiveActivityTransition: vi.fn(() => null) }));
vi.mock('../src/store/preferences', async importOriginal => ({
  ...await importOriginal<object>(),
  loadSettings: vi.fn(async () => ({ ...DEFAULT_SETTINGS, calendarSyncEnabled: true, scheduleSource: 'dhbw-api', apiSelection: { site: 'RV', degree: 'QA', course: 'QA-A' } })),
  loadCache: vi.fn(async () => null), saveCache: vi.fn(), saveSettings: vi.fn(),
}));
vi.mock('../src/store/lecturerDirectory', () => ({
  loadLecturerDirectory: vi.fn(async () => ({})), saveLecturerDirectory: vi.fn(),
  applyLecturerDirectory: (entries: ScheduleEntry[]) => entries,
  updateLecturerDirectory: (directory: object) => ({ directory, changed: false }),
}));
import { useSchedule } from '../src/ui/useSchedule';
let state: ReturnType<typeof useSchedule>, root: Root, container: HTMLDivElement;
const entry = (title: string): ScheduleEntry => ({ title, start: new Date('2025-01-06T09:00:00Z'), end: new Date('2025-01-06T10:00:00Z'), rooms: ['A1'], lecturers: [], course: 'QA', type: 'lecture' });
function Harness() { state = useSchedule(); return null; }
beforeEach(() => {
  mocks.fetch.mockReset().mockResolvedValue({ entries: [entry('A')], notModified: false });
  mocks.calendar.mockReset().mockResolvedValue(undefined); mocks.notifications.mockReset().mockResolvedValue(undefined);
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
async function mount() {
  await act(async () => root.render(createElement(Harness)));
  await vi.waitFor(() => expect(mocks.calendar).toHaveBeenCalledOnce());
}
it('gleicht normale Aktualisierung, 304, Kurswechsel und Modulfilter ohne Teilen-Dialog ab', async () => {
  await mount(); expect(mocks.calendar.mock.calls[0][0][0].title).toBe('A');
  expect(mocks.calendar.mock.calls[0][2]).toBe(true);
  mocks.fetch.mockResolvedValueOnce({ entries: [], notModified: true });
  await act(async () => state.refresh()); expect(mocks.calendar.mock.calls[1][0][0].title).toBe('A');
  mocks.fetch.mockResolvedValueOnce({ entries: [entry('B')], notModified: false });
  await act(async () => state.applySettings({ ...state.settings!, apiSelection: { site: 'RV', degree: 'QA', course: 'QA-B' } }));
  expect(mocks.calendar.mock.calls[2][0].map((e: ScheduleEntry) => e.title)).toEqual(['B']);
  expect(mocks.calendar.mock.calls[2][2]).toBe(true);
  await act(async () => state.applySettings({ ...state.settings!, hiddenModules: [scheduleModuleKey(entry('B'))] }));
  expect(mocks.calendar.mock.calls[3][0]).toEqual([]); expect(mocks.calendar.mock.calls[3][2]).toBe(true);
});
it('startet den Kalenderabgleich auch wenn die Benachrichtigungsplanung noch wartet', async () => {
  let finish!: () => void;
  mocks.notifications.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
  await mount(); expect(mocks.calendar).toHaveBeenCalledOnce();
  await act(async () => finish());
});
it('plant beim Speichern und Wechseln von Ansichtskursen den Hauptkurs nicht neu', async () => {
  await mount();
  const liveCalls = mocks.live.mock.calls.length;
  const { addCourseProfile } = await import('../src/store/courseProfiles');
  const saved = addCourseProfile(state.settings!, { ...state.settings!, apiSelection: { site: 'FN', degree: 'QA', course: 'QA-C' }, hiddenModules: [] });
  await act(async () => state.applySettings(saved));
  expect(mocks.calendar).toHaveBeenCalledOnce(); expect(mocks.notifications).toHaveBeenCalledOnce();
  expect(mocks.live.mock.calls.length).toBe(liveCalls);
  expect(state.settings!.apiSelection!.course).toBe('QA-A');
  await act(async () => state.applySettings({ ...state.settings!, viewedProfileId: state.settings!.primaryProfileId }));
  expect(mocks.calendar).toHaveBeenCalledOnce(); expect(mocks.notifications).toHaveBeenCalledOnce();
});

it('stellt beim ausdrücklichen Hauptprofilwechsel alle automatischen Funktionen auf den neuen Kurs um', async () => {
  await mount();
  const { addCourseProfile, makePrimaryProfile } = await import('../src/store/courseProfiles');
  const saved = addCourseProfile(state.settings!, { ...state.settings!, apiSelection: { site: 'FN', degree: 'QA', course: 'QA-C' }, hiddenModules: [] });
  await act(async () => state.applySettings(saved));
  mocks.fetch.mockResolvedValueOnce({ entries: [entry('C')], notModified: false });
  await act(async () => state.applySettings(makePrimaryProfile(state.settings!, saved.viewedProfileId!)));
  expect(state.settings!.apiSelection!.site).toBe('FN');
  expect(mocks.calendar.mock.calls[mocks.calendar.mock.calls.length - 1][0][0].title).toBe('C');
  expect(mocks.notifications.mock.calls[mocks.notifications.mock.calls.length - 1][1].apiSelection.course).toBe('QA-C');
  expect(mocks.live.mock.calls[mocks.live.mock.calls.length - 1][1].apiSelection.course).toBe('QA-C');
});
it('kehrt beim erneuten Sichtbarwerden zum Hauptprofil zurück, ohne Erinnerungen für den Ansichtskurs zu planen', async () => {
  await mount();
  const { addCourseProfile } = await import('../src/store/courseProfiles');
  await act(async () => state.applySettings(addCourseProfile(state.settings!, { ...state.settings!, apiSelection: { site: 'FN', degree: 'QA', course: 'QA-C' } })));
  expect(state.settings!.viewedProfileId).not.toBe(state.settings!.primaryProfileId);
  await act(async () => document.dispatchEvent(new Event('visibilitychange')));
  expect(state.settings!.viewedProfileId).toBe(state.settings!.primaryProfileId);
  expect(mocks.notifications).toHaveBeenCalledOnce();
});
