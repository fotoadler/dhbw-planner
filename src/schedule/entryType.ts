/**
 * Erkennung des Termintyps aus dem Titel.
 *
 * Hintergrund: Das Feld `type` der DHBW-API kennt nur `PRESENCE`, `ONLINE` und
 * `HYBRID` – einen Prüfungs- oder Feiertagstyp gibt es dort nicht. Geprüft am
 * 14.08.2026 über alle 444.854 Termine der 1.809 öffentlichen Kurse an den
 * 10 Standorten mit Kursen (FN, HDH, HN, KA, MA, MGH, MOS, RV, STG, VS): kein
 * einziger Termin trägt einen anderen Typ. Ob ein Termin eine Prüfung ist,
 * steht also ausschließlich im Freitext-Titel – und den formuliert jedes
 * Sekretariat anders.
 *
 * Deshalb arbeitet die Erkennung zweistufig: ein Suchbegriff muss vorkommen,
 * und gleichzeitig darf keiner der Ausschlüsse greifen. Ohne die Ausschlüsse
 * landen vor allem Vorbereitungs-, Einsichts- und Rahmentermine sowie ganze
 * Modulreihen aus der Wirtschaftsprüfung fälschlich als Prüfung im Kalender –
 * über den Gesamtbestand sind das 9.857 Termine, also 30 % aller Treffer.
 *
 * Die Zahlen in den Kommentaren sind die im Gesamtbestand gezählten Termine je
 * Ausschluss.
 */

/**
 * Kleinschreibung plus Umlaut-Normalisierung, damit die Muster unten nur in
 * einer Schreibweise gepflegt werden müssen: In den Rapla-Titeln stehen sowohl
 * „Prüfung“ als auch „Pruefung“.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

const EXAM_KEYWORD = /klausur|pruefung|testat|\bexam(en)?\b/;

const NOT_AN_EXAM = new RegExp(
  [
    // Vor- und Nachbereitung – gerade nicht der Prüfungstermin selbst.
    'vorbereit', // Klausurvorbereitung (1.567)
    'selbststudium', // Selbststudium (Prüfungsvorbereitung) (112)
    'einsicht', // Klausureinsicht (3.050)
    'besprechung', // Klausurbesprechung, M2 Vorbesprechung Klausur (290)
    'nachbereit',
    'fragestunde', // Fragestunde zur Klausur IuF (31)
    'tutorium', // Freiwilliges Tutorium zur Nachholklausur M6 (193)
    'klausurtechnik', // Schlüsselqualifikation 1 Klausurtechnik (6)

    // Rahmentermine über ganze Tage oder Wochen statt einer einzelnen Prüfung.
    'klausur(en)?(phase|woche|wochen|tage|zeit|zeitraum)', // Klausurwoche, Klausurphase (2.244)
    'pruefungs(phase|woche|wochen|zeitraum)', // Prüfungswoche, Prüfungsphase (449)
    'blocker', // Klausurblocker, Blocker Klausurwoche (112)
    'keine vorlesung', // KLAUSURPHASE - KEINE VORLESUNGEN MÖGLICH! (566)
    'vorlesungsfrei',

    // Organisation rund um Prüfungen.
    'pruefungsform', // Prüfungsform Bürgerliches Recht (728)
    'pruefungsamt', // Informationen Prüfungsamt (113)
    'pruefungsordnung',
    'pruefungsakten',
    'pruefungsplan',
    'pruefungsleistung', // Tutorium zur Prüfungsleistung M10 (127)
    'klausurplan',
    'klausuretikett',
    'anmeldung',
    'infoveranstaltung',
    'informationsveranstaltung',

    // Modulnamen, in denen „Prüfung“ das Fachthema ist (Wirtschaftsprüfung,
    // Revision). Diese Reihen laufen über ein ganzes Semester.
    'pruefungswesen', // Prüfungswesen II (441)
    'wirtschaftspruefung', // Auditing 2 (Wirtschaftsprüfung) (217)
    'abschlusspruefung', // Risikoorientierte Abschlussprüfung (146)
    'jahresabschluss',
    'sonderpruefung', // Berichterstattung, Sonderprüfung (49)
    'rechnungspruefung', // Revision und Rechnungsprüfung (17)
    'risikopruefung', // Risikoprüfung und Rating (34)
    'verpackungspruefung',
    'auditing',
  ].join('|'),
);

const HOLIDAY_KEYWORD = /feiertag|holiday/;
const ONLINE_KEYWORD = /\bonline\b/;

/** Ist der Termin eine tatsächlich zu schreibende Prüfung? */
export function isExamTitle(title: string): boolean {
  const text = normalize(title);
  return EXAM_KEYWORD.test(text) && !NOT_AN_EXAM.test(text);
}

export function isHolidayTitle(title: string): boolean {
  return HOLIDAY_KEYWORD.test(normalize(title));
}

export function isOnlineTitle(title: string): boolean {
  return ONLINE_KEYWORD.test(normalize(title));
}
