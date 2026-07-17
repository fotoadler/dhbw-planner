/**
 * Parser für die Seezeit-Speisepläne (seezeit.com).
 *
 * Die Speisepläne sind fertig server-gerendertes HTML: eine Tab-Leiste mit den
 * zehn Werktagen zweier Wochen und je Tag ein Inhaltsblock mit den Gerichten.
 *
 *   <a class="tab tab1  aktiv"><span> Mo. 13.07.</span></a>          (Tag-Reiter)
 *   <div class="contents contents_1" id="tab1">
 *     <div class="speiseplanTagKat 3 25a 28">
 *       <div class="category">Seezeit-Teller</div>
 *       <div class="title_preise">
 *         <div class="title_preise_1">
 *           <div class="title">Hackbällchen <sup>(3,25a)</sup> …</div>
 *           <div class="preise">4,40 € Studierende | 5,90 € Mitarbeiter | …</div>
 *         </div>
 *         <div class="title_preise_2">
 *           <div class="speiseplanTagKatIcon B"></div>              (Kennzeichen)
 *         </div>
 *       </div>
 *     </div>
 *   </div>
 *
 * Die Reiter tragen nur "Tag. TT.MM." ohne Jahr — das Jahr leiten wir aus dem
 * heutigen Tag ab (Seezeit zeigt stets nur die aktuelle und die nächste Woche).
 * Leere `speiseplanTagKat`-Blöcke (Mensa ohne Angebot, z. B. vorlesungsfreie
 * Zeit) werden übersprungen.
 */

import { Ymd, ymdKey } from '../lib/berlinTime';
import { Mensa, MensaMeal, MensaPlan } from './types';

/** Icon-Kürzel → Klartext (aus der Legende `.tabsIcons` der Seezeit-Seite). */
const DIET_LABELS: Record<string, string> = {
  Vegan: 'Vegan',
  Veg: 'Vegetarisch',
  Sch: 'Schwein',
  R: 'Rind',
  G: 'Geflügel',
  L: 'Lamm',
  W: 'Wild',
  F: 'Fisch',
  B: 'Bessere Tierhaltung',
};

/** Jahr für einen Tag ableiten — nur an der Jahresgrenze wird korrigiert. */
function resolveYear(month: number, today: Ymd): number {
  if (today.m === 12 && month === 1) return today.y + 1;
  if (today.m === 1 && month === 12) return today.y - 1;
  return today.y;
}

/** Studierenden-Preis aus der Preiszeile ("4,40 € Studierende | …"). */
function parseStudentPrice(text: string): string | undefined {
  const match = text.match(/([\d.,]+)\s*€\s*Studierende/i);
  return match ? `${match[1]} €` : undefined;
}

/**
 * Bereinigter Textinhalt eines Elements:
 *  - Allergen-/Zusatzstoff-Hochzahlen (`<sup>`) entfernen,
 *  - manuelle Silbentrennung vor Zeilenumbruch auflösen
 *    ("Sättigungs-<br>beilage" → "Sättigungsbeilage") und weiche Trennstriche (&shy;)
 *    tilgen — echte Bindestriche wie "Seezeit-Teller" bleiben erhalten,
 *  - übrige Tags/Umbrüche zu Leerzeichen, Mehrfach-Leerraum normalisieren.
 */
function cleanText(el: Element | null): string {
  if (!el) return '';
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('sup').forEach((s) => s.remove());
  const html = clone.innerHTML
    .replace(/­/g, '')
    .replace(/-\s*<\s*\/?\s*br\s*\/?\s*>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  const text = new DOMParser().parseFromString(html, 'text/html').documentElement.textContent ?? '';
  return text.replace(/\s+/g, ' ').trim();
}

function parseMeal(block: Element): MensaMeal | null {
  const category = cleanText(block.querySelector('.category'));
  const title = cleanText(block.querySelector('.title'));

  // Leere Platzhalter (kein Angebot) überspringen.
  if (!category && !title) return null;

  const price = parseStudentPrice(block.querySelector('.preise')?.textContent ?? '');

  const diet: string[] = [];
  for (const icon of Array.from(block.querySelectorAll('.speiseplanTagKatIcon'))) {
    const code = Array.from(icon.classList).find((c) => c !== 'speiseplanTagKatIcon');
    const label = code ? DIET_LABELS[code] : undefined;
    if (label && !diet.includes(label)) diet.push(label);
  }

  return { category, title, price, diet };
}

/**
 * Parst eine Seezeit-Speiseplanseite zu einem Plan (Kalendertag → Gerichte).
 * `today` bestimmt das Jahr der reiterlosen Datumsangaben.
 */
export function parseSeezeit(html: string, today: Ymd): MensaPlan {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const plan: MensaPlan = {};

  for (const tab of Array.from(doc.querySelectorAll('a.tab'))) {
    const num = Array.from(tab.classList)
      .map((c) => /^tab(\d+)$/.exec(c)?.[1])
      .find(Boolean);
    if (!num) continue;

    const dateMatch = tab.textContent?.match(/(\d{1,2})\.(\d{1,2})\.?/);
    if (!dateMatch) continue;
    const day = +dateMatch[1];
    const month = +dateMatch[2];
    const key = ymdKey({ y: resolveYear(month, today), m: month, d: day });

    const contents = doc.getElementById(`tab${num}`);
    if (!contents) continue;

    const meals: MensaMeal[] = [];
    for (const block of Array.from(contents.querySelectorAll('.speiseplanTagKat'))) {
      const meal = parseMeal(block);
      if (meal) meals.push(meal);
    }
    if (meals.length > 0) plan[key] = meals;
  }

  return plan;
}

/** Slug der Mensa-Seite auf seezeit.com. */
export const MENSA_SLUGS: Record<Mensa, string> = {
  ravensburg: 'mensa-ravensburg',
  friedrichshafen: 'mensa-friedrichshafen',
};
