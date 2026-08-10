import {
  DhbwMensaClient,
  type DhbwMensaMeal,
  type DhbwMensaMenu,
  type DhbwMensaResponse,
} from '../dhbwApi/mensa';
import { berlinDayKey } from '../lib/berlinTime';
import { fetchMensaPlan } from '../seezeit/client';
import type { MensaMeal as SeezeitMeal } from '../seezeit/types';
import type {
  DiningApiBucket,
  DiningDay,
  DiningFacility,
  DiningMeal,
  DiningSnapshot,
} from './model';
import type { DiningFacilityProfile, DiningSiteProfile } from './sites/types';
import { fetchStwHeidelbergPlan } from './stwHeidelberg';

const DEFAULT_CATEGORIES: Record<DiningApiBucket, string> = {
  starter: 'Vorspeise',
  main: 'Hauptgericht',
  side: 'Beilage',
  dessert: 'Dessert',
};

interface ApiMealWithBucket {
  meal: DhbwMensaMeal;
  bucket: DiningApiBucket;
}

export async function loadDiningSnapshot(
  profile: DiningSiteProfile,
  client = new DhbwMensaClient(),
): Promise<DiningSnapshot> {
  if (profile.source.kind === 'partners') return emptySnapshot(profile);

  const apiSite = profile.source.kind === 'seezeit' || profile.source.kind === 'stw-heidelberg'
    ? profile.source.apiSite
    : profile.source.apiSite ?? profile.site;
  let apiResponses: DhbwMensaResponse[] = [];
  let apiFailure: unknown;
  try {
    apiResponses = await client.fetchResponse(apiSite);
  } catch (cause) {
    if (profile.source.kind === 'dhbw-api') throw cause;
    apiFailure = cause;
  }
  const snapshot = mapApiDiningResponse(profile, apiResponses);

  if (profile.source.kind === 'stw-heidelberg') {
    const facility = snapshot.facilities[0];
    if (!facility) return snapshot;
    try {
      const apiDays = facility.days;
      const officialDays = await fetchStwHeidelbergPlan(profile.source.venue, facility.id);
      for (const day of Object.values(officialDays)) {
        day.meals = day.meals.map((meal) => mergeApiMedia(meal, apiDays[day.date]?.meals ?? []));
      }
      facility.days = officialDays;
    } catch {
      if (apiResponses.length === 0) throw apiFailure ?? new Error('Speiseplan konnte nicht geladen werden.');
      // Neutrale DHBW-API-Daten bleiben als Fallback erhalten.
    }
    return snapshot;
  }

  if (profile.source.kind !== 'seezeit') return snapshot;

  try {
    const officialPlan = await fetchMensaPlan(profile.source.legacyMensa);
    const facility = snapshot.facilities[0];
    if (!facility) return snapshot;
    for (const [date, meals] of Object.entries(officialPlan)) {
      facility.days[date] = {
        date,
        status: 'open',
        meals: meals.map((meal, index) => mapSeezeitMeal(facility.id, date, meal, index)),
      };
    }
  } catch (cause) {
    if (apiResponses.length === 0) throw apiFailure ?? cause;
    // Die API-Daten bleiben als expliziter Fallback sichtbar. Standortprofile
    // koennen ihre Kategorien dabei neutraler benennen als die Quell-Buckets.
  }
  return snapshot;
}

function mergeApiMedia(official: DiningMeal, apiMeals: DiningMeal[]): DiningMeal {
  const normalized = official.title.trim().toLocaleLowerCase('de-DE');
  const api = apiMeals.find((meal) => meal.title.trim().toLocaleLowerCase('de-DE') === normalized);
  if (!api) return official;
  return {
    ...official,
    ...(api.imageUrl ? { imageUrl: api.imageUrl } : {}),
    ...(api.co2Grams !== undefined ? { co2Grams: api.co2Grams } : {}),
  };
}

export function mapApiDiningResponse(
  profile: DiningSiteProfile,
  responses: DhbwMensaResponse[],
): DiningSnapshot {
  const claimed = new Set<number>();
  const facilities = profile.facilities.map((facilityProfile, index) => {
    const response = findResponse(facilityProfile, responses, claimed, profile.facilities.length === 1 && index === 0);
    if (response) claimed.add(response.mensaInfo.id);
    return mapFacility(profile, facilityProfile, response);
  });

  for (const response of responses) {
    if (claimed.has(response.mensaInfo.id)) continue;
    facilities.push(mapFacility(profile, {
      id: `${profile.site.toLowerCase()}-${response.mensaInfo.id}`,
      apiId: response.mensaInfo.id,
      name: response.mensaInfo.name,
    }, response));
  }

  return {
    site: profile.site,
    label: profile.label,
    operator: profile.operator,
    presentation: profile.presentation,
    ...(profile.intro ? { intro: profile.intro } : {}),
    ...(profile.officialInfoUrl ? { officialInfoUrl: profile.officialInfoUrl } : {}),
    facilities,
    partners: profile.partners ?? [],
    ...(profile.voucher ? { voucher: profile.voucher } : {}),
    fetchedAt: Date.now(),
  };
}

function emptySnapshot(profile: DiningSiteProfile): DiningSnapshot {
  return {
    site: profile.site,
    label: profile.label,
    operator: profile.operator,
    presentation: profile.presentation,
    ...(profile.intro ? { intro: profile.intro } : {}),
    ...(profile.officialInfoUrl ? { officialInfoUrl: profile.officialInfoUrl } : {}),
    facilities: profile.facilities.map((facility) => mapFacility(profile, facility)),
    partners: profile.partners ?? [],
    ...(profile.voucher ? { voucher: profile.voucher } : {}),
    fetchedAt: Date.now(),
  };
}

function findResponse(
  facility: DiningFacilityProfile,
  responses: DhbwMensaResponse[],
  claimed: Set<number>,
  allowSingleFallback: boolean,
): DhbwMensaResponse | undefined {
  if (facility.apiId !== undefined) return responses.find((response) => response.mensaInfo.id === facility.apiId);
  if (allowSingleFallback && responses.length === 1) return responses[0];
  return responses.find((response) => !claimed.has(response.mensaInfo.id) && response.mensaInfo.name === facility.name);
}

function mapFacility(
  profile: DiningSiteProfile,
  facility: DiningFacilityProfile,
  response?: DhbwMensaResponse,
): DiningFacility {
  const info = response?.mensaInfo;
  const days: Record<string, DiningDay> = {};
  for (const menu of response?.menus ?? []) {
    const day = mapMenu(profile, facility.id, menu);
    if (day) days[day.date] = day;
  }

  return {
    id: facility.id,
    ...(info ? { sourceId: info.id } : {}),
    kind: facility.kind ?? 'warm-meals',
    name: facility.name || info?.name || profile.label,
    ...(facility.shortName ? { shortName: facility.shortName } : {}),
    ...((facility.address || info?.address) ? { address: facility.address || info?.address } : {}),
    ...((facility.openingHours || info?.openingHours) ? { openingHours: facility.openingHours || info?.openingHours } : {}),
    ...(facility.mealHours ? { mealHours: facility.mealHours } : {}),
    ...((facility.infoUrl || info?.infoUrl) ? { infoUrl: facility.infoUrl || info?.infoUrl || undefined } : {}),
    ...((facility.menuUrl || info?.menuUrl) ? { menuUrl: facility.menuUrl || info?.menuUrl || undefined } : {}),
    ...(facility.orderUrl ? { orderUrl: facility.orderUrl } : {}),
    ...(facility.notice ? { notice: facility.notice } : {}),
    active: info?.active ?? true,
    supportsUtilization: info?.supportsUtilization ?? false,
    ...(response?.lastUpdate ? { sourceUpdatedAt: response.lastUpdate } : {}),
    specialPeriods: facility.specialPeriods ?? [],
    days,
  };
}

function mapMenu(profile: DiningSiteProfile, facilityId: string, menu: DhbwMensaMenu): DiningDay | null {
  const parsed = new Date(menu.date);
  if (!Number.isFinite(parsed.getTime())) return null;
  const date = berlinDayKey(parsed);
  const rawMeals: ApiMealWithBucket[] = [
    ...menu.starters.map((meal) => ({ meal, bucket: 'starter' as const })),
    ...menu.mainCourses.map((meal) => ({ meal, bucket: 'main' as const })),
    ...menu.sideOrders.map((meal) => ({ meal, bucket: 'side' as const })),
    ...menu.desserts.map((meal) => ({ meal, bucket: 'dessert' as const })),
  ];

  const closingMeal = rawMeals.find(({ meal }) => profile.closedMealPattern?.test(meal.name));
  const visible = closingMeal
    ? rawMeals.filter(({ meal }) => !profile.closedMealPattern?.test(meal.name))
    : rawMeals;
  let meals = visible.map(({ meal, bucket }) => mapApiMeal(profile, facilityId, meal, bucket));
  if (profile.deduplicate) meals = deduplicateMeals(meals);

  const hasMain = rawMeals.some(({ bucket }) => bucket === 'main');
  const status = menu.closed || closingMeal
    ? 'closed'
    : profile.partialWithoutMain && meals.length > 0 && !hasMain
      ? 'partial'
      : meals.length > 0
        ? 'open'
        : 'unpublished';

  return {
    date,
    status,
    ...(closingMeal ? { statusMessage: closingMeal.meal.name.trim() } : {}),
    meals,
  };
}

function mapApiMeal(
  profile: DiningSiteProfile,
  facilityId: string,
  meal: DhbwMensaMeal,
  bucket: DiningApiBucket,
): DiningMeal {
  const markers = readMarkers(profile, meal);
  const category = meal.category?.trim() || profile.categoryLabels?.[bucket] || DEFAULT_CATEGORIES[bucket];
  return {
    id: `${facilityId}-${meal.id}`,
    facilityId,
    title: meal.name.trim(),
    category,
    sourceCategory: bucket,
    prices: {
      ...(meal.priceStudent !== null ? { student: meal.priceStudent } : {}),
      ...(profile.pricePolicy === 'all' && meal.priceEmployee !== null ? { employee: meal.priceEmployee } : {}),
      ...(profile.pricePolicy === 'all' && meal.priceGuest !== null ? { guest: meal.priceGuest } : {}),
    },
    dietaryLabels: unique([...(meal.diet ?? []), ...(meal.labels ?? []), ...(meal.tags ?? [])]),
    allergens: markers.allergens,
    additives: markers.additives,
    ...(meal.image ? { imageUrl: meal.image } : {}),
    ...(typeof meal.co2Portion === 'number' && meal.co2Portion > 0 ? { co2Grams: meal.co2Portion } : {}),
  };
}

function mapSeezeitMeal(
  facilityId: string,
  date: string,
  meal: SeezeitMeal,
  index: number,
): DiningMeal {
  return {
    id: `${facilityId}-${date}-${index}`,
    facilityId,
    title: meal.title,
    category: meal.category || 'Angebot',
    sourceCategory: 'official',
    prices: { ...(parseGermanPrice(meal.price) !== undefined ? { student: parseGermanPrice(meal.price) } : {}) },
    dietaryLabels: meal.diet,
    allergens: [],
    additives: [],
  };
}

function readMarkers(profile: DiningSiteProfile, meal: DhbwMensaMeal): { allergens: string[]; additives: string[] } {
  switch (profile.markerPolicy ?? 'native') {
    case 'hidden':
      return { allergens: [], additives: [] };
    case 'swapped':
      return { allergens: unique(meal.additives), additives: unique(meal.allergens) };
    case 'mixed-additives': {
      const combined = unique([...meal.allergens, ...meal.additives]);
      return {
        allergens: combined.filter((code) => !/^\d+[a-z]?$/i.test(code)),
        additives: combined.filter((code) => /^\d+[a-z]?$/i.test(code)),
      };
    }
    case 'native':
      return { allergens: unique(meal.allergens), additives: unique(meal.additives) };
  }
}

function deduplicateMeals(meals: DiningMeal[]): DiningMeal[] {
  const seen = new Set<string>();
  return meals.filter((meal) => {
    const key = `${meal.category}\u0000${meal.title}\u0000${meal.prices.student ?? ''}`.toLocaleLowerCase('de-DE');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function parseGermanPrice(value: string | undefined): number | undefined {
  // Ohne Ziffernpruefung wuerde "kostenlos" als 0 durchgehen und als "0,00 €" erscheinen.
  if (!value || !/\d/.test(value)) return undefined;
  const parsed = Number(value.replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}
