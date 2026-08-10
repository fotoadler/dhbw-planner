/** Parser fuer den eingebetteten, strukturierten Speiseplan des Studierendenwerks Heidelberg. */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import type { DiningDay, DiningMeal } from './model';

const SOURCE_URL = 'https://www.stw.uni-heidelberg.de/essen-trinken/speiseplan/';

interface HeidelbergDish {
  text?: unknown;
  text_en?: unknown;
  studi?: unknown;
  bed?: unknown;
  gast?: unknown;
  prodart?: unknown;
}
interface HeidelbergLine {
  ausgabe?: unknown;
  gerichte?: unknown;
}

interface HeidelbergDay {
  geschlossen?: unknown;
  linien?: unknown;
}

export async function fetchStwHeidelbergPlan(venue: string, facilityId: string): Promise<Record<string, DiningDay>> {
  const html = await fetchHtml();
  return parseStwHeidelbergPlan(html, venue, facilityId);
}

export function parseStwHeidelbergPlan(
  html: string,
  venue: string,
  facilityId: string,
): Record<string, DiningDay> {
  const match = html.match(/window\.mensaData\s*=\s*(\{[\s\S]*?\});\s*(?:\r?\n|<\/script>)/);
  if (!match) throw new Error('Studierendenwerk Heidelberg: Speiseplandaten fehlen.');
  const root = JSON.parse(match[1]) as Record<string, unknown>;
  const venueData = root[venue];
  if (!venueData || typeof venueData !== 'object' || Array.isArray(venueData)) {
    throw new Error(`Studierendenwerk Heidelberg: Einrichtung „${venue}“ fehlt.`);
  }

  const plan: Record<string, DiningDay> = {};
  for (const [germanDate, value] of Object.entries(venueData as Record<string, unknown>)) {
    const date = parseGermanDate(germanDate);
    if (!date || !value || typeof value !== 'object' || Array.isArray(value)) continue;
    const day = value as HeidelbergDay;
    const meals = mapLines(day.linien, facilityId, date);
    plan[date] = {
      date,
      status: day.geschlossen === true ? 'closed' : meals.length > 0 ? 'open' : 'unpublished',
      meals,
    };
  }
  return plan;
}

function mapLines(value: unknown, facilityId: string, date: string): DiningMeal[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry, lineIndex) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const line = entry as HeidelbergLine;
    const category = typeof line.ausgabe === 'string' ? line.ausgabe.trim() : 'Tagesangebot';
    if (!Array.isArray(line.gerichte)) return [];
    return line.gerichte.flatMap((dishValue, dishIndex) => {
      if (!dishValue || typeof dishValue !== 'object' || Array.isArray(dishValue)) return [];
      const dish = dishValue as HeidelbergDish;
      const title = typeof dish.text === 'string' ? dish.text.trim() : '';
      if (!title) return [];
      const productType = typeof dish.prodart === 'string' ? dish.prodart : '';
      return [{
        id: `${facilityId}-${date}-${lineIndex}-${dishIndex}`,
        facilityId,
        title,
        ...(typeof dish.text_en === 'string' && dish.text_en.trim() ? { englishTitle: dish.text_en.trim() } : {}),
        category,
        sourceCategory: 'official' as const,
        prices: {
          ...(parsePrice(dish.studi) !== undefined ? { student: parsePrice(dish.studi) } : {}),
          ...(parsePrice(dish.bed) !== undefined ? { employee: parsePrice(dish.bed) } : {}),
          ...(parsePrice(dish.gast) !== undefined ? { guest: parsePrice(dish.gast) } : {}),
        },
        priceUnit: productType === '230' ? 'per-100g' as const : 'portion' as const,
        dietaryLabels: dietaryLabels(category),
        allergens: [],
        additives: [],
      }];
    });
  });
}

function dietaryLabels(category: string): string[] {
  if (/vegan/i.test(category)) return ['Vegan'];
  if (/vegetar/i.test(category)) return ['Vegetarisch'];
  return [];
}

function parseGermanDate(value: string): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const parsed = Number(String(value).replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function fetchHtml(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const response = await CapacitorHttp.get({ url: SOURCE_URL, headers: { Accept: 'text/html' }, responseType: 'text' });
    if (response.status >= 400) throw new Error(`Studierendenwerk Heidelberg antwortete mit HTTP ${response.status}`);
    return typeof response.data === 'string' ? response.data : String(response.data);
  }
  const response = await fetch('/stw-heidelberg/essen-trinken/speiseplan/', { headers: { Accept: 'text/html' } });
  if (!response.ok) throw new Error(`Studierendenwerk Heidelberg antwortete mit HTTP ${response.status}`);
  return response.text();
}
