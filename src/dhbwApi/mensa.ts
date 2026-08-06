/**
 * Typisierter Client und Adapter für die öffentlichen Mensa-Endpunkte der
 * DHBW-App-API.
 *
 * Die API liefert pro Standort ein Array mit Mensa-Informationen und deren
 * Menü-Tagen. Die App verwendet bereits das Seezeit-Modell
 * `MensaPlan`/`MensaMeal`; dieses Modul hält die API-Struktur deshalb bewusst
 * außerhalb der UI und übersetzt sie an einer einzigen Stelle.
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { berlinDayKey } from '../lib/berlinTime';
import { MensaMeal, MensaPlan } from '../seezeit/types';

export const DHBW_MENSA_API_BASE_URL = 'https://api.dhbw.app';

export interface DhbwMensaInfo {
  id: number;
  site: string;
  name: string;
  sitePriority: number | null;
  active: boolean;
  address: string;
  openingHours: string;
  infoUrl: string | null;
  menuUrl: string | null;
  supportsUtilization: boolean;
}

export interface DhbwMensaMeal {
  id: number;
  name: string;
  site: string;
  type: string;
  priceStudent: number | null;
  priceEmployee: number | null;
  priceGuest: number | null;
  co2Portion: number | null;
  co2100g: number | null;
  image: string | null;
  allergens: string[];
  additives: string[];

  /** Optional future-compatible fields; they are not present in all API data. */
  category?: string | null;
  diet?: string[] | null;
  labels?: string[] | null;
  tags?: string[] | null;
}

export interface DhbwMensaMenu {
  id: number;
  site: string;
  date: string;
  closed: boolean;
  starters: DhbwMensaMeal[];
  mainCourses: DhbwMensaMeal[];
  sideOrders: DhbwMensaMeal[];
  desserts: DhbwMensaMeal[];
}

export interface DhbwMensaResponse {
  lastUpdate: string;
  mensaInfo: DhbwMensaInfo;
  menus: DhbwMensaMenu[];
}

export type JsonGetter = (url: string) => Promise<unknown>;

export interface DhbwMensaClientOptions {
  /** Override for tests or a self-hosted API-compatible endpoint. */
  baseUrl?: string;
  /** Injectable transport keeps the adapter deterministic and easy to test. */
  getJson?: JsonGetter;
}

export type MensaCategory = 'starter' | 'main' | 'side' | 'dessert';

const CATEGORY_LABELS: Record<MensaCategory, string> = {
  starter: 'Vorspeise',
  main: 'Hauptgericht',
  side: 'Beilage',
  dessert: 'Dessert',
};

const DEFAULT_JSON_HEADERS = { Accept: 'application/json' };

/**
 * Übersetzt eine API-Antwort in das gemeinsame Tagesplan-Modell.
 *
 * Mehrere Mensa-Einträge mit demselben Site-Code werden zusammengeführt. Das
 * ist für Standorte mit mehreren Mensen wichtig und kostet die spätere UI
 * keine Sonderlogik.
 */
export function mapDhbwMensaResponse(response: DhbwMensaResponse | DhbwMensaResponse[]): MensaPlan {
  const entries = Array.isArray(response) ? response : [response];
  const plan: MensaPlan = {};

  for (const mensa of entries) {
    for (const menu of mensa.menus) {
      const date = parseApiDate(menu.date);
      if (!date) continue;

      const key = berlinDayKey(date);
      const meals = [
        ...mapMeals(menu.starters, 'starter'),
        ...mapMeals(menu.mainCourses, 'main'),
        ...mapMeals(menu.sideOrders, 'side'),
        ...mapMeals(menu.desserts, 'dessert'),
      ];

      // Auch geschlossene Tage werden mit [] repräsentiert. Dadurch bleibt
      // erkennbar, dass die API den Tag kennt, aber kein Angebot führt.
      plan[key] = [...(plan[key] ?? []), ...meals];
    }
  }

  return plan;
}

/** Übersetzt nur einen einzelnen API-Menütag; nützlich für isolierte Tests. */
export function mapDhbwMensaMenu(menu: DhbwMensaMenu): { date: string; meals: MensaMeal[] } | null {
  const date = parseApiDate(menu.date);
  if (!date) return null;

  return {
    date: berlinDayKey(date),
    meals: [
      ...mapMeals(menu.starters, 'starter'),
      ...mapMeals(menu.mainCourses, 'main'),
      ...mapMeals(menu.sideOrders, 'side'),
      ...mapMeals(menu.desserts, 'dessert'),
    ],
  };
}

export class DhbwMensaClient {
  private readonly baseUrl: string;
  private readonly getJson: JsonGetter;

  constructor(options: DhbwMensaClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DHBW_MENSA_API_BASE_URL).replace(/\/$/, '');
    this.getJson = options.getJson ?? defaultGetJson;
  }

  /** Lädt und adaptiert die Mensa-Daten eines beliebigen Site-Codes. */
  async fetchPlan(site: string): Promise<MensaPlan> {
    const response = await this.fetchResponse(site);
    return mapDhbwMensaResponse(response);
  }

  /** Lädt die Rohdaten eines beliebigen Site-Codes für Metadaten wie den Namen. */
  async fetchResponse(site: string): Promise<DhbwMensaResponse[]> {
    const normalizedSite = normalizeSite(site);
    if (!normalizedSite) throw new Error('DHBW-Mensa-API: Standortcode fehlt.');

    const payload = await this.getJson(this.url(`/mensa/${encodeURIComponent(normalizedSite)}`));
    return parseDhbwMensaResponse(payload);
  }

  /** Lädt alle von der API angebotenen Standort-Menüs in einem Request. */
  async fetchAllPlans(): Promise<Record<string, MensaPlan>> {
    const payload = await this.getJson(this.url('/mensa'));
    const responses = parseDhbwMensaResponse(payload);
    const plans: Record<string, MensaPlan> = {};

    for (const response of responses) {
      const site = normalizeSite(response.mensaInfo.site);
      if (!site) continue;
      plans[site] = mergePlans(plans[site], mapDhbwMensaResponse(response));
    }

    return plans;
  }

  private url(path: string): string {
    // Im lokalen Web-Dev läuft der Request über den vorhandenen Vite-Proxy,
    // damit CORS nicht von der Browser-Origin abhängt. Native Builds und
    // Produktion verwenden die öffentliche API direkt.
    if (this.baseUrl === DHBW_MENSA_API_BASE_URL && !Capacitor.isNativePlatform() && import.meta.env.DEV) {
      return `/dhbw-api${path}`;
    }
    return `${this.baseUrl}${path}`;
  }
}

/** Funktions-API für die spätere UI-Integration. */
export async function fetchDhbwMensaPlan(
  site: string,
  options: DhbwMensaClientOptions = {},
): Promise<MensaPlan> {
  return new DhbwMensaClient(options).fetchPlan(site);
}

function mapMeals(meals: DhbwMensaMeal[], category: MensaCategory): MensaMeal[] {
  return meals.flatMap((meal) => {
    const title = meal.name.trim();
    if (!title) return [];

    const price = formatStudentPrice(meal.priceStudent);
    const diet = readDietLabels(meal);

    return [{
      category: meal.category?.trim() || CATEGORY_LABELS[category],
      title,
      ...(price ? { price } : {}),
      diet,
    }];
  });
}

function readDietLabels(meal: DhbwMensaMeal): string[] {
  const labels = [meal.diet, meal.labels, meal.tags].flatMap((value) => value ?? []);
  return [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
}

function formatStudentPrice(value: number | null): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return `${new Intl.NumberFormat('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)} €`;
}

function parseApiDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function normalizeSite(site: string): string {
  return site.trim().toUpperCase();
}

function mergePlans(first: MensaPlan | undefined, second: MensaPlan): MensaPlan {
  if (!first) return second;
  const merged: MensaPlan = { ...first };
  for (const [date, meals] of Object.entries(second)) {
    merged[date] = [...(merged[date] ?? []), ...meals];
  }
  return merged;
}

function parseDhbwMensaResponse(payload: unknown): DhbwMensaResponse[] {
  const values = Array.isArray(payload) ? payload : [payload];
  const responses = values.filter(isDhbwMensaResponse);
  if (responses.length !== values.length) {
    throw new Error('DHBW-Mensa-API: Antwort hat ein unbekanntes Format.');
  }
  return responses;
}

function isDhbwMensaResponse(value: unknown): value is DhbwMensaResponse {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  const info = item.mensaInfo;
  return (
    typeof item.lastUpdate === 'string' &&
    isMensaInfo(info) &&
    Array.isArray(item.menus) &&
    item.menus.every(isMensaMenu)
  );
}

function isMensaInfo(value: unknown): value is DhbwMensaInfo {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    typeof item.site === 'string' &&
    typeof item.name === 'string' &&
    (typeof item.sitePriority === 'number' || item.sitePriority === null) &&
    typeof item.active === 'boolean' &&
    typeof item.address === 'string' &&
    typeof item.openingHours === 'string' &&
    (typeof item.infoUrl === 'string' || item.infoUrl === null) &&
    (typeof item.menuUrl === 'string' || item.menuUrl === null) &&
    typeof item.supportsUtilization === 'boolean'
  );
}

function isMensaMenu(value: unknown): value is DhbwMensaMenu {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    typeof item.site === 'string' &&
    typeof item.date === 'string' &&
    typeof item.closed === 'boolean' &&
    Array.isArray(item.starters) && item.starters.every(isMensaMeal) &&
    Array.isArray(item.mainCourses) && item.mainCourses.every(isMensaMeal) &&
    Array.isArray(item.sideOrders) && item.sideOrders.every(isMensaMeal) &&
    Array.isArray(item.desserts) && item.desserts.every(isMensaMeal)
  );
}

function isMensaMeal(value: unknown): value is DhbwMensaMeal {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    typeof item.site === 'string' &&
    typeof item.type === 'string' &&
    (typeof item.priceStudent === 'number' || item.priceStudent === null) &&
    (typeof item.priceEmployee === 'number' || item.priceEmployee === null) &&
    (typeof item.priceGuest === 'number' || item.priceGuest === null) &&
    (typeof item.co2Portion === 'number' || item.co2Portion === null) &&
    (typeof item.co2100g === 'number' || item.co2100g === null) &&
    (typeof item.image === 'string' || item.image === null) &&
    Array.isArray(item.allergens) && item.allergens.every((entry) => typeof entry === 'string') &&
    Array.isArray(item.additives) && item.additives.every((entry) => typeof entry === 'string')
  );
}

async function defaultGetJson(url: string): Promise<unknown> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({
      url,
      headers: DEFAULT_JSON_HEADERS,
      responseType: 'json',
    });
    if (response.status >= 400) throw new Error(`DHBW-Mensa-API antwortete mit HTTP ${response.status}`);
    return response.data;
  }

  const response = await fetch(url, { headers: DEFAULT_JSON_HEADERS });
  if (!response.ok) throw new Error(`DHBW-Mensa-API antwortete mit HTTP ${response.status}`);
  return response.json();
}
