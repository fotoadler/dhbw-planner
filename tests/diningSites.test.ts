import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DhbwMensaClient, type DhbwMensaMeal, type DhbwMensaResponse } from '../src/dhbwApi/mensa';
import { loadDiningSnapshot, mapApiDiningResponse } from '../src/mensa/loadDining';
import { DINING_SITE_PROFILES, diningProfileForSite } from '../src/mensa/sites';
import { parseStwHeidelbergPlan } from '../src/mensa/stwHeidelberg';
import { MensaSection } from '../src/ui/MensaSection';

const meal = (id: number, name: string, overrides: Partial<DhbwMensaMeal> = {}): DhbwMensaMeal => ({
  id,
  name,
  site: 'TEST',
  type: 'main',
  priceStudent: 2.99,
  priceEmployee: 5.99,
  priceGuest: 6.49,
  co2Portion: null,
  co2100g: null,
  image: null,
  allergens: [],
  additives: [],
  ...overrides,
});

function response(
  facilityId: number,
  site: string,
  name: string,
  menuOverrides: Partial<DhbwMensaResponse['menus'][number]> = {},
): DhbwMensaResponse {
  return {
    lastUpdate: '2026-08-10T13:30:00.000Z',
    mensaInfo: {
      id: facilityId,
      site,
      name,
      sitePriority: null,
      active: true,
      address: 'API-Adresse',
      openingHours: '11:30–14:00',
      infoUrl: 'https://example.test/info',
      menuUrl: 'https://example.test/menu',
      supportsUtilization: false,
    },
    menus: [{
      id: facilityId * 100,
      site,
      date: '2026-08-09T22:00:00.000Z',
      closed: false,
      starters: [],
      mainCourses: [meal(1, `${name} Gericht`)],
      sideOrders: [],
      desserts: [],
      ...menuOverrides,
    }],
  };
}

describe('standortseparierte Mensa-Profile', () => {
  it('registriert jeden DHBW-Standort genau einmal', () => {
    expect(Object.keys(DINING_SITE_PROFILES).sort()).toEqual([
      'CAS', 'FN', 'HDH', 'HN', 'HORB', 'KA', 'LÖR', 'MA', 'MGH', 'MOS', 'RV', 'STG', 'VS',
    ]);
  });

  it('modelliert Bad Mergentheim ohne leeren API-Abruf als neun Partner', async () => {
    const getJson = vi.fn(async () => { throw new Error('darf nicht aufgerufen werden'); });
    const snapshot = await loadDiningSnapshot(
      diningProfileForSite('MGH'),
      new DhbwMensaClient({ getJson }),
    );
    expect(getJson).not.toHaveBeenCalled();
    expect(snapshot.presentation).toBe('partner-list');
    expect(snapshot.partners).toHaveLength(9);
    expect(snapshot.voucher).toMatchObject({ price: 2.7, value: 5.4 });
    expect(snapshot.partners.every((partner) => partner.menuUrl === undefined)).toBe(true);
  });

  it('erkennt den Karlsruher Schließtext als Status statt als Beilage', () => {
    const api = response(12, 'KA', 'Mensa Erzbergerstraße', {
      mainCourses: [],
      sideOrders: [meal(2, 'Vom 17.08. - 11.09.2026 GESCHLOSSEN')],
    });
    const snapshot = mapApiDiningResponse(diningProfileForSite('KA'), [api]);
    expect(snapshot.facilities[0].days['2026-08-10']).toMatchObject({ status: 'closed', meals: [] });
  });

  it('hält Mannheimer Einrichtungen und Gerichte getrennt', () => {
    const snapshot = mapApiDiningResponse(diningProfileForSite('MA'), [
      response(5, 'MA', 'Mensaria Metropol'),
      response(6, 'MA', 'Mensaria Wohlgelegen'),
      response(7, 'MA', 'Speisenausgabe Eppelheim', { mainCourses: [] }),
    ]);
    expect(snapshot.facilities.map((facility) => facility.id)).toEqual(['ma-metropol', 'ma-wohlgelegen', 'ma-eppelheim']);
    expect(snapshot.facilities[0].days['2026-08-10'].meals[0].facilityId).toBe('ma-metropol');
    expect(snapshot.facilities[1].days['2026-08-10'].meals[0].facilityId).toBe('ma-wohlgelegen');
  });

  it('dedupliziert Stuttgart lokal, ohne die globale Abbildung zu verändern', () => {
    const duplicate = meal(2, 'Pommes frites', { priceStudent: 1.2 });
    const api = response(8, 'STG', 'Mensa Central', { sideOrders: [duplicate, { ...duplicate, id: 3 }] });
    const day = mapApiDiningResponse(diningProfileForSite('STG'), [api]).facilities[0].days['2026-08-10'];
    expect(day.meals.filter((item) => item.title === 'Pommes frites')).toHaveLength(1);
  });

  it('behandelt Horber Marker und Preisrollen standortspezifisch', () => {
    const api = response(9, 'HORB', 'Mensa Horb', {
      mainCourses: [meal(3, 'Mittagessen', { additives: ['Ei', 'La', 'GlW'] })],
    });
    const item = mapApiDiningResponse(diningProfileForSite('HORB'), [api]).facilities[0].days['2026-08-10'].meals[0];
    expect(item.category).toBe('Mittagsangebot');
    expect(item.allergens).toEqual(['Ei', 'La', 'GlW']);
    expect(item.prices).toEqual({ student: 2.99 });
  });

  it('akzeptiert den erwarteten CAS-zu-HN-Alias und behält den CAS-Kontext', () => {
    const snapshot = mapApiDiningResponse(diningProfileForSite('CAS'), [response(4, 'HN', 'Mensa am Bildungscampus')]);
    expect(snapshot.site).toBe('CAS');
    expect(snapshot.facilities[0].sourceId).toBe(4);
    expect(snapshot.facilities[0].days['2026-08-10'].meals[0].category).toBe('Tagesangebot');
  });

  it('kodiert den Umlaut im Lörracher API-Pfad', async () => {
    const urls: string[] = [];
    const client = new DhbwMensaClient({
      baseUrl: 'https://example.test',
      getJson: async (url) => {
        urls.push(url);
        return response(3, 'LÖR', 'Mensa Lörrach');
      },
    });
    await client.fetchResponse('LÖR');
    expect(urls).toEqual(['https://example.test/mensa/L%C3%96R']);
  });
});

describe('kompakte Mensa-Darstellung', () => {
  it('zeigt Ravensburg ohne redundanten Standortkopf, Adresse und externen Speiseplan', () => {
    const profile = diningProfileForSite('RV');
    const snapshot = mapApiDiningResponse(profile, [response(11, 'RV', 'Mensa Ravensburg')]);
    const html = renderToStaticMarkup(createElement(MensaSection, {
      profile,
      snapshot,
      status: 'ready',
      error: null,
      selectedDay: '2026-08-10',
    }));

    expect(html).toContain('Mensa Ravensburg');
    expect(html).toContain('Mensa Ravensburg Gericht');
    expect(html).toContain('Mittagessen 11:30–13:30');
    expect(html).not.toContain('Essen in Ravensburg');
    expect(html).not.toContain('Seezeit Studierendenwerk Bodensee');
    expect(html).not.toContain('Marienplatz 2');
    expect(html).not.toContain('mensa-ravensburg/');
  });

  it('zeigt Bad Mergentheim als Partnerverzeichnis ohne leere PDF-Aktionen', async () => {
    const profile = diningProfileForSite('MGH');
    const snapshot = await loadDiningSnapshot(profile);
    const html = renderToStaticMarkup(createElement(MensaSection, {
      profile,
      snapshot,
      status: 'ready',
      error: null,
      selectedDay: '2026-08-10',
    }));

    expect(html).toContain('Partnerrestaurants');
    expect(html).toContain('Essensmarke: 2,70');
    expect(html).toContain('Kidano Restaurant');
    expect(html).not.toContain('sp-mgh-');
  });

  it('bietet offizielle Infos nur als Fallback bei einem Abruffehler an', () => {
    const profile = diningProfileForSite('RV');
    const html = renderToStaticMarkup(createElement(MensaSection, {
      profile,
      snapshot: null,
      status: 'error',
      error: 'Netzwerkfehler',
      selectedDay: '2026-08-10',
    }));

    expect(html).toContain('Speiseplan nicht erreichbar');
    expect(html).toContain('Offizielle Infos');
    expect(html).toContain(profile.officialInfoUrl);
  });
});

describe('Studierendenwerk-Heidelberg-Adapter', () => {
  it('erhält Ausgaben, Schließstatus, Kennzeichnung und Gewichtspreise', () => {
    const html = `<script>window.mensaData = ${JSON.stringify({
      'Mensa Bildungscampus Heilbronn': {
        '10.08.2026': { tag: 'Montag', geschlossen: true },
        '11.08.2026': {
          tag: 'Dienstag',
          geschlossen: false,
          linien: [{
            ausgabe: 'Vegan',
            gerichte: [{ text: 'Mie Nudeln', text_en: 'Mie noodles', studi: '0.99', bed: '1.35', gast: '2.00', prodart: '230' }],
          }],
        },
      },
    })};\n</script>`;
    const plan = parseStwHeidelbergPlan(html, 'Mensa Bildungscampus Heilbronn', 'hn-bildungscampus');
    expect(plan['2026-08-10']).toMatchObject({ status: 'closed', meals: [] });
    expect(plan['2026-08-11'].meals[0]).toMatchObject({
      category: 'Vegan',
      dietaryLabels: ['Vegan'],
      priceUnit: 'per-100g',
      prices: { student: 0.99, employee: 1.35, guest: 2 },
    });
  });
});
