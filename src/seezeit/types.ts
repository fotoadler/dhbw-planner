/** Für die App relevante Seezeit-Mensen (DHBW-Standorte). */
export type Mensa = 'ravensburg' | 'friedrichshafen';

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

export const MENSA_LABELS: Record<Mensa, string> = {
  ravensburg: 'Ravensburg',
  friedrichshafen: 'Friedrichshafen',
};
