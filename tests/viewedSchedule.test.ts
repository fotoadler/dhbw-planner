import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/store/preferences';
import { profileFromSettings, type CourseProfile } from '../src/store/courseProfiles';
import type { ScheduleEntry } from '../src/types';
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), calendar: vi.fn(), notifications: vi.fn(), live: vi.fn() }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn(async () => ({ remove: vi.fn() })) } }));
vi.mock('../src/dhbwApi/client', async original => ({ ...await original<object>(), getCourseSchedule: mocks.fetch }));
vi.mock('../src/calendar/sync', () => ({ syncDeviceCalendar: mocks.calendar }));
vi.mock('../src/notifications/scheduler', () => ({ syncNotifications: mocks.notifications }));
vi.mock('../src/liveActivity/scheduler', () => ({ syncCourseLiveActivity: mocks.live }));
vi.mock('../src/store/preferences', async original => ({ ...await original<object>(), loadCache: vi.fn(async () => null), saveCache: vi.fn() }));
vi.mock('../src/store/lecturerDirectory', () => ({ loadLecturerDirectory: vi.fn(async () => ({})), applyLecturerDirectory: (entries: ScheduleEntry[]) => entries }));
import { useViewedSchedule } from '../src/ui/useViewedSchedule';
let state: ReturnType<typeof useViewedSchedule>, root: Root, container: HTMLDivElement;
function Harness({ profile }: { profile?: CourseProfile }) { state = useViewedSchedule(profile); return null; }
const profile = (course: string) => profileFromSettings({ ...DEFAULT_SETTINGS, scheduleSource: 'dhbw-api', apiSelection: { site: 'RV', degree: 'QA', course } }, course);
const entry = (title: string): ScheduleEntry => ({ title, start: new Date('2026-10-12T09:00:00Z'), end: new Date('2026-10-12T10:00:00Z'), rooms: [], lecturers: [], type: 'lecture' });
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
it('ignoriert verspätete Ergebnisse nach einem schnellen Kurswechsel und führt keine native Synchronisierung aus', async () => {
  let finishA!: (value: unknown) => void;
  mocks.fetch.mockImplementation((course: string) => course === 'A' ? new Promise(resolve => { finishA = resolve; }) : Promise.resolve({ entries: [entry('B')], notModified: false }));
  await act(async () => root.render(createElement(Harness, { profile: profile('A') })));
  await act(async () => root.render(createElement(Harness, { profile: profile('B') })));
  expect(state.entries.map(e => e.title)).toEqual(['B']);
  await act(async () => finishA({ entries: [entry('A')], notModified: false }));
  expect(state.entries.map(e => e.title)).toEqual(['B']);
  expect(mocks.calendar).not.toHaveBeenCalled(); expect(mocks.notifications).not.toHaveBeenCalled(); expect(mocks.live).not.toHaveBeenCalled();
});
it('zeigt bei Fehlern eines neuen Kurses keine Einträge des vorherigen Kurses', async () => {
  mocks.fetch.mockResolvedValueOnce({ entries: [entry('A')], notModified: false }).mockRejectedValueOnce(new Error('offline'));
  await act(async () => root.render(createElement(Harness, { profile: profile('A') })));
  expect(state.entries).toHaveLength(1);
  await act(async () => root.render(createElement(Harness, { profile: profile('B') })));
  expect(state.entries).toEqual([]); expect(state.offline).toBe(true); expect(state.refreshing).toBe(false);
});
