import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),catalog:vi.fn()}));
vi.mock('../src/dhbwApi/client',async original=>({...await original<object>(),getCourseSchedule:mocks.fetch}));
vi.mock('../src/dhbwApi/studyOptions',async original=>({...await original<object>(),courseCatalog:mocks.catalog}));
import { StudyPlanSetup } from '../src/features/study-options/components/StudyPlanSetup';
import { DEFAULT_SETTINGS, type AppSettings } from '../src/store/preferences';
const common={title:'Gemeinsames Modul',course:'FN-TWI24-1',start:new Date('2026-10-16T08:00Z'),end:new Date('2026-10-16T09:00Z'),rooms:[],lecturers:[],type:'lecture' as const};
const settings:AppSettings={...DEFAULT_SETTINGS,scheduleSource:'dhbw-api',apiSelection:{site:'FN',course:'FN-TWI24-1',degree:'Wirtschaftsingenieurwesen'}};
let root:Root,container:HTMLDivElement;const save=vi.fn();
beforeEach(()=>{(globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;container=document.createElement('div');document.body.append(container);root=createRoot(container);save.mockReset();mocks.catalog.mockResolvedValue([]);});
afterEach(()=>{act(()=>root.unmount());container.remove();});
it('fragt nach der Kurswahl vor dem Speichern und startet Wahlmodule abgewählt',async()=>{
 mocks.fetch.mockResolvedValue({entries:[common,{...common,title:'WPM-T: Nachhaltigkeit'}],notModified:false});
 await act(async()=>root.render(createElement(StudyPlanSetup,{settings,onSave:save,onCancel:vi.fn()})));
 expect(save).not.toHaveBeenCalled();
 const labels=[...container.querySelectorAll('label')];
 expect(labels.find(l=>l.textContent?.includes('Nachhaltigkeit'))!.querySelector<HTMLInputElement>('input')!.checked).toBe(false);
 expect(container.textContent).toContain('Gemeinsame Termine sind enthalten.');
 expect(labels.some(l=>l.textContent?.includes('Gemeinsames Modul'))).toBe(false);
 act(()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='Weiter zum Kalender')!.click());
 expect(save.mock.calls[0][0].apiSelection.selectedOptionalModules).toEqual([]);
});
it('überspringt den Auswahlschritt bei Kursen ohne Wahlangebote',async()=>{
 mocks.fetch.mockResolvedValue({entries:[common],notModified:false});
 await act(async()=>root.render(createElement(StudyPlanSetup,{settings,onSave:save,onCancel:vi.fn()})));
 expect(save).toHaveBeenCalledOnce();
});
it.each([
 {site:'FN',course:'FN-TIM24',titles:['Lab GR 1 (A-K) Datenbanksysteme TIM+TIS','Lab GR 2 (L-Z) Datenbanksysteme TIM+TIS'],category:'Gruppen'},
 {site:'MA',course:'MA-TCT23',titles:['WF Diagnostik','WF Galenik'],category:'Wahlmodule'},
 {site:'VS',course:'VS-WWI22C',titles:['Angewandtes E-Government Vertiefung VI','Fallstudie Vertiefung IT'],category:'Studienschwerpunkte'},
])('fragt die erkannten Angebote von $course bereits beim Einrichten ab',async({site,course,titles,category})=>{
 const next={...settings,apiSelection:{site,course,degree:'Beispielstudiengang'}};
 mocks.fetch.mockResolvedValue({entries:[common,...titles.map(title=>({...common,title,course}))],notModified:false});
 await act(async()=>root.render(createElement(StudyPlanSetup,{settings:next,onSave:save,onCancel:vi.fn()})));
 expect(save).not.toHaveBeenCalled();
 expect(container.textContent).toContain(category);
 expect([...container.querySelectorAll<HTMLInputElement>('input[type=checkbox]')].every(input=>!input.checked)).toBe(true);
});
it('speichert bei einem fehlgeschlagenen Katalogabruf nicht ungeprüft alle Wahlangebote',async()=>{
 mocks.fetch.mockRejectedValue(new Error('offline'));
 await act(async()=>root.render(createElement(StudyPlanSetup,{settings,onSave:save,onCancel:vi.fn()})));
 expect(save).not.toHaveBeenCalled();expect(container.textContent).toContain('Erneut versuchen');
});
