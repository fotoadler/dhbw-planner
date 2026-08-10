import { defineDiningSite } from './types';

export const ravensburgDining = defineDiningSite({
  site: 'RV',
  label: 'Ravensburg',
  operator: 'Seezeit Studierendenwerk Bodensee',
  presentation: 'single-facility',
  source: { kind: 'seezeit', legacyMensa: 'ravensburg', apiSite: 'RV' },
  officialInfoUrl: 'https://seezeit.com/essen/mensa-cafeteria-co/mensa-ravensburg/',
  facilities: [{
    id: 'rv-mensa',
    apiId: 11,
    name: 'Mensa Ravensburg',
    address: 'Marienplatz 2, 88212 Ravensburg',
    openingHours: 'Mo–Do 08:00–15:00 · Fr 08:00–14:30',
    mealHours: 'Mittagessen 11:30–13:30',
    menuUrl: 'https://seezeit.com/essen/speiseplaene/mensa-ravensburg/',
  }],
  categoryLabels: { main: 'Angebot' },
});
