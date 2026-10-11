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

  it('verwendet für alte oder ungültige Werte die Wochenansicht', async () => {
    preferencesGet.mockResolvedValue({
      value: JSON.stringify({ version: 4, data: { defaultCalendarView: 'year' } }),
    });

    await expect(loadSettings()).resolves.toMatchObject({ defaultCalendarView: 'week' });
  });

  it('behält eine ausdrücklich gewählte Tagesansicht', async () => {
    preferencesGet.mockResolvedValue({ value: JSON.stringify({ version: 4, data: { defaultCalendarView: 'day' } }) });
    await expect(loadSettings()).resolves.toMatchObject({ defaultCalendarView: 'day' });
  });

  it('lädt die gespeicherte Monatsansicht', async () => {
    preferencesGet.mockResolvedValue({ value: JSON.stringify({ version: 4, data: { defaultCalendarView: 'month' } }) });
    await expect(loadSettings()).resolves.toMatchObject({ defaultCalendarView: 'month' });
  });

  it('aktiviert den Gerätekalender nur bei ausdrücklich gespeichertem true', async () => {
    for (const value of [undefined, false, 'true', 1]) {
      preferencesGet.mockResolvedValue({ value: JSON.stringify({ version: 4, data: { calendarSyncEnabled: value } }) });
      await expect(loadSettings()).resolves.toMatchObject({ calendarSyncEnabled: false });
    }
    preferencesGet.mockResolvedValue({ value: JSON.stringify({ version: 4, data: { calendarSyncEnabled: true } }) });
    await expect(loadSettings()).resolves.toMatchObject({ calendarSyncEnabled: true });
  });
});
