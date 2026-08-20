import { beforeEach, describe, expect, it, vi } from 'vitest';

const { preferencesGet } = vi.hoisted(() => ({
  preferencesGet: vi.fn(),
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: preferencesGet,
    set: vi.fn(),
  },
}));

import { loadSettings } from '../src/store/preferences';

describe('Kalender-Standardansicht in den Preferences', () => {
  beforeEach(() => {
    preferencesGet.mockReset();
  });

  it('lädt die gespeicherte Wochenansicht', async () => {
    preferencesGet.mockResolvedValue({
      value: JSON.stringify({ version: 4, data: { defaultCalendarView: 'week' } }),
    });

    await expect(loadSettings()).resolves.toMatchObject({ defaultCalendarView: 'week' });
  });

  it('verwendet für alte oder ungültige Werte die Tagesansicht', async () => {
    preferencesGet.mockResolvedValue({
      value: JSON.stringify({ version: 4, data: { defaultCalendarView: 'month' } }),
    });

    await expect(loadSettings()).resolves.toMatchObject({ defaultCalendarView: 'day' });
  });
});
