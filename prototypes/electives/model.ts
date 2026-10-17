import raw from './fixtures.json';
import { mapScheduleItem } from '../../src/dhbwApi/client';
import type { ScheduleEntry } from '../../src/types';
export type Item = { id: number; name: string; course: string; startTime: string; endTime: string; rooms: string[]; type: string };
const fixtures = raw as Record<string, Item[]>;
export type Choice = { id: string; title: string; match: RegExp; source: string };
export type Scenario = { id: string; label: string; site: string; degree: string; course: string; heading: string; hint: string; group: string; single: boolean; source?: string; optional?: Choice; choices: Choice[]; detection: string };
const choice = (id: string, title: string, match: RegExp, source: string): Choice => ({ id, title, match, source });
export const scenarios: Scenario[] = [
 { id:'wps',label:'WPS · Villingen-Schwenningen',site:'Villingen-Schwenningen',degree:'Soziale Arbeit',course:'VS-SXX25A',heading:'Deine Wahlpflichtseminare',hint:'Welche Seminare besuchst du? Dein Kursplan bleibt dabei.',group:'Wahlpflichtseminare',single:false,source:'VS-SXX25-ALLE-KURSE',detection:'Gemeinsamer Jahrgangsplan mit WPS-Titeln. Vorschlag aufgrund einer bestätigten Zuordnung zu Sozialer Arbeit, Jahrgang 2025.',choices:[choice('autismus','Autismus und Begleiterscheinungen 1',/WPS Autismus.* 1/,'VS-SXX25-ALLE-KURSE'),choice('digital','Digitalisierung in der Sozialen Arbeit',/WPS Digitalisierung/,'VS-SXX25-ALLE-KURSE'),choice('dynamik','Gruppendynamische Prozesse 1',/WPS Gruppendynamische/,'VS-SXX25-ALLE-KURSE'),choice('psyche','Sozialarbeit mit psychisch erkrankten Menschen',/WPS Sozialarbeit mit psychisch/,'VS-SXX25-ALLE-KURSE')] },
 { id:'richtung',label:'Studienrichtung · Stuttgart',site:'Stuttgart',degree:'Soziale Arbeit',course:'STG-SO25A',heading:'Deine Studienrichtung',hint:'Ergänze die zugeteilte Gruppe. Gemeinsame KJA-Termine kommen mit.',group:'Kinder-, Jugend- und Familienhilfe',single:true,source:'STG-SO25-A-H-SG+WAHLPFLICHT',detection:'Separater Sammelplan für A–H. Die Zuordnung KJA und die Gruppe sind eine Nutzerauswahl; sie werden nicht aus dem Kursbuchstaben geraten.',choices:[choice('zeynep','Gruppe Zeynep Deniz',/KJA Gruppe Zeynep/,'STG-SO25-A-H-SG+WAHLPFLICHT'),choice('ralf','Gruppe Ralf Kluge',/KJA Gruppe Ralf/,'STG-SO25-A-H-SG+WAHLPFLICHT'),choice('schmidt','Gruppe Mütschele/Schmidt',/KJA Gruppe Mütschele/,'STG-SO25-A-H-SG+WAHLPFLICHT')] },
 { id:'gruppe',label:'Zusatzgruppe · Villingen-Schwenningen',site:'Villingen-Schwenningen',degree:'BWL – Controlling & Consulting',course:'VS-WCC25',heading:'Deine Gruppe',hint:'Die Termine deiner Gruppe ergänzen den gemeinsamen Kursplan.',group:'Übungsgruppe',single:true,detection:'Eigenständige Gruppenquellen neben dem Grundplan; Terminvergleich weist zusätzliche und doppelte Einträge aus.',choices:[choice('g1','Gruppe 1',/.*/,'VS-WCC25-GRUPPE1'),choice('g2','Gruppe 2',/.*/,'VS-WCC25-GRUPPE2')] },
 { id:'labor',label:'Laborplan · Mosbach',site:'Mosbach',degree:'Elektrotechnik',course:'MOS-TEIT25',heading:'Deine Laborgruppe',hint:'Wähle die Gruppe, der du zugeteilt bist.',group:'Laborgruppe',single:true,detection:'Separate Laborquellen G1/G2. Gleicher Standort und Jahrgang grenzen Kandidaten ein; die tatsächliche Zugehörigkeit bestätigt die Person.',choices:[choice('g1','Laborgruppe 1',/.*/,'MOS-TEIT25-G1'),choice('g2','Laborgruppe 2',/.*/,'MOS-TEIT25-G2')] },
 { id:'wahlmodul',label:'Wahlmodule · Friedrichshafen',site:'Friedrichshafen',degree:'Wirtschaftsingenieurwesen',course:'FN-TWI24-1',heading:'Deine Wahlmodule',hint:'Wähle deine belegten Module. Die übrigen Alternativen werden ausgeblendet.',group:'Wahlmodule',single:false,detection:'WPM-T/W/D im selben Kurs, teils zeitgleich. Auswahl ohne erfundene Belegpflicht oder vorgegebene Anzahl.',choices:[choice('regel','Steuerungs- und Regelungstechnik',/WPM-T: Steuerungs/,'FN-TWI24-1'),choice('lifecycle','Life Cycle Management',/WPM-T: Life Cycle/,'FN-TWI24-1'),choice('bi','Business Intelligence',/WPM-W: Business Intelligence/,'FN-TWI24-1'),choice('international','International Business',/WPM-W: International Business/,'FN-TWI24-1'),choice('nachhaltig','Nachhaltigkeit',/WPM-T: Nachhaltigkeit/,'FN-TWI24-1')] },
 { id:'freitext',label:'Gruppen im Titel · Mannheim',site:'Mannheim',degree:'Chemische Technik',course:'MA-TCT24',heading:'Deine Praktikumsgruppe',hint:'Für Werkstoffkunde sind mehrere Gruppen im Kursplan eingetragen.',group:'Werkstoffkunde-Labor',single:true,detection:'Gruppenbezeichnungen stehen nur im Titel. Der Vorschlag gilt ausschließlich für Werkstoffkunde, nicht automatisch für andere Praktika.',optional:choice('nachholen','Nachholklausur Wärmeübertragung',/Nachholklausur Wärmeübertragung/,'MA-TCT24'),choices:[1,2,3,4].map(n=>choice(`g${n}`,`Gruppe ${n}`,new RegExp(`Werkstoffkunde-Labor \\(Gruppe ${n}\\)`),'MA-TCT24')) },
];
export function itemsFor(c: Choice): Item[] { return (fixtures[c.source] ?? []).filter(a=>c.match.test(a.name)); }
export function baseItems(s: Scenario): Item[] {
 return (fixtures[s.course]??[]).filter(a=>s.id==='wahlmodul'?!/WPM-[TWD]:/.test(a.name):s.id==='freitext'?!/Werkstoffkunde-Labor|Nachholklausur Wärmeübertragung/.test(a.name):true);
}
export function compose(s: Scenario, selected: string[], extras: boolean, configured: boolean): ScheduleEntry[] {
 let all = configured ? baseItems(s) : (fixtures[s.course]??[]);
 if(configured) {
  all = [...all,...s.choices.filter(c=>selected.includes(c.id)).flatMap(itemsFor)];
  if(s.id==='richtung' && selected.length) all.push(...(fixtures[s.source!]??[]).filter(a=>/M15 U1 KJA/.test(a.name) && !/entfällt/i.test(a.name)));
  if(extras && s.optional) all.push(...itemsFor(s.optional));
 }
 const seen=new Set<string>();
 return all.filter(a=>{
  // Demo only: production identity also needs provider ID and room/lecturer conflict handling.
  const key=[a.startTime,a.endTime,a.name.trim(),[...a.rooms].sort().join('|')].join('\u001f');
  if(seen.has(key))return false;seen.add(key);return true;
 }).map(a=>mapScheduleItem({...a,entityType:'LECTURE'})).filter((e):e is ScheduleEntry=>e!==null).sort((a,b)=>+a.start-+b.start);
}
