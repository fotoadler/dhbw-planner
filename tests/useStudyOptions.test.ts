import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({catalog:vi.fn(),fetch:vi.fn()}));
vi.mock('../src/dhbwApi/studyOptions',async original=>({...await original<object>(),courseCatalog:mocks.catalog}));
vi.mock('../src/dhbwApi/client',async original=>({...await original<object>(),getCourseSchedule:mocks.fetch}));
import { useStudyOptions } from '../src/features/study-options/hooks/useStudyOptions';
import { studyOptionsKey } from '../src/dhbwApi/studyOptions';
import { DEFAULT_SETTINGS } from '../src/store/preferences';
let root:Root,container:HTMLDivElement;
const settings=(course:string)=>({...DEFAULT_SETTINGS,scheduleSource:'dhbw-api' as const,apiSelection:{site:'VS',course,degree:'Soziale Arbeit'}});
function Probe({course,refresh=0}:{course:string;refresh?:number}) {
 const key=useStudyOptions(settings(course),[],new Date(refresh));
 return createElement('output',null,key);
}
beforeEach(()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
 mocks.catalog.mockReset().mockResolvedValue([{site:'VS',name:'VS-SXX25-ALLE-KURSE'},{site:'VS',name:'VS-SXX26-ALLE-KURSE'}]);
 mocks.fetch.mockReset().mockResolvedValue({entries:[{title:'M10 WPS A'},{title:'M11 Übung Kollegiale Beratung'},{title:'M15 Studienschwerpunkt'}]});
});
afterEach(()=>{act(()=>root.unmount());container.remove();});
it('prüft auch die Kategorien des Sammelplans, bevor ein Profil als vollständig gelten kann',async()=>{
 await act(async()=>root.render(createElement(Probe,{course:'VS-SXX25G'})));
 expect(container.textContent).toBe(studyOptionsKey(['VS-SXX25-ALLE-KURSE'],['M10 WPS A','M11 Übung Kollegiale Beratung','M15 Studienschwerpunkt']));
});
it('verwendet beim Profilwechsel keinen Erkennungsstatus des vorherigen Kurses',async()=>{
 await act(async()=>root.render(createElement(Probe,{course:'VS-SXX25G'})));
 let resolve!:(value:unknown)=>void;
 mocks.fetch.mockImplementation(()=>new Promise(r=>{resolve=r;}));
 await act(async()=>root.render(createElement(Probe,{course:'VS-SXX26G'})));
 expect(container.textContent).toBe('');
 await act(async()=>resolve({entries:[{title:'Studienschwerpunkt M9 Netzwerk- und Sozialraumarbeit'}]}));
 expect(container.textContent).toContain('VS-SXX26-ALLE-KURSE');
 expect(container.textContent).not.toContain('VS-SXX25-ALLE-KURSE');
});
it('erkennt bei einer Aktualisierung neu veröffentlichte Angebotsarten',async()=>{
 mocks.fetch.mockResolvedValueOnce({entries:[{title:'M10 WPS A'}]});
 await act(async()=>root.render(createElement(Probe,{course:'VS-SXX25G'})));
 expect(container.textContent).not.toContain('Übungen');
 await act(async()=>root.render(createElement(Probe,{course:'VS-SXX25G',refresh:1000})));
 expect(container.textContent).toContain('Übungen');
});
it('behandelt einen fehlgeschlagenen Abruf nicht als abgeschlossene Prüfung',async()=>{
 mocks.fetch.mockRejectedValue(new Error('offline'));
 await act(async()=>root.render(createElement(Probe,{course:'VS-SXX25G'})));
 expect(container.textContent).toBe('');
 mocks.fetch.mockResolvedValue({entries:[{title:'M10 WPS A'}]});
 await act(async()=>window.dispatchEvent(new Event('focus')));
 expect(container.textContent).toContain('Wahlpflichtseminare');
});
