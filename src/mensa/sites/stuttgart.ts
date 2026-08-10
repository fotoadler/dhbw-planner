import { defineDiningSite } from './types';

export const stuttgartDining = defineDiningSite({
  site: 'STG',
  label: 'Stuttgart',
  operator: 'Studierendenwerk Stuttgart',
  presentation: 'single-facility',
  source: { kind: 'dhbw-api' },
  officialInfoUrl: 'https://www.studierendenwerk-stuttgart.de/essen/mensen-und-cafeterien/mensa-central',
  facilities: [{
    id: 'stg-central',
    apiId: 8,
    name: 'Mensa Central',
    address: 'Ossietzkystraße 3, 70174 Stuttgart',
    mealHours: 'Essensausgabe 11:15–14:15',
    menuUrl: 'https://www.studierendenwerk-stuttgart.de/essen/speiseplan',
  }],
  deduplicate: true,
  markerPolicy: 'mixed-additives',
});
