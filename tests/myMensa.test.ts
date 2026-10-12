import { beforeEach, describe, expect, it, vi } from 'vitest';
import fixture from './fixtures/myMensa.json';
import { parseMyMensaPlan } from '../src/mensa/myMensa';
import { loadDiningSnapshot } from '../src/mensa/loadDining';
import { diningProfileForSite } from '../src/mensa/sites';
import { DhbwMensaClient } from '../src/dhbwApi/mensa';

const sources = vi.hoisted(() => ({ seezeit: vi.fn(), zeppelin: vi.fn() }));
vi.mock('../src/seezeit/client', () => ({ fetchMensaPlan: sources.seezeit }));
vi.mock('../src/mensa/myMensa', async importOriginal => ({
  ...await importOriginal<typeof import('../src/mensa/myMensa')>(), fetchMyMensaPlan: sources.zeppelin,
}));

const parse = (data: unknown) => parseMyMensaPlan(data, 'fn-zeppelin');
describe('My-Mensa Zeppelin', () => {
  it('ordnet den veröffentlichten Plan den vier Tagen und DHBW-Preisen zu', () => {
    const days = parse(fixture);
    expect(Object.keys(days)).toEqual(['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15']);
    const monday = days['2026-10-12'];
    expect(monday.meals).toHaveLength(4);
    expect(monday.meals[1]).toMatchObject({
      title: 'Schwäbische Linsen | Saitenwurst · Eierknöpfle',
      prices: { student: 7.5, guest: 11 }, dietaryLabels: ['Schwein'], allergens: ['Glutenhaltiges Getreide'],
    });
    expect(monday.meals[0]).toMatchObject({ prices: { student: 1.5 }, priceUnit: 'per-100g' });
    expect(monday.meals[2]).toMatchObject({ prices: { student: 6.9 }, dietaryLabels: ['vegan'] });
    expect(days['2026-10-16']).toBeUndefined();
  });
  it('behandelt einen leeren Plan als unveröffentlicht und verwirft ungültige Tage', () => {
    expect(parse({ result: false })).toEqual({});
    expect(parse({ result: [{ tag: { datum_iso: '2026-99-12' }, essen: [] }, { tag: { datum_iso: '2026-02-30' }, essen: [] }] })).toEqual({});
    expect(() => parse({ error: 'unavailable' })).toThrow();
  });
  it('rät keine Preise bei fehlenden Beträgen oder veränderter Preisrolle', () => {
    const data = structuredClone(fixture);
    data.result[0].essen[1].preis2_eur_label = 'intern: 7,50 €';
    data.result[0].essen[2].preis2 = '';
    const meals = parse(data)['2026-10-12'].meals;
    expect(meals[1].prices.student).toBeUndefined();
    expect(meals[2].prices.student).toBeUndefined();
  });
});

describe('unabhängige Speisepläne in Friedrichshafen', () => {
  const client = () => new DhbwMensaClient({ getJson: async () => { throw new Error('API offline'); } });
  beforeEach(() => {
    sources.seezeit.mockReset().mockResolvedValue({ '2026-10-12': [{ title: 'Seezeit Gericht', category: 'Teller', diet: [], price: '4,40 €' }] });
    sources.zeppelin.mockReset().mockResolvedValue(parse(fixture));
  });
  it('lädt Seezeit und Zeppelin separat mit passenden Einrichtungen', async () => {
    const snapshot = await loadDiningSnapshot(diningProfileForSite('FN'), client());
    expect(snapshot.facilities.map(f => f.id)).toEqual(['fn-fallenbrunnen', 'fn-zeppelin']);
    expect(snapshot.facilities[0].days['2026-10-12'].meals[0].title).toBe('Seezeit Gericht');
    expect(snapshot.facilities[1].days['2026-10-12'].meals).toHaveLength(4);
    expect(sources.zeppelin).toHaveBeenCalledWith('mensa_fallenbrunnen', 'fn-zeppelin');
  });
  it('zeigt Seezeit bei Ausfall von Zeppelin weiterhin an', async () => {
    sources.zeppelin.mockRejectedValue(new Error('ZU offline'));
    const snapshot = await loadDiningSnapshot(diningProfileForSite('FN'), client());
    expect(snapshot.facilities[0].loadError).toBeUndefined();
    expect(snapshot.facilities[0].days['2026-10-12'].meals).toHaveLength(1);
    expect(snapshot.facilities[1].loadError).toBeTruthy();
  });
  it('zeigt Zeppelin bei Ausfall von Seezeit weiterhin an', async () => {
    sources.seezeit.mockRejectedValue(new Error('Seezeit offline'));
    const snapshot = await loadDiningSnapshot(diningProfileForSite('FN'), client());
    expect(snapshot.facilities[0].loadError).toBeTruthy();
    expect(snapshot.facilities[1].loadError).toBeUndefined();
    expect(snapshot.facilities[1].days['2026-10-12'].meals).toHaveLength(4);
  });
  it('meldet einen Gesamtausfall an die bestehende Cache-Rückfallebene', async () => {
    sources.seezeit.mockRejectedValue(new Error('Seezeit offline'));
    sources.zeppelin.mockRejectedValue(new Error('ZU offline'));
    await expect(loadDiningSnapshot(diningProfileForSite('FN'), client())).rejects.toThrow('API offline');
  });
});
