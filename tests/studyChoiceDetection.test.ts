import { expect, it } from 'vitest';
import apiCases from './fixtures/study-choice-api.json';
import { choiceCategory, filterScheduleEntries } from '../src/schedule/modules';
import { studyOptionsKey, suggestedCourses } from '../src/dhbwApi/studyOptions';
import { groupIdentifier, mergeOfferVariants, numberedGroupFamily } from '../src/features/study-options/model/offerVariants';
import type { DhbwCourse } from '../src/dhbwApi/client';
import type { ScheduleEntry } from '../src/types';

// Public API snapshot 17 October 2026: original labels, no invented course aliases.
it.each(apiCases)('erkennt $course: $title', ({ course, title, category }) => {
  expect(choiceCategory(title, course)).toBe(category);
});

it.each([
  'Mobile Netzwerkarchitekturen', 'Vertiefung wissenschaftliches Arbeiten',
  'Management & Energiewirtschaft Schwerpunkt: Energierecht',
  'Grundlagen Sozialer Arbeit mit Gruppen / Organisationen',
  'WP III W4RSWWP_203', 'Schwarz-Gruppe Bad Wimpfen',
  'Klausur WPF Diagnostik', '??KLAUSUR Mobile Netzwerkarchitekturen',
  'KL T3MB2502 WM Vertiefung Thermodynamik', 'Informationen zu Wahlfächern',
  'Vorlesung SJ2 Planung inkl. Wahlfächer',
  'Labor GET (alle Gruppen)', 'Business Englisch Gruppe I+II',
  'Praktische Datenverarbeitung (Theorie Gr.1+2 A-Z)',
])('erhält gemeinsame Termine: %s', title => {
  expect(choiceCategory(title)).toBeNull();
});

it('unterscheidet mehrere abgekürzte Vertiefungsrichtungen vom Vertiefen eines Lehrinhalts', () => {
  const labels = ['Angewandtes E-Government Vertiefung VI', 'Fallstudie Vertiefung IT', 'Angewandtes E-Business Vertiefung FD+VI', 'Vertiefung wissenschaftliches Arbeiten'];
  expect(choiceCategory(labels[0], 'VS-WWI22C', labels)).toBe('Studienschwerpunkte');
  expect(choiceCategory(labels[2], 'VS-WWI22C', labels)).toBe('Studienschwerpunkte');
  expect(choiceCategory(labels[3], 'VS-WWI22C', labels)).toBeNull();
  expect(choiceCategory(labels[0], 'NEU-INF31', [labels[0]])).toBeNull();
  const entries = labels.map(title => ({ title, course: 'VS-WWI22C', type: 'lecture' } as ScheduleEntry));
  expect(filterScheduleEntries(entries, [], { site: 'VS', course: 'VS-WWI22C', degree: 'Wirtschaftsinformatik', selectedOptionalModules: [labels[0]] }).map(e => e.title)).toEqual([labels[0], labels[3]]);
  expect(studyOptionsKey([], labels)).toContain('Studienschwerpunkte');
});

it('verwechselt gleich benannte Vertiefungen verschiedener Kursprofile nicht mit Alternativen', () => {
  const entries = ['IT', 'VI'].map((track, i) => ({ title: `Vertiefung ${track}`, course: `UNI-INF31${i}`, type: 'lecture' } as ScheduleEntry));
  expect(filterScheduleEntries(entries, [], { site: 'UNI', course: 'UNI-INF310', degree: 'Informatik', selectedOptionalModules: [] })).toHaveLength(2);
});

it.each(['2024', '2031', '31'])('findet Gruppenpläne mit abweichenden Trennzeichen und Jahrgang %s', year => {
  const course = `NEU-TMB${year}A`;
  const catalog = [`${course}---GRUPPE-1`, `${course}-GR2`, `${course}-G3`, `NEU-TMB${year}B---GRUPPE-1`].map(name => ({ name, site: 'NEU' } as DhbwCourse));
  expect(suggestedCourses({ site: 'NEU', course, degree: 'Maschinenbau' }, catalog).map(c => c.name)).toEqual(catalog.slice(0, 3).map(c => c.name));
});

it('begrenzt einen zusätzlichen Sammelplan weiter auf Standort und Jahrgang', () => {
  const catalog = [
    { name: 'NEU-SO2031-ALLE-KURSE', site: 'NEU' },
    { name: 'NEU-SO2030-ALLE-KURSE', site: 'NEU' },
    { name: 'NEU-SO2031A-G1', site: 'ANDERE' },
  ] as DhbwCourse[];
  expect(suggestedCourses({ site: 'NEU', course: 'NEU-SO2031A', degree: 'Soziales' }, catalog).map(c => c.name)).toEqual(['NEU-SO2031-ALLE-KURSE']);
});

it('bildet Gruppenfamilien aus dem ganzen Titel statt nur dem Wort Lab', () => {
  const db1 = 'Lab GR 1 (A-K) Datenbanksysteme TIM+TIS';
  const db2 = 'Lab GR 2 (L-Z) Datenbanksysteme TIM+TIS';
  const other = 'Lab GR 2 Physik';
  expect(numberedGroupFamily(db1)).toBe(numberedGroupFamily(db2));
  expect(numberedGroupFamily(db1)).not.toBe(numberedGroupFamily(other));
  expect(groupIdentifier('Wirtschaftsenglisch Gruppe II')).toBe('II');
  expect(groupIdentifier('Persönlichkeitstypen Gruppe A1')).toBe('A1');
  expect(groupIdentifier('Werkstoffkunde Gruppe 10')).toBe('10');
  expect(groupIdentifier('Englisch (Gruppe Kas - Z)')).toBe('Kas - Z');
  expect(groupIdentifier('Freies Labor X Gruppen - industr. Bussysteme')).toBe('X');
});

it('bündelt ausdrücklich bezeichnete Online-/Präsenzvarianten ohne die Studienrichtungen zu vermischen', () => {
  const titles = ['CAD (CBIW)', 'CAD (CBIW) online', 'CAD (CBIW) Präsenz', 'CAD (CBIW) findet online statt!', 'CAD (TAC)'];
  const choices = mergeOfferVariants(titles.map(label => ({ key: label, label })));
  expect(choices).toHaveLength(2);
  expect(choices[0].memberKeys).toEqual(titles.slice(0, 4));
  expect(choices[1].memberKeys).toEqual([titles[4]]);
});

it('fordert nach der verbesserten Erkennung eine erneute Prüfung alter Konfigurationen an', () => {
  expect(studyOptionsKey([], ['WPS A'])).not.toBe(JSON.stringify(['choices-v3', [], ['Wahlpflichtseminare']]));
  expect(studyOptionsKey([], ['WPS A'])).toBe(studyOptionsKey([], ['WPS B']));
});

it('erkennt bei Bestandsprofilen auch ausschließlich providergebundene Studienrichtungen', () => {
  const labels = ['Biochemie (TAC)', 'Mikrobiologie (CBIW)'];
  expect(studyOptionsKey([], labels, 'MA-TCT25')).toContain('Studienschwerpunkte');
  expect(studyOptionsKey([], labels, 'NEU-ANDERER31')).toBe('');
});
