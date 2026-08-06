/**
 * Ausschließlich für die App-Store-Aufnahmen.
 *
 * `?appstore-demo=day|week|grades` ersetzt persönliche Daten durch feste
 * Beispieldaten. Der Modus wird weder verlinkt noch in der normalen App
 * aktiviert und kann deshalb nicht versehentlich den echten Plan verändern.
 */

import type { DualisState } from '../ui/useDualis';
import type { AppSettings } from '../store/preferences';
import type { ScheduleEntry } from '../types';

export type AppStoreDemoScreen = 'day' | 'week' | 'grades';

export const APP_STORE_DEMO_DAY = '2026-07-20';

export function appStoreDemoScreen(): AppStoreDemoScreen | null {
  const configuredScreen = import.meta.env.VITE_APPSTORE_DEMO;
  if (configuredScreen === 'day' || configuredScreen === 'week' || configuredScreen === 'grades') {
    return configuredScreen;
  }
  if (typeof window === 'undefined') return null;
  const screen = new URLSearchParams(window.location.search).get('appstore-demo');
  return screen === 'day' || screen === 'week' || screen === 'grades' ? screen : null;
}

export function isAppStoreDemo(): boolean {
  return appStoreDemoScreen() !== null;
}

function course(
  day: string,
  start: string,
  end: string,
  title: string,
  lecturer: string,
  room: string,
): ScheduleEntry {
  return {
    start: new Date(`${day}T${start}:00+02:00`),
    end: new Date(`${day}T${end}:00+02:00`),
    title,
    lecturers: [lecturer],
    rooms: [room],
    course: 'TINF-Beispiel',
    type: 'lecture',
  };
}

/** Anonymisierte, aber realistisch dichte Woche für die Store-Aufnahmen. */
export const APP_STORE_DEMO_ENTRIES: ScheduleEntry[] = [
  course('2026-07-20', '08:30', '10:00', 'Datenanalyse und Visualisierung', 'Prof. Beispiel', 'C2.14'),
  course('2026-07-20', '10:15', '11:45', 'Projektmanagement', 'Dr. Muster', 'C1.08'),
  course('2026-07-20', '13:00', '14:30', 'Recht und Ethik in der Digitalisierung', 'Prof. Demo', 'C3.02'),
  course('2026-07-21', '09:00', '12:15', 'Software Engineering', 'Prof. Beispiel', 'C1.12'),
  course('2026-07-21', '13:15', '16:30', 'Datenbanken und Informationssysteme', 'Dr. Muster', 'C2.06'),
  course('2026-07-22', '09:00', '11:30', 'Betriebliche Informationssysteme', 'Prof. Demo', 'C3.11'),
  course('2026-07-22', '12:15', '13:45', 'Kommunikation und Präsentation', 'Prof. Beispiel', 'C1.03'),
  course('2026-07-23', '08:30', '11:45', 'Web Engineering', 'Dr. Muster', 'C2.09'),
  course('2026-07-23', '13:00', '15:30', 'IT-Sicherheit und Datenschutz', 'Prof. Demo', 'C1.16'),
  course('2026-07-24', '09:00', '12:15', 'Controlling und Unternehmensführung', 'Prof. Beispiel', 'C3.05'),
];

export const APP_STORE_DEMO_SETTINGS: AppSettings = {
  raplaLink: 'https://rapla.dhbw.de/rapla/calendar?user=demo&file=beispiel',
  rapla: {
    user: 'demo',
    file: 'beispiel',
    baseUrl: 'https://rapla.dhbw.de/rapla/calendar',
  },
  morningEnabled: true,
  morningTime: '07:00',
  liveEnabled: false,
  reminderEnabled: true,
  reminderMinutes: 15,
  mensaEnabled: true,
  mensa: 'ravensburg',
};

/** Ebenfalls nur Beispieldaten: keine Dualis-Informationen einer Person. */
export const APP_STORE_DEMO_DUALIS: DualisState = {
  loginState: 'logged-in',
  prefs: { username: '', rememberUsername: false },
  dashboard: {
    summary: {
      gpaTotal: 1.8,
      gpaMainModules: 1.7,
      creditsGained: 75,
      creditsTotal: 210,
    },
    modules: [
      { id: 'M-101', name: 'Grundlagen der Betriebswirtschaft', credits: '5', grade: '1,7', passed: true },
      { id: 'M-102', name: 'Programmierung und Algorithmen', credits: '5', grade: '2,0', passed: true },
      { id: 'M-103', name: 'Datenbanken', credits: '5', grade: '1,3', passed: true },
      { id: 'M-104', name: 'Wissenschaftliches Arbeiten', credits: '5', grade: '2,3', passed: true },
    ],
    semesters: ['Sommersemester 2026', 'Wintersemester 2025/26'],
  },
  selectedSemester: 'Sommersemester 2026',
  semesterModules: [
    { id: 'M-201', name: 'Datenanalyse und Visualisierung', credits: '5', grade: '1,7', passed: true },
    { id: 'M-202', name: 'Projektmanagement', credits: '5', grade: '2,0', passed: true },
    { id: 'M-203', name: 'IT-Sicherheit und Datenschutz', credits: '5', grade: '1,3', passed: true },
    { id: 'M-204', name: 'Web Engineering', credits: '5', grade: '1,7', passed: true },
  ],
  moduleExams: {},
  loading: false,
  error: null,
};
