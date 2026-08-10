import { defineDiningSite } from './types';

export const karlsruheDining = defineDiningSite({
  site: 'KA',
  label: 'Karlsruhe',
  operator: 'Studierendenwerk Karlsruhe',
  presentation: 'single-facility',
  source: { kind: 'dhbw-api' },
  officialInfoUrl: 'https://www.sw-ka.de/de/hochschulgastronomie/mensa/mensa_cafeteria_erzbergerstrasse/',
  facilities: [{
    id: 'ka-erzberger',
    apiId: 12,
    name: 'Menseria Erzbergerstraße',
    shortName: 'Erzbergerstraße',
    address: 'Erzbergerstraße 121, 76133 Karlsruhe',
    openingHours: 'Mo–Do 07:45–15:30 · Fr 07:45–14:00',
    mealHours: 'Mittagessen 11:15–13:30',
    menuUrl: 'https://www.sw-ka.de/de/hochschulgastronomie/speiseplan/mensa_erzberger/',
    specialPeriods: [{ from: '2026-08-17', to: '2026-09-11', label: 'Geschlossen bis 11. September' }],
  }],
  categoryLabels: { main: 'Menü', side: 'Extra', dessert: 'Dessert' },
  markerPolicy: 'mixed-additives',
  closedMealPattern: /\bgeschlossen\b/i,
  partners: [
    { id: 'ka-adenauerring', name: 'Mensa am Adenauerring', description: 'Alternative des Studierendenwerks Karlsruhe', infoUrl: 'https://www.sw-ka.de/de/hochschulgastronomie/mensa/mensa_adenauerring/' },
    { id: 'ka-moltke', name: 'Mensa Moltke', description: 'Alternative des Studierendenwerks Karlsruhe', infoUrl: 'https://www.sw-ka.de/de/hochschulgastronomie/mensa/mensa_moltke/' },
  ],
});
