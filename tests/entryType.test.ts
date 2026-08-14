import { describe, expect, it } from 'vitest';
import { isExamTitle, isHolidayTitle, isOnlineTitle } from '../src/schedule/entryType';
import { mapScheduleItem } from '../src/dhbwApi/client';
import { deserializeEntry } from '../src/types';

/**
 * Alle Titel stammen wörtlich aus der DHBW-API (Abzug vom 14.08.2026 über alle
 * öffentlichen Kurse aller Standorte). Der Standort steht dahinter, weil die
 * Sekretariate ihre Termine unterschiedlich benennen.
 */
const ECHTE_PRUEFUNGEN = [
  'Klausur', // RV, MA, STG, HDH, VS
  'Klausur Mathematik II', // MA, MGH, MOS, RV, STG
  'Klausur Technik der Finanzbuchführung',
  'Wiederholungsklausur Mathematik', // MA, MGH, MOS, STG
  'Nach- und Wiederholungsklausur Moderne Datenbankkonzepte (120 min)|1|Modulklausur', // FN
  'WDH-Klausur_WIW24A+B', // FN
  'Nachholklausur - BStUF25', // FN
  'Nachschreibeklausurtermine',
  'Mündliche Prüfung', // HDH, MA, MOS, RV
  'Mündliche Bachelorprüfung',
  'T2000 Prüfung   (30 min.)', // FN
  'Prüfung  Algorithmen & Komplexität (90 Minuten)',
  'Wiederholungsprüfung Recht I   (120 min.)',
  'AdA-Prüfung', // HDH, MA
  'CCNA-2 Final Exam  (90 min)||', // KA
  'Probeklausur',
  'Klausur Informationsmanagement in der digitalen Transformation',
];

const KEINE_PRUEFUNGEN = [
  // Vorbereitung – der Auslöser für diese Regel
  'Klausurvorbereitung', // FN, KA, MOS, RV, STG, VS
  'Selbststudium und Klausurvorbereitung', // RV
  'Prüfungsvorbereitung',
  'Selbststudium (Prüfungsvorbereitung)', // STG
  'Zeit zur Klausurvorbereitung',
  'Klausur- Portfoliovorbereitung', // RV
  // Einsicht und Besprechung
  'Klausureinsicht', // an allen zehn Standorten
  'Klausureinsicht 2. Semester',
  'Klausurbesprechung M 12 (freiwillig)',
  'M2 Vorbesprechung Klausur',
  'Fragestunde zur Klausur IuF',
  'Freiwilliges Tutorium zur Nachholklausur M6',
  // Rahmentermine über ganze Wochen
  'Klausurwoche', // KA, MGH, MOS, RV, VS
  'Klausurphase', // HN, KA, MGH, MOS, RV
  'KLAUSURPHASE -  KEINE VORLESUNGEN MÖGLICH!', // STG
  'Prüfungswoche', // MA, RV, STG
  'Prüfungsphase', // MGH, STG
  'Klausurtage', // VS
  'Klausurblocker',
  'Klausurwoche - Genaue Zeiten und Termine entnehmen Sie bitte aus moodle und dem Klausurterminplan',
  // Organisation
  'Prüfungsform Bürgerliches Recht', // MA, MGH, MOS, RV, STG
  'Informationen Prüfungsamt Auswahl eines der Termine', // MOS
  'Ausgabe Klausuretiketten 3. Semester',
  'Schlüsselqualifikation 1 Klausurtechnik',
  'M10 Tutorium zur Prüfungsleistung (online)', // STG
  // Modulreihen, in denen „Prüfung“ das Fachthema ist
  'Prüfungswesen II', // MA, STG
  'Auditing 2 (Wirtschaftsprüfung)', // MA
  'Risikoorientierte Abschlussprüfung (Wirtschaftsprüfung 2)', // STG, VS
  'Jahresabschlussprüfung bei Kreditinstituten PW', // VS
  'Berichterstattung, Sonderprüfung (Wirtschaftsprüfung 4)', // VS
  'Revision und Rechnungsprüfung', // MA
  'Risikoprüfung und Rating', // MA
  'T4SST9004 Physik III: Verpackungsprüfung: Prüflabor', // KA
];

describe('isExamTitle', () => {
  it.each(ECHTE_PRUEFUNGEN)('erkennt %s als Prüfung', (title) => {
    expect(isExamTitle(title)).toBe(true);
  });

  it.each(KEINE_PRUEFUNGEN)('erkennt %s nicht als Prüfung', (title) => {
    expect(isExamTitle(title)).toBe(false);
  });

  it('erkennt auch die Umlaut-freie Schreibweise', () => {
    expect(isExamTitle('Muendliche Pruefung')).toBe(true);
    expect(isExamTitle('Pruefungsvorbereitung')).toBe(false);
  });
});

describe('isHolidayTitle / isOnlineTitle', () => {
  it('erkennt Feiertage', () => {
    expect(isHolidayTitle('Feiertag: Tag der Deutschen Einheit')).toBe(true);
    expect(isHolidayTitle('Karfreitag - Feiertag')).toBe(true);
    expect(isHolidayTitle('Mathematik I')).toBe(false);
  });

  it('erkennt Online-Termine nur als eigenes Wort', () => {
    expect(isOnlineTitle('Geschäftsprozesse - ONLINE')).toBe(true);
    expect(isOnlineTitle('Onlinehandel und Marktplätze')).toBe(false);
  });
});

describe('mapScheduleItem', () => {
  const base = { startTime: '2026-09-14T08:00:00.000Z', endTime: '2026-09-14T10:00:00.000Z', entityType: 'LECTURE' };

  it('stuft eine Klausur als Prüfung ein', () => {
    expect(mapScheduleItem({ ...base, name: 'Klausur Statistik', type: 'PRESENCE' })?.type).toBe('exam');
  });

  it('stuft Klausurvorbereitung als normale Vorlesung ein', () => {
    expect(mapScheduleItem({ ...base, name: 'Klausurvorbereitung', type: 'PRESENCE' })?.type).toBe('lecture');
  });

  it('bewertet den Titel ohne den Zusatz in spitzen Klammern', () => {
    // Der Zusatz trägt Dozent oder Raum und darf die Einstufung nicht kippen.
    const entry = mapScheduleItem({ ...base, name: 'Mathematik II <Prof. Prüfer>', type: 'PRESENCE' });
    expect(entry?.type).toBe('lecture');
    expect(entry?.title).toBe('Mathematik II');
  });

  it('behält den Online-Typ der API bei', () => {
    expect(mapScheduleItem({ ...base, name: 'Geschäftsprozesse', type: 'ONLINE' })?.type).toBe('online');
  });
});

describe('deserializeEntry', () => {
  const base = {
    start: '2026-09-14T08:00:00.000Z',
    end: '2026-09-14T10:00:00.000Z',
    lecturers: [],
    rooms: [],
  };

  it('stuft alt gecachte Vorbereitungstermine wieder zurück', () => {
    // Der Cache kann noch Einträge der früheren, zu weiten Erkennung enthalten.
    expect(deserializeEntry({ ...base, title: 'Klausurvorbereitung', type: 'exam' }).type).toBe('lecture');
  });

  it('lässt echte Prüfungen aus dem Cache unangetastet', () => {
    expect(deserializeEntry({ ...base, title: 'Klausur Statistik', type: 'exam' }).type).toBe('exam');
  });

  it('erkennt Prüfungen in Einträgen nach, die als Vorlesung gecacht wurden', () => {
    expect(deserializeEntry({ ...base, title: 'Wiederholungsklausur Recht', type: 'lecture' }).type).toBe('exam');
  });
});
