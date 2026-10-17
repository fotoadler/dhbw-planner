import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),catalog:vi.fn()}));
vi.mock('../src/dhbwApi/client',async original=>({...await original<object>(),getCourseSchedule:mocks.fetch}));
vi.mock('../src/dhbwApi/studyOptions',async original=>({...await original<object>(),courseCatalog:mocks.catalog}));
import { ModuleSelection } from '../src/features/study-options/components/ModuleSelection';
import { DEFAULT_SETTINGS, type AppSettings } from '../src/store/preferences';
import type { ScheduleEntry } from '../src/types';
const base:ScheduleEntry={title:'Gemeinsames Modul',course:'VS-SXX25A',start:new Date('2026-10-16T08:00Z'),end:new Date('2026-10-16T09:00Z'),rooms:[],lecturers:[],type:'lecture'};
let root:Root,container:HTMLDivElement;
const onChange=vi.fn();
beforeEach(()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 container=document.createElement('div');document.body.append(container);root=createRoot(container);onChange.mockReset();
 mocks.catalog.mockResolvedValue([{site:'VS',name:'VS-SXX25-ALLE-KURSE'}]);
 mocks.fetch.mockResolvedValue({entries:[{...base,title:'WPS Gewählt',course:'VS-SXX25-ALLE-KURSE'},{...base,title:'WPS Andere',course:'VS-SXX25-ALLE-KURSE'}],notModified:false});
});
afterEach(()=>{act(()=>root.unmount());container.remove();});
async function mount(){
 const settings:AppSettings={...DEFAULT_SETTINGS,scheduleSource:'dhbw-api',apiSelection:{site:'VS',degree:'Soziale Arbeit',course:'VS-SXX25A'},hiddenModules:['Alte Befreiung']};
 await act(async()=>root.render(createElement(ModuleSelection,{settings,entries:[base],modules:[{key:base.title,label:base.title}],onChange})));
}
const checkbox=(label:string)=>[...container.querySelectorAll('label')].find(l=>l.querySelector('input')?.getAttribute('aria-label')?.includes(label) || l.textContent?.includes(label))!.querySelector<HTMLInputElement>('input')!;
const button=(label:string)=>[...container.querySelectorAll('button')].find(b=>b.textContent===label)!;
it('lädt passende WPS automatisch, ohne zusätzliche Quellensuche oder Vorauswahl',async()=>{
 await mount();
 expect(mocks.fetch).toHaveBeenCalledWith('VS-SXX25-ALLE-KURSE');
 expect(checkbox('WPS Gewählt').checked).toBe(false);expect(checkbox('Gemeinsames Modul').checked).toBe(true);
 expect(container.querySelectorAll('input[type=search]')).toHaveLength(1);
 expect(container.textContent).not.toContain('Weiteren Kurs suchen');
 expect(onChange).not.toHaveBeenCalled();
 act(()=>checkbox('WPS Gewählt').click());
 act(()=>button('Auswahl übernehmen').click());
 const saved=onChange.mock.calls[0][0] as AppSettings;
 expect(saved.apiSelection?.additionalCourses).toEqual(['VS-SXX25-ALLE-KURSE']);
 expect(saved.apiSelection?.selectedAdditionalModules).toEqual(['WPS Gewählt']);
 expect(saved.hiddenModules).toEqual(['Alte Befreiung']);
});
it('verwirft die Wahl, ohne den bisherigen Stundenplan zu ändern',async()=>{
 await mount();act(()=>checkbox('WPS Gewählt').click());act(()=>button('Verwerfen').click());
 expect(checkbox('WPS Gewählt').checked).toBe(false);expect(onChange).not.toHaveBeenCalled();
});
it('leert nur die Wahlangebote und erhält gemeinsame Module und Befreiungen',async()=>{
 await mount();act(()=>checkbox('WPS Gewählt').click());act(()=>button('Auswahl leeren').click());
 act(()=>button('Auswahl übernehmen').click());
 expect(onChange.mock.calls[0][0].apiSelection.additionalCourses).toEqual([]);
 expect(onChange.mock.calls[0][0].hiddenModules).toEqual(['Alte Befreiung']);
 expect(checkbox('Gemeinsames Modul').checked).toBe(true);
});
it('nimmt bei einer zugeteilten Gruppe deren Module direkt auf',async()=>{
 mocks.catalog.mockResolvedValue([{site:'VS',name:'VS-WCC25-GRUPPE1'}]);
 mocks.fetch.mockResolvedValue({entries:[{...base,title:'Wirtschaftsenglisch III',course:'VS-WCC25-GRUPPE1'}],notModified:false});
 const settings:AppSettings={...DEFAULT_SETTINGS,scheduleSource:'dhbw-api',apiSelection:{site:'VS',degree:'BWL',course:'VS-WCC25'}};
 await act(async()=>root.render(createElement(ModuleSelection,{settings,entries:[{...base,course:'VS-WCC25'}],modules:[{key:base.title,label:base.title}],onChange})));
 await act(async()=>checkbox('Gruppe 1').click());act(()=>button('Auswahl übernehmen').click());
 expect(onChange.mock.calls[0][0].apiSelection.selectedAdditionalModules).toContain('Wirtschaftsenglisch III');
});
it('wendet Wahlmoduländerungen auch bei einem manuellen Rapla-Plan an',async()=>{
 const elective={...base,title:'WPM-T: Nachhaltigkeit'};
 await act(async()=>root.render(createElement(ModuleSelection,{settings:{...DEFAULT_SETTINGS},entries:[base,elective],modules:[base,elective].map(e=>({key:e.title,label:e.title})),onChange})));
 expect(checkbox('WPM-T: Nachhaltigkeit').checked).toBe(true);
 act(()=>checkbox('WPM-T: Nachhaltigkeit').click());act(()=>button('Auswahl übernehmen').click());
 expect(onChange.mock.calls[0][0].hiddenModules).toContain('WPM-T: Nachhaltigkeit');
});

it('speichert die Prüfung aller angebotenen Kategorien getrennt von der tatsächlichen Belegung',async()=>{
 mocks.fetch.mockResolvedValue({entries:['M10 WPS A','M11 Übung Kollegiale Beratung','M15 Studienschwerpunkt Netzraum und Sozialraumarbeit'].map(title=>({...base,title,end:new Date('2031-10-16T09:00Z'),course:'VS-SXX25-ALLE-KURSE'})),notModified:false});
 await mount();
 expect([...container.querySelectorAll('legend')].map(l=>l.textContent)).toEqual(['Wahlpflichtseminare','Übungen','Studienschwerpunkte']);
 act(()=>button('Auswahl übernehmen').click());
 const saved=onChange.mock.calls[0][0] as AppSettings;
 expect(saved.apiSelection?.selectedAdditionalModules).toEqual([]);
 expect(saved.apiSelection?.optionsConfiguredKey).toContain('Übungen');
 expect(saved.apiSelection?.optionsConfiguredKey).toContain('Studienschwerpunkte');
});

it('zeigt historische Wahlfächer gleichwertig und übernimmt gemeinsame Sammeltermine ohne Auswahl',async()=>{
 const titles=['M10 WPS: Historisches Seminar','M11 Übungen: Kollegiale Beratung','M16 Ü Erstellung eines Forschungsexposés','Literaturrecherche 1','Begrüßung 4.Semester','Klausur Modul 13','M4 Ringvorlesung'];
 const historic=titles.map(title=>({...base,title,course:'VS-SXX24-ALLE-KURSE',start:new Date('2025-01-01T08:00Z'),end:new Date('2025-01-01T10:00Z')}));
 mocks.catalog.mockResolvedValue([{site:'VS',name:'VS-SXX24-ALLE-KURSE'}]);mocks.fetch.mockResolvedValue({entries:historic,notModified:false});
 const settings:AppSettings={...DEFAULT_SETTINGS,hiddenModules:['Klausur Modul 13'],scheduleSource:'dhbw-api',apiSelection:{site:'VS',course:'VS-SXX24F',degree:'Soziale Arbeit'}};
 await act(async()=>root.render(createElement(ModuleSelection,{settings,modules:[{key:base.title,label:base.title}],entries:[{...base,course:'VS-SXX24F'}],setup:true,onChange})));
 expect(container.textContent).not.toContain('Vergangene');
 expect(container.textContent).toContain('Historisches Seminar');
 expect(container.textContent).not.toContain('Begrüßung');
 expect(container.textContent).not.toContain('Klausur Modul 13');
 expect(container.textContent).not.toContain('M4 Ringvorlesung');
 expect(container.textContent).toContain('Gemeinsame Termine sind enthalten.');
 act(()=>button('Weiter zum Kalender').click());
 const saved=onChange.mock.calls[0][0] as AppSettings;
 expect(saved.apiSelection?.additionalCourses).toEqual(['VS-SXX24-ALLE-KURSE']);
 expect(saved.apiSelection?.selectedAdditionalModules).toEqual([]);
 expect(saved.hiddenModules).toContain('Klausur Modul 13');
});

it('fasst reine Raumvarianten zusammen und wechselt Laborgruppen nur innerhalb desselben Labors',async()=>{
 mocks.catalog.mockResolvedValue([]);
 const titles=['Labor Organische Chemie Gruppe: 1','Labor Organische Chemie Gruppe: 1 E.48 als Besprechungs- und Arbeitsraum','Labor Organische Chemie Gruppe: 2','Werkstoffkunde-Labor (Gruppe 1)'];
 const modules=titles.map(title=>({...base,title,course:'MA-TCT24'}));
 const settings:AppSettings={...DEFAULT_SETTINGS,scheduleSource:'dhbw-api',apiSelection:{site:'MA',course:'MA-TCT24',degree:'Chemische Technik',selectedOptionalModules:[]}};
 await act(async()=>root.render(createElement(ModuleSelection,{settings,modules:modules.map(e=>({key:e.title,label:e.title})),entries:modules,setup:true,onChange})));
 expect(container.querySelectorAll('.study-choice__row')).toHaveLength(3);
 act(()=>checkbox('Werkstoffkunde-Labor (Gruppe 1)').click());
 act(()=>checkbox('Labor Organische Chemie Gruppe: 1').click());
 act(()=>checkbox('Labor Organische Chemie Gruppe: 2').click());
 expect(checkbox('Labor Organische Chemie Gruppe: 1').checked).toBe(false);
 expect(checkbox('Werkstoffkunde-Labor (Gruppe 1)').checked).toBe(true);
 act(()=>checkbox('Labor Organische Chemie Gruppe: 1').click());
 act(()=>button('Weiter zum Kalender').click());
 expect(onChange.mock.calls[0][0].apiSelection.selectedOptionalModules).toEqual(expect.arrayContaining(titles.slice(0,2)));
 expect(onChange.mock.calls[0][0].apiSelection.selectedOptionalModules).not.toContain(titles[2]);
});
