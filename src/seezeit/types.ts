/** Mensa-Ziel: alte Seezeit-Slugs bleiben abwärtskompatibel, API nutzt Codes. */
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
  RV: 'Ravensburg',
  FN: 'Friedrichshafen',
  STG: 'Stuttgart',
  KA: 'Karlsruhe',
  MA: 'Mannheim',
  MOS: 'Mosbach',
  MGH: 'Bad Mergentheim',
  VS: 'Villingen-Schwenningen',
  HN: 'Heilbronn',
  CAS: 'Center for Advanced Studies',
  HDH: 'Heidenheim',
  HORB: 'Horb',
  'LÖR': 'Lörrach',
};

/** Standorte, für die die öffentliche DHBW-API Mensa-Daten meldet. */
export const API_MENSA_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'RV', label: 'Ravensburg' },
  { value: 'FN', label: 'Friedrichshafen' },
  { value: 'STG', label: 'Stuttgart' },
  { value: 'KA', label: 'Karlsruhe' },
  { value: 'MA', label: 'Mannheim' },
  { value: 'MOS', label: 'Mosbach' },
  { value: 'VS', label: 'Villingen-Schwenningen' },
  { value: 'HN', label: 'Heilbronn' },
  { value: 'CAS', label: 'Center for Advanced Studies' },
  { value: 'HDH', label: 'Heidenheim' },
  { value: 'HORB', label: 'Horb' },
  { value: 'LÖR', label: 'Lörrach' },
];

export function mensaSiteCode(mensa: Mensa): string {
  if (mensa === 'ravensburg') return 'RV';
  if (mensa === 'friedrichshafen') return 'FN';
  return mensa.trim().toUpperCase();
}

export function mensaLabel(mensa: Mensa): string {
  return MENSA_LABELS[mensa] ?? API_MENSA_OPTIONS.find((option) => option.value === mensa.toUpperCase())?.label ?? mensa;
}
