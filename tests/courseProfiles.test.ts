import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type AppSettings } from '../src/store/preferences';
import { addCourseProfile, makePrimaryProfile, removeCourseProfile, returnToPrimaryProfile, settingsForProfile, withCourseProfiles } from '../src/store/courseProfiles';
const configured: AppSettings = { ...DEFAULT_SETTINGS, scheduleSource: 'dhbw-api',
  apiSelection: { site: 'RV', degree: 'Wirtschaftsinformatik', course: 'WI2024A' }, hiddenModules: ['hidden-main'] };
const second: AppSettings = { ...configured, apiSelection: { site: 'FN', degree: 'Informatik', course: 'INF2024A' }, hiddenModules: [] };

describe('Gespeicherte Kursprofile', () => {
  it('migriert die vorhandene Auswahl mit ihren Modulfiltern zum Hauptkurs', () => {
    const settings = withCourseProfiles(configured);
    expect(settings.courseProfiles).toHaveLength(1);
    expect(settings.primaryProfileId).toBe(settings.viewedProfileId);
    expect(settings.courseProfiles![0].hiddenModules).toEqual(['hidden-main']);
    expect(withCourseProfiles(settings)).toEqual(settings);
  });
  it('öffnet zusätzliche Kurse ohne Hauptkurs, Erinnerungen oder Export umzustellen', () => {
    const settings = addCourseProfile(configured, second);
    expect(settings.apiSelection).toEqual(configured.apiSelection);
    expect(settings.hiddenModules).toEqual(configured.hiddenModules);
    expect(settings.primaryProfileId).not.toBe(settings.viewedProfileId);
    const viewed = settings.courseProfiles!.find(p => p.id === settings.viewedProfileId)!;
    expect(settingsForProfile(settings, viewed).apiSelection).toEqual(second.apiSelection);
    expect(settingsForProfile(settings, viewed).hiddenModules).toEqual([]);
    expect(addCourseProfile(settings, second).courseProfiles).toHaveLength(2);
  });
  it('ändert den Hauptkurs nur ausdrücklich und bewahrt beide Profile samt Filtern', () => {
    const settings = addCourseProfile(configured, second);
    const switched = withCourseProfiles(makePrimaryProfile(settings, settings.viewedProfileId!));
    expect(switched.apiSelection).toEqual(second.apiSelection);
    expect(switched.hiddenModules).toEqual([]);
    expect(switched.primaryProfileId).toBe(settings.viewedProfileId);
    expect(switched.courseProfiles!.find(p => p.id === settings.primaryProfileId)?.hiddenModules).toEqual(['hidden-main']);
  });
});

it('löscht ein Ansichtprofil und kehrt bei dessen Auswahl zum Hauptprofil zurück', () => {
  const settings = addCourseProfile(configured, second);
  const deleted = removeCourseProfile(settings, settings.viewedProfileId!);
  expect(deleted.courseProfiles).toHaveLength(1);
  expect(deleted.viewedProfileId).toBe(deleted.primaryProfileId);
  expect(deleted.apiSelection).toEqual(configured.apiSelection);
  expect(removeCourseProfile(settings, settings.primaryProfileId!)).toEqual(settings);
});
it('stellt beim Öffnen das Hauptprofil wieder her, ohne gespeicherte Profile zu verlieren', () => {
  const settings = addCourseProfile(configured, second);
  const restored = returnToPrimaryProfile(settings);
  expect(restored.viewedProfileId).toBe(settings.primaryProfileId);
  expect(restored.courseProfiles).toEqual(settings.courseProfiles);
  const changed = makePrimaryProfile(settings, settings.viewedProfileId!);
  expect(returnToPrimaryProfile({ ...changed, viewedProfileId: settings.primaryProfileId }).apiSelection).toEqual(second.apiSelection);
  expect(returnToPrimaryProfile({ ...changed, viewedProfileId: settings.primaryProfileId }).viewedProfileId).toBe(changed.primaryProfileId);
});

it('übernimmt eine erneut bestätigte Wahl für ein bestehendes Profil, ohne Profile zu duplizieren', () => {
 const added=addCourseProfile(configured,second);
 const reconfigured={...second,apiSelection:{...second.apiSelection!,selectedOptionalModules:['Mein Wahlfach'],optionsConfiguredKey:'configured'},hiddenModules:['Befreiung Zweitkurs']};
 const updated=addCourseProfile(added,reconfigured);
 expect(updated.courseProfiles).toHaveLength(2);
 expect(updated.apiSelection).toEqual(configured.apiSelection);
 expect(settingsForProfile(updated,updated.courseProfiles!.find(p=>p.id===updated.viewedProfileId)!).apiSelection?.selectedOptionalModules).toEqual(['Mein Wahlfach']);
 const main=addCourseProfile(updated,{...configured,apiSelection:{...configured.apiSelection!,selectedOptionalModules:['Hauptwahlfach']}});
 expect(main.apiSelection?.selectedOptionalModules).toEqual(['Hauptwahlfach']);
 expect(main.courseProfiles).toHaveLength(2);
 expect(main.primaryProfileId).toBe(main.viewedProfileId);
});
