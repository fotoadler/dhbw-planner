import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { EntryCard } from '../../src/ui/EntryCard';
import { WeekView } from '../../src/ui/WeekView';
import { WeekStrip } from '../../src/ui/WeekStrip';
import { addDaysYmd, berlinDayKey, formatDateLong as formatYmdDate, mondayOfYmd as mondayYmd, parseYmdKey, ymdKey } from '../../src/lib/berlinTime';
import { scenarios, compose, itemsFor, type Scenario } from './model';
import type { ScheduleEntry } from '../../src/types';
import '../../src/styles.css';
import './preview.css';

const formatDateLong=(date:string)=>`${formatYmdDate(parseYmdKey(date))} ${parseYmdKey(date).y}`;
const mondayOfYmd=(date:string)=>ymdKey(mondayYmd(parseYmdKey(date)));
type Saved = { selected: string[]; extras: boolean; configured: boolean; seen: boolean };
type Screen = 'course'|'configure'|'calendar'|'settings';
const empty: Saved = {selected:[],extras:false,configured:false,seen:false};
const storageKey=(id:string)=>`planner-electives-preview-v1:${id}`;
function read(id:string):Saved {try{return {...empty,...JSON.parse(localStorage.getItem(storageKey(id))??'{}')};}catch{return {...empty};}}
function Icon({kind}:{kind:'settings'|'back'|'close'|'check'}) {return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={kind==='settings'?'M4 7h16M4 17h16M9 4v6M15 14v6':kind==='back'?'m14 6-6 6 6 6':kind==='close'?'m6 6 12 12M18 6 6 18':'m5 12 4 4L19 6'}/></svg>}
function Dialog({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);
 return <dialog ref={ref} className="elective-dialog" aria-label={title} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="elective-dialog__body"><button className="iconbtn elective-dialog__close" aria-label="Schließen" onClick={onClose}><Icon kind="close"/></button><h2>{title}</h2>{children}</div></dialog>;
}
function App() {
 const params=new URLSearchParams(location.search);
 const [id,setId]=useState(params.get('case')??'wps');
 const scenario=scenarios.find(s=>s.id===id)??scenarios[0];
 const [mode,setMode]=useState(params.get('mode')??'new');
 const [saved,setSaved]=useState<Saved>(()=>read(scenario.id));
 const [draft,setDraft]=useState<string[]>(saved.selected);
 const [extra,setExtra]=useState(saved.extras);
 const [screen,setScreen]=useState<Screen>(mode==='new'?'course':'calendar');
 const [returnTo,setReturnTo]=useState<Screen>('calendar');
 const [offer,setOffer]=useState(mode==='existing'&&!saved.seen&&!saved.configured);
 const [preview,setPreview]=useState(false);
 const [detail,setDetail]=useState<ScheduleEntry|null>(null);
 const [date,setDate]=useState('2026-10-16');
 const [view,setView]=useState<'day'|'week'>('day');
 const [query,setQuery]=useState('');
 const [examplesOpen,setExamplesOpen]=useState(false);
 const [undo,setUndo]=useState<Saved|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>{document.title=`${scenario.course} · Wahlkurse & Gruppen`;},[scenario.course]);
 useEffect(()=>{if(offer&&!saved.seen){const next={...saved,seen:true};setSaved(next);localStorage.setItem(storageKey(scenario.id),JSON.stringify(next));}},[offer,saved,scenario.id]);
 const current=useMemo(()=>compose(scenario,saved.selected,saved.extras,saved.configured),[scenario,saved]);
 const proposed=useMemo(()=>compose(scenario,draft,extra,true),[scenario,draft,extra]);
 const persist=(next:Saved)=>{setSaved(next);localStorage.setItem(storageKey(scenario.id),JSON.stringify(next));};
 const switchScenario=(nextId:string,nextMode=mode)=>{
  const next=scenarios.find(s=>s.id===nextId)??scenarios[0];const state=read(next.id);
  setExamplesOpen(false);setId(next.id);setMode(nextMode);setSaved(state);setDraft(state.selected);setExtra(state.extras);setScreen(nextMode==='new'?'course':'calendar');setOffer(nextMode==='existing'&&!state.seen&&!state.configured);setQuery('');setPreview(false);setDetail(null);setUndo(null);setNotice('');setDate('2026-10-16');
  history.replaceState(null,'',`?case=${next.id}&mode=${nextMode}`);
 };
 const configure=(from:Screen)=>{setReturnTo(from);setDraft(saved.selected);setExtra(saved.extras);setQuery('');setOffer(false);setScreen('configure');};
 const markOffer=()=>{persist({...saved,seen:true});setOffer(false);};
 const choose=(s:Scenario,value:string)=>setDraft(prev=>s.single?(prev.includes(value)?[]:[value]):prev.includes(value)?prev.filter(v=>v!==value):[...prev,value]);
 const matching=scenario.choices.filter(c=>c.title.toLocaleLowerCase('de').includes(query.toLocaleLowerCase('de')));
 const chosenItems=[...scenario.choices.filter(c=>draft.includes(c.id)).flatMap(itemsFor),...(extra&&scenario.optional?itemsFor(scenario.optional):[])];
 const sample=chosenItems.find(a=>a.startTime>='2026-10-16')??chosenItems[0];
 const previewDate=sample?berlinDayKey(new Date(sample.startTime)):date;
 const delta=proposed.length-current.length;
 const save=()=>{
  if(!draft.length&&!extra&&!saved.configured){setScreen('calendar');persist({...saved,seen:true});return;}
  setUndo(saved);persist({selected:draft,extras:extra,configured:true,seen:true});setScreen('calendar');setDate(previewDate);setNotice('Auswahl gespeichert');
 };
 const editFooter=<footer className="elective-footer"><button className="elective-preview-link" disabled={!draft.length&&!extra} onClick={()=>setPreview(true)}>Vorschau · {delta>=0?'+':''}{delta} Termine</button><button className="setup__confirm" onClick={save}>{draft.length||extra||saved.configured?'Auswahl übernehmen':'Ohne Auswahl weiter'}<span aria-hidden="true">→</span></button></footer>;
 return <div className={`preview-layout${examplesOpen?' examples-open':''}`}><button className="preview-launcher" onClick={()=>setExamplesOpen(v=>!v)} aria-expanded={examplesOpen}>Beispiele <span aria-hidden="true">{examplesOpen?'×':'⌃'}</span></button><aside className="preview-controls"><strong>Wahlkurse & Gruppen</strong><span className="preview-caption">Klickbare Konzeptvorschau · echte API-Beispiele</span><label htmlFor="example">Beispielkurs</label><select id="example" value={scenario.id} onChange={e=>switchScenario(e.target.value)}>{scenarios.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}</select><div className="preview-modes"><button aria-pressed={mode==='new'} onClick={()=>switchScenario(id,'new')}>Neue Einrichtung</button><button aria-pressed={mode==='existing'} onClick={()=>switchScenario(id,'existing')}>Schon eingerichtet</button></div><button className="preview-reset" onClick={()=>{localStorage.removeItem(storageKey(id));switchScenario(id,mode);}}>Beispiel zurücksetzen</button><details><summary>Erkennung & Datenquelle</summary><p>{scenario.detection}</p><a href={`https://api.dhbw.app/rapla/lectures/${encodeURIComponent(scenario.source??scenario.course)}/events?archived=true`} target="_blank" rel="noreferrer">API-Quelle öffnen ↗</a><p>API-Snapshot 16.10.2026. Vorführbare Teilmenge, keine vollständige Belegordnung. Auswahl nur in dieser Vorschau gespeichert.</p></details><div className="preview-case-list">{scenarios.map((s,i)=><button key={s.id} aria-current={s.id===id?'page':undefined} onClick={()=>switchScenario(s.id)}><span>{i+1}</span>{s.label}</button>)}</div></aside>
 <main className="preview-device"><div className="app">
 {screen==='course'?<div className="setup setup--guided"><div className="setup__top"><p className="setup__context">{scenario.site} · {scenario.degree}</p><h1 className="setup__title">Dein Kurs</h1></div><div className="elective-course-choice"><small>{scenario.site}</small><strong>{scenario.course.replace(/^[^-]+-/,'')}</strong><p>{scenario.degree}</p><Icon kind="check"/></div><footer className="setup__footer"><button className="setup__confirm" onClick={()=>configure('course')}>Kurs auswählen <span>→</span></button></footer></div>
 :screen==='configure'?<><header className="app__header"><button className="iconbtn" aria-label="Auswahl abbrechen" onClick={()=>setScreen(returnTo)}><Icon kind="back"/></button><div className="app__date"><h1 className="app__day">Wahlkurse & Gruppen</h1><p className="app__subtitle">{scenario.course.replace(/^[^-]+-/,'')} · {scenario.site}</p></div></header><div className="elective-body"><h2>{scenario.heading}</h2><p className="elective-hint">{scenario.hint}</p><label className="elective-search"><span className="sr-only">Angebote suchen</span><input type="search" placeholder="Suchen" value={query} onChange={e=>setQuery(e.target.value)}/></label><fieldset><legend>{scenario.group}</legend>{matching.map(c=><label className="elective-option" key={c.id}><input type={scenario.single?'radio':'checkbox'} name="elective-choice" checked={draft.includes(c.id)} onChange={()=>choose(scenario,c.id)}/><span><strong>{c.title}</strong><small>{itemsFor(c).length} {itemsFor(c).length===1?'Termin':'Termine'}{draft.includes(c.id)?' · ausgewählt':''}</small></span></label>)}{!matching.length&&<p className="elective-hint">Keine passenden Angebote.</p>}</fieldset>{scenario.optional&&<fieldset className="elective-optional"><legend>Nur bei Bedarf</legend><label className="elective-option"><input type="checkbox" checked={extra} onChange={e=>setExtra(e.target.checked)}/><span><strong>{scenario.optional.title}</strong><small>Nur aufnehmen, wenn du teilnimmst.</small></span></label></fieldset>}<p className="elective-note">Du kannst die Auswahl später in den Einstellungen ändern.</p></div>{editFooter}</>
 :screen==='settings'?<><header className="app__header"><button className="iconbtn" aria-label="Zurück zum Kalender" onClick={()=>setScreen('calendar')}><Icon kind="back"/></button><div className="app__date"><h1 className="app__day">Einstellungen</h1><p className="app__subtitle">{scenario.course}</p></div></header><div className="elective-body"><h2>Stundenplan</h2><button className="elective-settings-row" onClick={()=>configure('settings')}><span><strong>Wahlkurse & Gruppen</strong><small>{saved.configured?`${saved.selected.length} ausgewählt${saved.extras?' · Nachholtermin':''}`:'Noch nicht eingerichtet'}</small></span><span>›</span></button><p className="elective-note">Gilt für dieses Kursprofil.</p></div></>
 :<><header className="app__header"><div className="app__date"><h1 className="app__day">{formatDateLong(date)}</h1><p className="app__subtitle">{scenario.course.replace(/^[^-]+-/,'')} · {scenario.site}</p></div><button className="iconbtn" aria-label="Einstellungen" onClick={()=>setScreen('settings')}><Icon kind="settings"/></button></header><div className="app__viewbar"><nav className="segmented segmented--top" aria-label="Kalenderansicht"><button className={view==='day'?'is-active':''} onClick={()=>setView('day')}>Tag</button><button className={view==='week'?'is-active':''} onClick={()=>setView('week')}>Woche</button></nav></div>{notice&&<div className="elective-notice" role="status">{notice}{undo&&<button onClick={()=>{persist(undo);setUndo(null);setNotice('Änderung rückgängig gemacht');}}>Rückgängig</button>}</div>}{view==='day'?<><WeekStrip monday={mondayOfYmd(date)} selected={date} today="2026-10-16" busyDays={new Set(current.map(e=>berlinDayKey(e.start)))} onSelect={setDate} onWeekChange={setDate}/><div className="elective-calendar-list">{current.filter(e=>berlinDayKey(e.start)===date).map((e,i)=><EntryCard key={i} entry={e} onSelect={setDetail}/>)}{!current.some(e=>berlinDayKey(e.start)===date)&&<div className="elective-empty"><h2>Keine Termine an diesem Tag</h2><button onClick={()=>{const next=current.find(e=>berlinDayKey(e.start)>date)??current[0];if(next)setDate(berlinDayKey(next.start));}}>Nächsten Termin anzeigen →</button></div>}</div></>:<WeekView weekDays={Array.from({length:7},(_,i)=>ymdKey(addDaysYmd(parseYmdKey(mondayOfYmd(date)),i)))} entriesByDay={Object.fromEntries(Array.from(new Set(current.map(e=>berlinDayKey(e.start)))).map(day=>[day,current.filter(e=>berlinDayKey(e.start)===day)]))} today="2026-10-16" hourHeight={60} onOpenDay={day=>{setDate(day);setView('day');}} onSelectEntries={(_,e)=>setDetail(e[0])} onSwipeWeek={direction=>setDate(ymdKey(addDaysYmd(parseYmdKey(date),direction*7)))}/>}</>}
 </div></main>
 {offer&&<Dialog title={scenario.single?'Deine Gruppe ergänzen?':'Deine Wahlkurse ergänzen?'} onClose={markOffer}><p>Für {scenario.course.replace(/^[^-]+-/,'')} gibt es {scenario.id==='labor'?'zusätzliche Laborpläne':scenario.id==='gruppe'?'zusätzliche Gruppentermine':scenario.single?'Gruppen zur Auswahl':'Wahlangebote'}. Wähle aus, was zu deinem Stundenplan gehört.</p><button className="setup__confirm" onClick={()=>{persist({...saved,seen:true});configure('calendar');}}>Jetzt auswählen <span>→</span></button><button className="elective-later" onClick={markOffer}>Später</button><small>Jederzeit unter Einstellungen → Wahlkurse & Gruppen.</small></Dialog>}
 {preview&&<Dialog title="So sieht dein Plan aus" onClose={()=>setPreview(false)}><p>{formatDateLong(previewDate)} · mit deiner Auswahl</p><div className="elective-dialog-events">{proposed.filter(e=>berlinDayKey(e.start)===previewDate).map((e,i)=><EntryCard key={i} entry={e}/>)}</div>{hasOverlap(proposed.filter(e=>berlinDayKey(e.start)===previewDate))&&<p className="elective-conflict">Einige Termine überschneiden sich. Prüfe, ob du alle ausgewählten Angebote besuchst.</p>}<button className="setup__confirm" onClick={()=>{setPreview(false);save();}}>Auswahl übernehmen <span>→</span></button><button className="elective-later" onClick={()=>setPreview(false)}>Auswahl ändern</button></Dialog>}
 {detail&&<Dialog title={detail.title} onClose={()=>setDetail(null)}><p>{formatDateLong(berlinDayKey(detail.start))}</p><EntryCard entry={detail}/><button className="elective-later" onClick={()=>{setDetail(null);configure('calendar');}}>Wahlkurse & Gruppen bearbeiten</button></Dialog>}
 </div>;
}
function hasOverlap(entries:ScheduleEntry[]) {return entries.some((a,i)=>entries.some((b,j)=>i<j&&a.start<b.end&&b.start<a.end));}
ReactDOM.createRoot(document.getElementById('root')!).render(<App/>);
