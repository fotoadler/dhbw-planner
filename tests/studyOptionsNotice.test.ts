import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, type AppSettings } from '../src/store/preferences';
const mocks=vi.hoisted(()=>({apply:vi.fn(),hasOptions:'choices-v2'}));
let settings:AppSettings;
vi.mock('../src/ui/useSchedule',()=>({useSchedule:()=>({settings,entries:[],allEntries:[],availableModules:[],updatedAt:new Date('2026-10-16T10:00Z'),refreshing:true,offline:false,isReviewDemo:false,applySettings:mocks.apply,ensureWeek:vi.fn(),refresh:vi.fn()})}));
vi.mock('../src/ui/useViewedSchedule',()=>({useViewedSchedule:()=>({entries:[],allEntries:[],availableModules:[],updatedAt:new Date('2026-10-16T10:00Z'),offline:false})}));
vi.mock('../src/features/study-options/hooks/useStudyOptions',()=>({useStudyOptions:()=>mocks.hasOptions}));
vi.mock('../src/ui/useMensa',()=>({useMensa:()=>({})}));
vi.mock('../src/ui/useDualis',()=>({useDualis:()=>({loginState:'logged-out',isReviewDemo:false})}));
vi.mock('../src/ui/useBackButton',()=>({useBackButton:()=>{}}));
import { App } from '../src/ui/App';
let root:Root,container:HTMLDivElement;
beforeEach(()=>{
 (globalThis as unknown as {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})));
 settings={...DEFAULT_SETTINGS,mensaEnabled:false,scheduleSource:'dhbw-api',apiSelection:{site:'VS',course:'VS-SXX25A',degree:'Soziale Arbeit'}};
 mocks.hasOptions='choices-v2';mocks.apply.mockReset().mockImplementation((next:AppSettings)=>{settings=next;});
 container=document.createElement('div');document.body.append(container);root=createRoot(container);
});
afterEach(()=>{act(()=>root.unmount());container.remove();vi.unstubAllGlobals();});
it('zeigt den Einführungshinweis einmal, auch wenn nach dem Datenabruf noch native Nacharbeit läuft',()=>{
 act(()=>root.render(createElement(App)));
 expect(container.textContent).toContain('Wahlkurse & Gruppen auswählen?');
 expect(settings.apiSelection?.optionsNoticeKey).toBe('choices-v2');
 expect(settings.apiSelection?.optionsConfiguredKey).toBeUndefined();
 act(()=>[...container.querySelectorAll('button')].find(b=>b.textContent==='Später')!.click());
 expect(container.querySelector('[role=dialog]')).toBeNull();
 act(()=>root.unmount());root=createRoot(container);act(()=>root.render(createElement(App)));
 expect(container.querySelector('[role=dialog]')).toBeNull();
 expect(mocks.apply).toHaveBeenCalledOnce();
});
it('zeigt ohne erkannte Angebote keinen Hinweis und bewahrt Tag, Woche und Monat',()=>{
 mocks.hasOptions='';act(()=>root.render(createElement(App)));
 expect(container.querySelector('[role=dialog]')).toBeNull();
 expect([...container.querySelectorAll('.segmented button')].map(b=>b.textContent)).toEqual(['Tag','Woche','Monat']);
 expect(mocks.apply).not.toHaveBeenCalled();
});

it('migriert einen alten geschlossenen Hinweis ohne abgeschlossene Auswahl',()=>{
 settings.apiSelection!.optionsNoticeSeen=true;
 act(()=>root.render(createElement(App)));
 expect(container.textContent).toContain('Wahlkurse & Gruppen auswählen?');
});
it('akzeptiert eine ausdrücklich abgeschlossene leere Auswahl',()=>{
 settings.apiSelection={...settings.apiSelection!,selectedOptionalModules:[],optionsConfiguredKey:'choices-v2'};
 act(()=>root.render(createElement(App)));
 expect(container.querySelector('[role=dialog]')).toBeNull();
 expect(mocks.apply).not.toHaveBeenCalled();
});
it('fordert bei neu erkannten Angebotsarten erneut zur Prüfung auf',()=>{
 settings.apiSelection={...settings.apiSelection!,optionsConfiguredKey:'choices-v1',optionsNoticeKey:'choices-v1'};
 act(()=>root.render(createElement(App)));
 expect(container.textContent).toContain('Wahlkurse & Gruppen auswählen?');
});
it('prüft beim Wechsel auf ein unvollständiges Ansichtprofil und bewahrt den Hauptkurs',()=>{
 settings.apiSelection!.optionsConfiguredKey='choices-v2';
 act(()=>root.render(createElement(App)));
 expect(container.querySelector('[role=dialog]')).toBeNull();
 const primary={id:'primary',name:'Hauptkurs',scheduleSource:settings.scheduleSource,apiSelection:settings.apiSelection,raplaLink:settings.raplaLink,rapla:settings.rapla,hiddenModules:[]};
 const secondary={...primary,id:'secondary',name:'Zweitkurs',apiSelection:{site:'VS',course:'VS-SXX26G',degree:'Soziale Arbeit'}};
 settings={...settings,primaryProfileId:'primary',viewedProfileId:'secondary',courseProfiles:[primary,secondary]};
 act(()=>root.render(createElement(App)));
 expect(container.textContent).toContain('Wahlkurse & Gruppen auswählen?');
 expect(settings.apiSelection?.course).toBe('VS-SXX25A');
 expect(settings.apiSelection?.optionsNoticeKey).toBeUndefined();
 expect(settings.courseProfiles?.find(p=>p.id==='secondary')?.apiSelection?.optionsNoticeKey).toBe('choices-v2');
});
