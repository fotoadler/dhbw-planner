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

it('validiert gespeicherte Profile und stellt einen ungültigen aktiven Kurs auf den Hauptkurs zurück', async () => {
  preferencesGet.mockResolvedValue({ value: JSON.stringify({ version: 4, data: {
    scheduleSource: 'dhbw-api', apiSelection: { site: 'RV', degree: 'QA', course: 'QA-A' }, hiddenModules: ['hidden'],
    viewedProfileId: 'missing', courseProfiles: [
      { id: 'bad', scheduleSource: 'dhbw-api', apiSelection: { site: '', degree: '', course: '' } },
      { id: 'parallel', name: 'Parallelkurs', scheduleSource: 'dhbw-api', apiSelection: { site: 'FN', degree: 'QA', course: 'QA-B' }, hiddenModules: [] },
    ],
  } }) });
  const settings = await loadSettings();
  expect(settings.courseProfiles).toHaveLength(2);
  expect(settings.viewedProfileId).toBe(settings.primaryProfileId);
  expect(settings.courseProfiles?.find(p => p.id === settings.primaryProfileId)?.hiddenModules).toEqual(['hidden']);
});

it('bewahrt Zusatzquellen, Modulauswahl und Einführungstatus beim Laden des Hauptprofils', async () => {
  preferencesGet.mockResolvedValue({value:JSON.stringify({version:4,data:{scheduleSource:'dhbw-api',apiSelection:{site:'VS',course:'VS-SXX25A',degree:'Soziale Arbeit',additionalCourses:['VS-SXX25-ALLE-KURSE','VS-SXX25-ALLE-KURSE','MA-FREMD'],selectedAdditionalModules:['WPS Auswahl'],optionsNoticeSeen:true,optionsConfiguredKey:'configured-revision',optionsNoticeKey:'notice-revision'},hiddenModules:['Befreiung']}})});
  const settings=await loadSettings();
  expect(settings.apiSelection?.additionalCourses).toEqual(['VS-SXX25-ALLE-KURSE']);
  expect(settings.apiSelection?.selectedAdditionalModules).toEqual(['WPS Auswahl']);
  expect(settings.apiSelection?.optionsNoticeSeen).toBe(true);
  expect(settings.apiSelection?.optionsConfiguredKey).toBe('configured-revision');
  expect(settings.apiSelection?.optionsNoticeKey).toBe('notice-revision');
  expect(settings.courseProfiles?.find(p=>p.id===settings.primaryProfileId)?.apiSelection).toEqual(settings.apiSelection);
  expect(settings.hiddenModules).toEqual(['Befreiung']);
});
