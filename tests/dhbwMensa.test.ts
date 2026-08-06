import { describe, expect, it } from 'vitest';
import {
  DhbwMensaClient,
  mapDhbwMensaMenu,
  mapDhbwMensaResponse,
  type DhbwMensaResponse,
} from '../src/dhbwApi/mensa';

const INFO = {
  id: 11,
  site: 'RV',
  name: 'Mensa Ravensburg',
  sitePriority: null,
  active: true,
  address: 'Marienplatz 2',
  openingHours: '11:30 – 13:30 Uhr',
  infoUrl: 'https://example.test/info',
  menuUrl: 'https://example.test/menu',
  supportsUtilization: false,
};

const meal = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: 'Gebratene Nudeln',
  site: 'RV',
  type: 'main',
  priceStudent: 2.4,
  priceEmployee: 3.6,
  priceGuest: 4.9,
  co2Portion: null,
  co2100g: null,
  image: null,
  allergens: [],
  additives: [],
  ...overrides,
});

const response = (overrides: Partial<DhbwMensaResponse> = {}): DhbwMensaResponse => ({
  lastUpdate: '2026-08-06T17:10:08.384Z',
  mensaInfo: INFO,
  menus: [
    {
      id: 100,
      site: 'RV',
      // 22:00 UTC is the next calendar day in Europe/Berlin during summer.
      date: '2026-08-05T22:00:00.000Z',
      closed: false,
      starters: [meal({ id: 2, name: 'Tomatensuppe', type: 'starter' })],
      mainCourses: [meal({ id: 1, priceStudent: 2.4 })],
      sideOrders: [meal({ id: 3, name: 'Salat', type: 'side', priceStudent: null })],
      desserts: [meal({ id: 4, name: 'Obst', type: 'dessert', diet: ['Vegan', 'Vegan'] })],
    },
  ],
  ...overrides,
});

describe('DHBW Mensa API adapter', () => {
  it('maps all API categories to the existing MensaMeal model', () => {
    const plan = mapDhbwMensaResponse(response());

    expect(plan['2026-08-06']).toEqual([
      { category: 'Vorspeise', title: 'Tomatensuppe', price: '2,40 €', diet: [] },
      { category: 'Hauptgericht', title: 'Gebratene Nudeln', price: '2,40 €', diet: [] },
      { category: 'Beilage', title: 'Salat', diet: [] },
      { category: 'Dessert', title: 'Obst', price: '2,40 €', diet: ['Vegan'] },
    ]);
  });

  it('keeps closed days and skips invalid dates', () => {
    const mapped = mapDhbwMensaMenu({
      id: 101,
      site: 'FN',
      date: '2026-08-06T22:00:00.000Z',
      closed: true,
      starters: [],
      mainCourses: [],
      sideOrders: [],
      desserts: [],
    });
    expect(mapped).toEqual({ date: '2026-08-07', meals: [] });
    expect(mapDhbwMensaMenu({ ...response().menus[0], date: 'invalid' })).toBeNull();
  });

  it('merges multiple API mensa entries for one site', () => {
    const second = response({
      mensaInfo: { ...INFO, id: 12, name: 'Cafeteria Ravensburg' },
      menus: [{ ...response().menus[0], id: 200, date: '2026-08-07T22:00:00.000Z' }],
    });
    const plan = mapDhbwMensaResponse([response(), second]);
    expect(Object.keys(plan).sort()).toEqual(['2026-08-06', '2026-08-08']);
  });

  it('loads an arbitrary site through an injectable transport', async () => {
    const requested: string[] = [];
    const client = new DhbwMensaClient({
      baseUrl: 'https://api.example.test',
      getJson: async (url) => {
        requested.push(url);
        return response({ mensaInfo: { ...INFO, site: 'stg' } });
      },
    });

    const plan = await client.fetchPlan(' stg ');
    expect(requested).toEqual(['https://api.example.test/mensa/STG']);
    expect(plan['2026-08-06']).toHaveLength(4);
  });

  it('rejects malformed API payloads before mapping', async () => {
    const client = new DhbwMensaClient({ getJson: async () => ({ menus: [] }) });
    await expect(client.fetchPlan('RV')).rejects.toThrow('unbekanntes Format');
  });
});
