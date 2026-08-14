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
 * über den Gesamtbestand sind das 9.187 Termine, also 28 % aller Treffer.
 *
 * Die Ausschlussliste ist vollständig gegen den Bestand geprüft: Die 23.839
 * verbleibenden Prüfungstermine enthalten 150 verschiedene Wortformen mit einem
 * Suchbegriff (Klausur, Wiederholungsklausur, Nachholklausur, Prüfungstermin …);
 * jede davon wurde einzeln durchgesehen. Die Zahlen in den Kommentaren sind die
 * im Bestand gezählten Termine je Ausschluss.
 *
 * Zwei Muster sehen wie Organisation aus, sind aber die Prüfung selbst und
 * stehen deshalb bewusst NICHT in der Liste: „Prüfungsform <Modul>“ (724) und
 * „Prüfungswahl <Modul>“ (298). Beide dauern 60–120 Minuten, kommen je Kurs
 * genau einmal vor, und 604 bzw. 280 davon haben keinen separaten
 * Klausur-Termin zum selben Modul. Bei 115 steht die Prüfungsart sogar im Titel
 * („Prüfungsform Wirtschaftsrecht KLAUSUR“).
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
    'vorbreit|vorbnereit|vornbereit|voprbereit', // Schreibfehler dafür im Bestand
    'selbststudium', // Selbststudium (Prüfungsvorbereitung) (112)
    'einsicht', // Klausureinsicht (3.050)
    'einsciht|einischt|einicht|eichsicht', // Schreibfehler für Klausureinsicht
    'klausuransicht',
    'besprechung', // Klausurbesprechung, M2 Vorbesprechung Klausur (290)
    'nachbereit',
    'fragestunde', // Fragestunde zur Klausur IuF (31)
    'tutorium', // Freiwilliges Tutorium zur Nachholklausur M6 (193)
    'klausurtechnik|klausurtraining', // Schlüsselqualifikation 1 Klausurtechnik
    'exam prep|mock exam|exam review', // englische Entsprechungen

    // Rahmentermine über ganze Tage oder Wochen statt einer einzelnen Prüfung.
    'klausur(en)?(phase|woche|wochen|tage|zeit|zeitraum)', // Klausurwoche, Klausurphase (2.244)
    'pruefungs(phase|woche|wochen|zeitraum)', // Prüfungswoche, Prüfungsphase (449)
    'blocker', // Klausurblocker, Blocker Klausurwoche (112)
    'keine vorlesung', // KLAUSURPHASE - KEINE VORLESUNGEN MÖGLICH! (566)
    'vorlesungsfrei',

    // Organisation rund um Prüfungen.
    'pruefungsamt', // Informationen Prüfungsamt (113)
    'pruefungsausschuss|pruefungsauschuss', // Sitzung Prüfungsausschuss Maschinenbau (9)
    'pruefungsordnung',
    'pruefungsakten',
    'pruefungsplan',
    'pruefungsmoodle', // Anmeldung T2000 Prüfungsmoodle (13)
    'pruefungsrecht', // Info Prüfungsrecht, Prüfungsrechtliche Regelungen
    'pruefungsruecktritt|pruefungsinformationen|pruefungseinteilung|pruefungseinweiung|pruefungsthemen',
    'klausurplan',
    'klausuretikett',
    'klausurraeume', // Raumzuteilung „Klausurräume NPO HS: 105“ (17)
    'klausureinfuehrung|klausureinweisung|klausurablauf|klausurinfo|klausurbeispiel',
    'klausursprechstunde|pruefungssprechstunde',
    'anmeldung',
    'infoveranstaltung',
    'informationsveranstaltung',

    // Modulnamen, in denen „Prüfung“ das Fachthema ist (Wirtschaftsprüfung,
    // Revision, Werkstoffkunde). Diese Reihen laufen über ein ganzes Semester;
    // sie wiederholen sich je Kurs vier- bis elfmal und dauern rund 200 Minuten,
    // während eine Prüfung je Kurs einmal stattfindet.
    'pruefungswesen', // Prüfungswesen II (441)
    'wirtschaftspruefung', // Auditing 2 (Wirtschaftsprüfung) (217)
    'abschlusspruefung', // Risikoorientierte Abschlussprüfung (146)
    'jahresabschluss',
    'sonderpruefung', // Berichterstattung, Sonderprüfung (49)
    'rechnungspruefung', // Revision und Rechnungsprüfung (17)
    'risikopruefung', // Risikoprüfung und Rating (34)
    'prozesspruefung', // System- und Prozessprüfung (25)
    'betriebspruefung|aussenpruefung', // Steuerrecht: Außenprüfung (29)
    'werkstoffpruefung|werstoffpruefung|verpackungspruefung|biegezugpruefung',
    'systempruefung|datenpruefung|sortenpruefung|ueberpruefung',
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
