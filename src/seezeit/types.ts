import { DINING_SITE_OPTIONS, diningProfileForSite } from '../mensa/sites';

/** Mensa-Ziel: alte Seezeit-Slugs bleiben abwärtskompatibel, Profile nutzen Codes. */
export type Mensa = 'ravensburg' | 'friedrichshafen' | (string & {});

/** Ein Gericht eines Mensa-Tags. Bereits JSON-serialisierbar (nur Strings/Arrays). */
export interface MensaMeal {
  /** Kategorie, z. B. "Seezeit-Teller", "KombinierBar", "Salatbeilage", "Dessert". */
  category: string;
  /** Gerichtsname ohne die Allergen-/Zusatzstoff-Hochzahlen. */
  title: string;
  /** Studierenden-Preis, z. B. "4,40 €" (fehlt bei Beilagen ohne Preis). */
  price?: string;
  /** Kennzeichnungen aus den Icons, z. B. ["Vegetarisch"] oder ["Rind"]. */
  diet: string[];
}

/** Speiseplan als Zuordnung Kalendertag ("YYYY-MM-DD") → Gerichte. */
export type MensaPlan = Record<string, MensaMeal[]>;

export const MENSA_LABELS: Record<string, string> = {
  ravensburg: 'Ravensburg',
  friedrichshafen: 'Friedrichshafen',
  ...Object.fromEntries(DINING_SITE_OPTIONS.map((option) => [option.value, option.label])),
};

/** Alle separat gepflegten Essensstandorte, einschließlich Partnerverzeichnissen. */
export const API_MENSA_OPTIONS: Array<{ value: string; label: string }> = DINING_SITE_OPTIONS;

export function mensaSiteCode(mensa: Mensa): string {
  if (mensa === 'ravensburg') return 'RV';
  if (mensa === 'friedrichshafen') return 'FN';
  return mensa.trim().toUpperCase();
}

export function mensaLabel(mensa: Mensa): string {
  if (MENSA_LABELS[mensa]) return MENSA_LABELS[mensa];
  return diningProfileForSite(mensa).label;
}
