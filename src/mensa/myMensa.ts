import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { DiningDay, DiningMeal } from './model';

const BASE_URL = 'https://zuf.my-mensa.de';
export const ZEPPELIN_MENU_URL = `${BASE_URL}/mensatogo.php?mensa=mensa_fallenbrunnen`;

export async function fetchMyMensaPlan(mensaId: string, facilityId: string): Promise<Record<string, DiningDay>> {
  const path = `/getdata.php?${new URLSearchParams({ mensa_id: mensaId, json: '1', hyp: '1', mode: 'togo', lang: 'de' })}`;
  let data: unknown;
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url: `${BASE_URL}${path}`, headers: { Accept: 'application/json' }, responseType: 'json' });
    if (response.status < 200 || response.status >= 300) throw new Error(`My-Mensa antwortete mit HTTP ${response.status}`);
    data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
  } else {
    const url = import.meta.env.DEV ? `/my-mensa${path}` : `${BASE_URL}${path}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`My-Mensa antwortete mit HTTP ${response.status}`);
    data = await response.json();
  }
  return parseMyMensaPlan(data, facilityId);
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function text(value: unknown): string {
  if (typeof value !== 'string') return '';
  const element = document.createElement('div');
  element.innerHTML = value;
  return (element.textContent ?? '').replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();
}

function price(value: unknown): number | undefined {
  if (typeof value !== 'number' && typeof value !== 'string') return undefined;
  const normalized = String(value).trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return undefined;
  const result = Number(normalized);
  return Number.isFinite(result) && result >= 0 ? result : undefined;
}

/** Normalize the source's DHBW price, never the cheaper "intern" price. */
export function parseMyMensaPlan(data: unknown, facilityId: string): Record<string, DiningDay> {
  if (!record(data) || (data.result !== false && !Array.isArray(data.result))) throw new Error('My-Mensa: Speiseplandaten fehlen.');
  const days: Record<string, DiningDay> = {};
  for (const day of data.result || []) {
    if (!record(day) || !record(day.tag) || typeof day.tag.datum_iso !== 'string') continue;
    const date = day.tag.datum_iso;
    const parsedDate = new Date(`${date}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== date) continue;
    if (!Array.isArray(day.essen)) continue;
    const meals: DiningMeal[] = [];
    for (const [index, item] of day.essen.entries()) {
      if (!record(item)) continue;
      const title = text(item.title_clean || item.title);
      if (!title) continue;
      const description = text(item.description_clean || item.description);
      const fullTitle = description && !/^(Bei Fragen|ohne vorbestellen)/i.test(description) ? `${title} · ${description}` : title;
      const category = text(item.category) || 'Angebot';
      const icons = record(item.icons2) ? Object.entries(item.icons2).filter((entry): entry is [string, Record<string, unknown>] => record(entry[1])) : [];
      const dietaryKeys = new Set(['VEG', 'V', 'G', 'S', 'R', 'F']);
      const dietaryLabels = icons.filter(([key]) => dietaryKeys.has(key)).map(([, icon]) => text(icon.text)).filter(Boolean);
      const allergens = icons.filter(([key]) => !dietaryKeys.has(key)).map(([, icon]) => text(icon.text)).filter(Boolean);
      // Source labels explicitly identify these groups. Unlabelled or changed roles are omitted.
      const dhbwPrice = /^DHBW\s*:/i.test(text(item.preis2_eur_label)) ? price(item.preis2) : undefined;
      const guestPrice = /^extern\s*:/i.test(text(item.preis3_eur_label)) ? price(item.preis3) : undefined;
      meals.push({
        id: `${facilityId}-${date}-${typeof item.a_id === 'string' ? item.a_id : index}`,
        facilityId, title: fullTitle, category, sourceCategory: 'official',
        prices: { ...(dhbwPrice !== undefined ? { student: dhbwPrice } : {}), ...(guestPrice !== undefined ? { guest: guestPrice } : {}) },
        priceUnit: /(?:pro|je)\s*100\s*g/i.test(`${title} ${text(item.einheit)}`) ? 'per-100g' : 'portion',
        dietaryLabels: [...new Set(dietaryLabels)], allergens: [...new Set(allergens)], additives: [],
      });
    }
    days[date] = { date, status: meals.length ? 'open' : 'unpublished', meals };
  }
  return days;
}
