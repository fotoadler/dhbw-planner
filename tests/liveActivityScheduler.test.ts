import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  platform: 'android' as 'android' | 'ios',
  endAll: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
  start: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    getPlatform: () => mocks.platform,
  },
}));

vi.mock('@dhbw/capacitor-course-live-activity', () => ({
  CourseLiveActivity: {
    endAll: mocks.endAll,
    schedule: mocks.schedule,
    start: mocks.start,
  },
}));

import { syncCourseLiveActivity } from '../src/liveActivity/scheduler';
import type { AppSettings } from '../src/store/preferences';
import type { ScheduleEntry } from '../src/types';

const settings = { liveEnabled: true } as AppSettings;

function entry(title: string, start: string, end: string): ScheduleEntry {
  return {
    title,
    start: new Date(start),
    end: new Date(end),
    rooms: [],
    lecturers: [],
    type: 'lecture',
  };
}

describe('syncCourseLiveActivity platform lifecycle', () => {
  beforeEach(() => {
    mocks.platform = 'android';
    vi.clearAllMocks();
  });

  it('ends Android live updates instead of scheduling an upcoming course', async () => {
    await syncCourseLiveActivity(
      [entry('Nächste Vorlesung', '2026-07-14T11:00:00.000Z', '2026-07-14T12:30:00.000Z')],
      settings,
      new Date('2026-07-14T10:00:00.000Z'),
    );

    expect(mocks.endAll).toHaveBeenCalledOnce();
    expect(mocks.schedule).not.toHaveBeenCalled();
  });

  it('keeps iOS scheduled ActivityKit starts', async () => {
    mocks.platform = 'ios';

    await syncCourseLiveActivity(
      [entry('Nächste Vorlesung', '2026-07-14T11:00:00.000Z', '2026-07-14T12:30:00.000Z')],
      settings,
      new Date('2026-07-14T10:00:00.000Z'),
    );

    expect(mocks.schedule).toHaveBeenCalledOnce();
    expect(mocks.endAll).not.toHaveBeenCalled();
  });
});
