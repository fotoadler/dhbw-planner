import type {
  DiningApiBucket,
  DiningFacilityKind,
  DiningPartner,
  DiningPeriod,
  DiningPresentation,
  DiningVoucher,
} from '../model';

export type DiningSource =
  | { kind: 'dhbw-api'; apiSite?: string }
  | { kind: 'seezeit'; legacyMensa: 'ravensburg' | 'friedrichshafen'; apiSite: string }
  | { kind: 'stw-heidelberg'; venue: string; apiSite: string }
  | { kind: 'partners' };

export interface DiningFacilityProfile {
  id: string;
  apiId?: number;
  kind?: DiningFacilityKind;
  name: string;
  shortName?: string;
  address?: string;
  openingHours?: string;
  mealHours?: string;
  infoUrl?: string;
  menuUrl?: string;
  orderUrl?: string;
  notice?: string;
  specialPeriods?: DiningPeriod[];
}

export interface DiningSiteProfile {
  site: string;
  label: string;
  operator: string;
  presentation: DiningPresentation;
  venueScope?: 'local' | 'multi-site';
  source: DiningSource;
  intro?: string;
  officialInfoUrl?: string;
  facilities: DiningFacilityProfile[];
  partners?: DiningPartner[];
  voucher?: DiningVoucher;
  /** Lokale, fachlich belastbare Ersatzbezeichnungen fuer API-Buckets. */
  categoryLabels?: Partial<Record<DiningApiBucket, string>>;
  /** Identische API-Zeilen innerhalb einer Einrichtung und eines Tages entfernen. */
  deduplicate?: boolean;
  /** API-Allergen-/Zusatzstofffelder sind bei einigen Betreibern vertauscht. */
  markerPolicy?: 'native' | 'swapped' | 'mixed-additives' | 'hidden';
  /** Weitere API-Preisrollen sind je Betreiber teils verschoben; Standard ist student-only. */
  pricePolicy?: 'student-only' | 'all';
  /** Optionale lokale Erkennung eines als Gericht gelieferten Schliesshinweises. */
  closedMealPattern?: RegExp;
}

export function defineDiningSite(profile: DiningSiteProfile): DiningSiteProfile {
  return profile;
}
