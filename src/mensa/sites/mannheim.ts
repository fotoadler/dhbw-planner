import { defineDiningSite } from './types';

export const mannheimDining = defineDiningSite({
  site: 'MA',
  label: 'Mannheim',
  operator: 'Studierendenwerk Mannheim',
  presentation: 'facility-tabs',
  source: { kind: 'dhbw-api' },
  officialInfoUrl: 'https://www.stw-ma.de/essen-trinken/mensen-cafeterien/',
  facilities: [
    {
      id: 'ma-metropol', apiId: 5, name: 'Mensaria Metropol + greenes²', shortName: 'Coblitzallee',
      address: 'Hans-Thoma-Straße 51, 68163 Mannheim', openingHours: 'Mo–Fr 07:30–15:30',
      menuUrl: 'https://www.stw-ma.de/essen-trinken/speiseplaene/mensaria-metropol-greenes/',
    },
    {
      id: 'ma-wohlgelegen', apiId: 6, name: 'Mensaria Wohlgelegen', shortName: 'Wohlgelegen',
      address: 'Käfertaler Straße 258, 68167 Mannheim',
      menuUrl: 'https://www.stw-ma.de/essen-trinken/speiseplaene/mensaria-wohlgelegen/',
    },
    {
      id: 'ma-eppelheim', apiId: 7, name: 'Speisenausgabe DHBW Eppelheim', shortName: 'Eppelheim',
      address: 'Handelsstraße 13, 69214 Eppelheim', mealHours: 'Essensausgabe 11:30–14:00',
      menuUrl: 'https://www.stw-ma.de/essen-trinken/speiseplaene/speisenausgabe-eppelheim/',
      notice: 'Im Sommer 2026 geschlossen (KW 25–37).',
    },
  ],
  categoryLabels: { main: 'Menü', side: 'Weiteres Angebot', dessert: 'Dessert' },
  deduplicate: true,
  markerPolicy: 'hidden',
});
