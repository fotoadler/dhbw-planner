import { studyGroup } from './studyGroups';
import { providerChoiceCategory } from './studyOptionProviders';

/** Context corroborates abbreviated study tracks; “Vertiefung” alone also names ordinary content. */
function trackCodes(label: string): string[] {
  const match = /\bVertiefung\s+([A-Z]{2,4}(?:\s*\+\s*[A-Z]{2,4})*)\b/.exec(label);
  return match ? match[1].split(/\s*\+\s*/) : [];
}

/** Explicit elective labels; ordinary exercise lectures remain common. */
export function choiceCategory(label: string, course?: string, labels: string[] = []): string | null {
  if (/^\s*[?!\s]*(?:(?:Nachhol|Nach|Wiederholungs)?Klausur|Prüfung|KL|NKL|WKL)\b/i.test(label)) return null;
  if (/\b(?:Information(?:en)?|Infoveranstaltung|Einführungsveranstaltung|Besprechung|Kurssprecherwahl|Planung|Klausureinsicht)\b/i.test(label) && !/^\s*(?:WPS|WPM[- :])/i.test(label)) return null;
  if (/^\s*Anmeldung\b/i.test(label)) return null;
  if (/^\s*Wahl\s/i.test(label)) return null;
  if (/Studienschwerpunkt|Vertiefungsrichtung/i.test(label)) return 'Studienschwerpunkte';
  if (trackCodes(label).length && new Set(labels.flatMap(trackCodes)).size > 1) return 'Studienschwerpunkte';
  if (/^\s*M\d+\s+Ü(?:bung(?:en)?\b|\s|(?=[A-ZÄÖÜ]))/i.test(label)) return 'Übungen';
  if (isSharedStudySource(course) && /^Literaturrecherche(?:\s+\d+)?$/i.test(label)) return 'Übungen';
  if (/\bWPS\b|Wahlpflichtseminar/i.test(label)) return 'Wahlpflichtseminare';
  if (/\b(?:WPM|WPF|WF)\b|Wahlpflicht|Wahlmodul|Wahlf(?:ach|ächer|aecher)|Wahlangebot/i.test(label)) return 'Wahlmodule';
  if (studyGroup(label)) return 'Gruppen';
  return providerChoiceCategory(label, course);
}

export function isSharedStudySource(course?: string): boolean {
  return /-(?:ALLE-KURSE|(?:[A-Z]-[A-Z]-)?(?:SG\+)?WAHLPFLICHT)$/.test(course ?? '');
}

export function isChoiceModule(label: string, course?: string, labels: string[] = []): boolean {
  return choiceCategory(label, course, labels) !== null;
}
