import { describe, expect, it } from 'vitest';
import { scenarios, compose, itemsFor, baseItems } from '../prototypes/electives/model';

describe('Wahlkurse-Konzept mit echten API-Beispielen', () => {
 for (const scenario of scenarios) {
  it(`${scenario.id}: jede angebotene Auswahl hat echte Termine`, () => {
   expect(baseItems(scenario).length).toBeGreaterThan(0);
   for(const choice of scenario.choices) expect(itemsFor(choice).length,choice.title).toBeGreaterThan(0);
  });
 }
 it('ergänzt WPS und erhält den Grundplan',()=>{
  const s=scenarios[0];const initial=compose(s,[],false,false);const selected=compose(s,['digital'],false,true);
  expect(selected.length).toBeGreaterThan(initial.length);
  expect(selected.some(e=>e.title.includes('Digitalisierung'))).toBe(true);
  expect(selected.some(e=>e.title.includes('Autismus'))).toBe(false);
  for(const e of initial)expect(selected.some(a=>a.title===e.title&&+a.start===+e.start)).toBe(true);
 });
 it('entfernt nur die nicht gewählten WPM und behält gemeinsame Veranstaltungen',()=>{
  const s=scenarios.find(s=>s.id==='wahlmodul')!;const entries=compose(s,['regel'],false,true);
  expect(entries.some(e=>e.title.includes('Steuerungs- und Regelungstechnik'))).toBe(true);
  expect(entries.some(e=>e.title.includes('Life Cycle Management'))).toBe(false);
  expect(entries.some(e=>!e.title.includes('WPM-'))).toBe(true);
 });
 it('kann sämtliche Wahlmodule nachträglich abwählen',()=>{
  const s=scenarios.find(s=>s.id==='wahlmodul')!;
  expect(compose(s,[],false,true).some(e=>/WPM-[TWD]:/.test(e.title))).toBe(false);
 });
 it('bündelt gemeinsame KJA-Termine mit der gewählten Gruppe',()=>{
  const s=scenarios.find(s=>s.id==='richtung')!;const entries=compose(s,['ralf'],false,true);
  expect(entries.some(e=>e.title.includes('KJA Gruppe Ralf'))).toBe(true);
  expect(entries.some(e=>e.title.includes('M15 U1 KJA'))).toBe(true);
  expect(entries.some(e=>e.title.includes('KJA Gruppe Zeynep'))).toBe(false);
 });
 it('behandelt eine Praktikumsgruppe und den Nachholtermin unabhängig',()=>{
  const s=scenarios.find(s=>s.id==='freitext')!;
  const entries=compose(s,['g1'],false,true);const extra=compose(s,['g1'],true,true);
  expect(entries.some(e=>e.title.includes('Werkstoffkunde-Labor (Gruppe 1)'))).toBe(true);
  expect(entries.some(e=>e.title.includes('Werkstoffkunde-Labor (Gruppe 2)'))).toBe(false);
  expect(entries.some(e=>e.title.includes('Nachholklausur Wärme'))).toBe(false);
  expect(extra.some(e=>e.title.includes('Nachholklausur Wärme'))).toBe(true);
 });
 it('gibt beim Zusammenführen keine identischen Termine doppelt aus',()=>{
  const s=scenarios.find(s=>s.id==='gruppe')!;const entries=compose(s,['g1'],false,true);
  const keys=entries.map(e=>[+e.start,+e.end,e.title,e.rooms.join('|')].join(':'));
  expect(new Set(keys).size).toBe(keys.length);
 });
});
