import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),cache:vi.fn(),save:vi.fn()}));
vi.mock('../src/dhbwApi/client',async original=>({...await original<object>(),getCourseSchedule:mocks.fetch}));
vi.mock('../src/store/preferences',async original=>({...await original<object>(),loadCache:mocks.cache,saveCache:mocks.save}));
import { additionalCourses, getStudyPlan, mergeStudyEntries, studyPlanKey } from '../src/dhbwApi/studyPlan';
import { studyOptionsKey, suggestedCourses } from '../src/dhbwApi/studyOptions';
import { choiceCategory, filterScheduleEntries } from '../src/schedule/modules';
import type { ScheduleEntry } from '../src/types';
import type { DhbwCourse } from '../src/dhbwApi/client';
const selection={site:'VS',course:'VS-SXX25A',degree:'Soziale Arbeit',additionalCourses:['VS-SXX25-ALLE-KURSE']};
const entry=(title:string,course='VS-SXX25A',room='A'):ScheduleEntry=>({title,course,start:new Date('2026-10-16T08:00Z'),end:new Date('2026-10-16T09:00Z'),rooms:[room],lecturers:[],type:'lecture'});
beforeEach(()=>{vi.clearAllMocks();mocks.cache.mockResolvedValue(null);mocks.save.mockResolvedValue(undefined);});
describe('Mehrere Quellen eines persönlichen Plans',()=>{
 it('bindet den Cache an die Quellen und ignoriert den Einführungsstatus',()=>{
  expect(studyPlanKey({...selection,optionsNoticeSeen:true})).toBe(studyPlanKey(selection));
  expect(studyPlanKey({...selection,additionalCourses:[]})).not.toBe(studyPlanKey(selection));
  expect(additionalCourses({...selection,additionalCourses:[selection.course,'VS-X','VS-X']})).toEqual(['VS-X']);
 });
 it('dedupliziert gleiche Inhalte, behält unterschiedliche Raumangaben',()=>{
  expect(mergeStudyEntries([entry('Mathe'),entry('Mathe','VS-X'),entry('Mathe','VS-X','B')])).toHaveLength(2);
 });
 it('zeigt aus Zusatzplänen nur ausdrücklich gewählte Module, erhält aber den Grundplan',()=>{
  const chosen={...selection,selectedAdditionalModules:['WPS A']};
  const all=[entry('Gemeinsam'),entry('WPS A',selection.additionalCourses[0]),entry('WPS Neu',selection.additionalCourses[0])];
  expect(filterScheduleEntries(all,[],chosen).map(e=>e.title)).toEqual(['Gemeinsam','WPS A']);
  expect(filterScheduleEntries(all,['WPS A'],chosen).map(e=>e.title)).toEqual(['Gemeinsam']);
 });
 it('begrenzt VS-Jahrgangsvorschläge auf den passenden Sammelplan',()=>{
  const catalog=['VS-SXX24-ALLE-KURSE','VS-SXX25-ALLE-KURSE','VS-WCC25-GRUPPE1'].map(name=>({name,site:'VS'} as DhbwCourse));
  expect(suggestedCourses(selection,catalog).map(c=>c.name)).toEqual(['VS-SXX25-ALLE-KURSE']);
 });
 it('wählt in Stuttgart nur den passenden Buchstabenbereich',()=>{
  const catalog=['STG-SO25-A-H-SG+WAHLPFLICHT','STG-SO25-J-Q-SG+WAHLPFLICHT'].map(name=>({name,site:'STG'} as DhbwCourse));
  expect(suggestedCourses({site:'STG',course:'STG-SO25K',degree:'Sozialwesen'},catalog).map(c=>c.name)).toEqual(['STG-SO25-J-Q-SG+WAHLPFLICHT']);
 });
 it('verwendet ETags getrennt pro Quelle',async()=>{
  mocks.cache.mockImplementation(async(key:string)=>({etag:key,weeks:{week:[entry('Cache',key.endsWith('ALLE-KURSE')?selection.additionalCourses[0]:selection.course)]}}));
  mocks.fetch.mockResolvedValue({notModified:true});
  const result=await getStudyPlan(selection,'combined-etag');
  expect(mocks.fetch).toHaveBeenCalledWith(selection.course,`api:VS:${selection.course}`);
  expect(mocks.fetch).toHaveBeenCalledWith(selection.additionalCourses[0],`api:VS:${selection.additionalCourses[0]}`);
  expect(result.notModified).toBe(false);
 });
 it('liefert bei fehlgeschlagenem Zusatzplan keinen unvollständigen Sync-Plan',async()=>{
  mocks.fetch.mockImplementation(async(course:string)=>{if(course!==selection.course)throw new Error('offline');return {notModified:false,entries:[entry('Basis')]};});
  await expect(getStudyPlan(selection)).rejects.toThrow('offline');
 });
});

it('hält gemeinsame Termine im Hauptkurs und schaltet Wahlmodule nur ausdrücklich frei',()=>{
 const main={...selection,additionalCourses:[],selectedOptionalModules:['WPM-T: Nachhaltigkeit']};
 const all=[entry('Gemeinsam'),entry('WPM-T: Nachhaltigkeit'),entry('WPM-W: Andere Wahl'),entry('Informationen zu den Wahlmodulen')];
 expect(filterScheduleEntries(all,[],main).map(e=>e.title)).toEqual(['Gemeinsam','WPM-T: Nachhaltigkeit','Informationen zu den Wahlmodulen']);
 expect(filterScheduleEntries(all,[],{...main,selectedOptionalModules:[]}).map(e=>e.title)).toEqual(['Gemeinsam','Informationen zu den Wahlmodulen']);
});

it('entfernt keine generische Wahlpflichtprüfung aus dem Grundplan aufgrund einer Titelheuristik',()=>{
 const all=[entry('Klausur Wahlpflichtmodul Technik'),entry('WPM-T: Nachhaltigkeit')];
 expect(filterScheduleEntries(all,[],{...selection,additionalCourses:[],selectedOptionalModules:[]}).map(e=>e.title)).toEqual(['Klausur Wahlpflichtmodul Technik']);
});

it.each(['24','25','26','31'])('erkennt den jahrgangsrichtigen VS-Sammelplan für %s ohne Modulnummern',year=>{
 const catalog=[`VS-SXX${year}-ALLE-KURSE`,'VS-SXX23-ALLE-KURSE'].map(name=>({name,site:'VS'} as DhbwCourse));
 expect(suggestedCourses({site:'VS',course:`VS-SXX${year}G`,degree:'Soziale Arbeit'},catalog).map(c=>c.name)).toEqual([`VS-SXX${year}-ALLE-KURSE`]);
});
it('erkennt die gleichen eindeutigen Quellkonventionen auch an einem neuen Standort',()=>{
 const catalog=['NEU-ABC31-ALLE-KURSE','NEU-ABC31A-G1','NEU-DEF31-ALLE-KURSE','NEU-ABC30-ALLE-KURSE'].map(name=>({name,site:'NEU'} as DhbwCourse));
 expect(suggestedCourses({site:'NEU',course:'NEU-ABC31A',degree:'Neuer Studiengang'},catalog).map(c=>c.name)).toEqual(['NEU-ABC31-ALLE-KURSE','NEU-ABC31A-G1']);
});
it('erkennt Fabiennes Übungen und Schwerpunkte unabhängig vom Modulhandbuch',()=>{
 expect(choiceCategory('M11 Übung Kollegiale Beratung')).toBe('Übungen');
 expect(choiceCategory('M16 Übung Literaturrecherche 2')).toBe('Übungen');
 expect(choiceCategory('Studienschwerpunkt M9 Netzwerk- und Sozialraumarbeit')).toBe('Studienschwerpunkte');
 expect(choiceCategory('M15 Studienschwerpunkt Netzraum und Sozialraumarbeit')).toBe('Studienschwerpunkte');
 expect(choiceCategory('Mathematik Übung')).toBeNull();
 expect(choiceCategory('Informationen zum Studienschwerpunkt')).toBeNull();
});
it('erkennt neue Angebotsarten, ohne bei jedem neuen Seminartitel erneut zu fragen',()=>{
 const sources=['VS-SXX25-ALLE-KURSE'];
 const original=studyOptionsKey(sources,['WPS A']);
 expect(studyOptionsKey(sources,['WPS B','WPS A'])).toBe(original);
 expect(studyOptionsKey(sources,['WPS A','M11 Übung Kollegiale Beratung'])).not.toBe(original);
 expect(studyOptionsKey(sources,['WPS A','Studienschwerpunkt M9'])).not.toBe(original);
});

it('erhält gemeinsame historische Termine aus dem Sammelplan und filtert nur persönliche Angebote',()=>{
 const source='VS-SXX24-ALLE-KURSE';
 const titles=['Begrüßung 4.Semester','Klausur Modul 13','M4 Ringvorlesung','M16: Einführungsvorlesung Empirische Sozialforschung','M10 WPS: Historisches Seminar','M11 Übungen: Kollegiale Beratung','M4 ÜGesellschaftliche Herstellung von Normalität','Literaturrecherche 1'];
 const old=titles.map(title=>({...entry(title,source),start:new Date('2025-01-01T08:00Z'),end:new Date('2025-01-01T10:00Z')}));
 const personal={...selection,additionalCourses:[source],selectedAdditionalModules:['M10 WPS: Historisches Seminar']};
 expect(filterScheduleEntries(old,[],personal).map(e=>e.title)).toEqual([...titles.slice(0,4),'M10 WPS: Historisches Seminar']);
 expect(filterScheduleEntries(old,['Klausur Modul 13'],personal).map(e=>e.title)).not.toContain('Klausur Modul 13');
});

it('begrenzt Stuttgarter Richtungs-, Seminar- und Gruppenkennungen auf den bestätigten Zusatzplan',()=>{
 const source='STG-SO25-A-H-SG+WAHLPFLICHT';
 expect(choiceCategory('M11 U3 Kollegiale Beratung',source)).toBe('Wahlpflichtseminare');
 expect(choiceCategory('M14 U2 Familienrecht',source)).toBe('Wahlmodule');
 expect(choiceCategory('M9 U2 HE2 gesamter Kurs',source)).toBe('Studienschwerpunkte');
 expect(choiceCategory('M15 HE2 Gruppe Frau Stahl',source)).toBe('Gruppen');
 expect(choiceCategory('M14: Informationen zu den Wahlmodulen und Transferleistungen',source)).toBeNull();
 expect(choiceCategory('Nachklausur M2',source)).toBeNull();
 expect(choiceCategory('M14 U2 Familienrecht','STG-SO25A')).toBeNull();
});
