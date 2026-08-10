/** Gemeinsames, verlustfreies ViewModel fuer alle standortspezifischen Essensangebote. */

export type DiningDayStatus = 'open' | 'closed' | 'partial' | 'unpublished' | 'unavailable';
export type DiningPresentation = 'single-facility' | 'facility-tabs' | 'partner-list' | 'preorder';
export type DiningApiBucket = 'starter' | 'main' | 'side' | 'dessert';
export type DiningFacilityKind = 'warm-meals' | 'serving-counter' | 'external-menu';

export interface DiningPeriod {
  from: string;
  to: string;
  label: string;
  hours?: string;
  /** Beleg fuer die Angabe; feste Zeitraeume veralten sonst unbemerkt. */
  source?: string;
  /** Datum der letzten Pruefung im Format YYYY-MM-DD. */
  checkedAt?: string;
}

export interface DiningPrice {
  student?: number;
  employee?: number;
  guest?: number;
}

export interface DiningMeal {
  id: string;
  facilityId: string;
  title: string;
  englishTitle?: string;
  /** Bezeichnung, die in der App gezeigt wird. */
  category: string;
  /** Unveraenderte Herkunft aus der API; wichtig fuer lokale Normalisierer. */
  sourceCategory: DiningApiBucket | 'official';
  prices: DiningPrice;
  priceUnit?: 'portion' | 'per-100g';
  dietaryLabels: string[];
  allergens: string[];
  additives: string[];
  imageUrl?: string;
  co2Grams?: number;
  requiresPreorder?: boolean;
  orderDeadline?: string;
  orderUrl?: string;
}

export interface DiningDay {
  date: string;
  status: DiningDayStatus;
  statusMessage?: string;
  meals: DiningMeal[];
}

export interface DiningFacility {
  id: string;
  sourceId?: number;
  kind: DiningFacilityKind;
  name: string;
  shortName?: string;
  address?: string;
  openingHours?: string;
  mealHours?: string;
  infoUrl?: string;
  menuUrl?: string;
  orderUrl?: string;
  notice?: string;
  active: boolean;
  supportsUtilization: boolean;
  sourceUpdatedAt?: string;
  specialPeriods: DiningPeriod[];
  days: Record<string, DiningDay>;
}

export interface DiningPartner {
  id: string;
  name: string;
  description?: string;
  address?: string;
  hours?: string;
  menuUrl?: string;
  infoUrl?: string;
  orderUrl?: string;
}

export interface DiningVoucher {
  price: number;
  value: number;
  description: string;
  infoUrl: string;
}

export interface DiningSnapshot {
  site: string;
  label: string;
  operator: string;
  presentation: DiningPresentation;
  intro?: string;
  officialInfoUrl?: string;
  facilities: DiningFacility[];
  partners: DiningPartner[];
  voucher?: DiningVoucher;
  fetchedAt: number;
}

export type DiningLoadStatus = 'idle' | 'loading' | 'ready' | 'stale' | 'error';
