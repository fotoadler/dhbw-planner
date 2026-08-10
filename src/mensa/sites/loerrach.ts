import { defineDiningSite } from './types';

export const loerrachDining = defineDiningSite({
  site: 'LÖR',
  label: 'Lörrach',
  operator: 'Studierendenwerk Freiburg-Schwarzwald / Kliniken des Landkreises Lörrach',
  presentation: 'facility-tabs',
  source: { kind: 'dhbw-api', apiSite: 'LÖR' },
  officialInfoUrl: 'https://www.swfr.de/essen/mensen-cafes-speiseplaene/mensa-loerrach',
  intro: 'Die Campusmensa liegt an der Hangstraße. Am Kreisklinikum gibt es eine separat geführte Cafeteria.',
  facilities: [
    {
      id: 'loer-campus', apiId: 3, kind: 'warm-meals', name: 'Mensa Lörrach', shortName: 'Campus',
      address: 'Hangstraße 46–50, 79539 Lörrach', openingHours: 'Cafeteria 09:30–13:45',
      mealHours: 'Mensa 11:45–13:30', menuUrl: 'https://www.swfr.de/essen/mensen-cafes-speiseplaene/mensa-loerrach',
      specialPeriods: [{ from: '2026-08-03', to: '2026-09-13', label: 'Sommerpause bis 13. September' }],
    },
    {
      id: 'loer-klinikum', kind: 'external-menu', name: 'Cafeteria im Kreisklinikum', shortName: 'Klinikum',
      address: 'Spitalstraße 25, 5. OG, 79539 Lörrach', openingHours: 'Mo–Fr 08:00–17:00',
      mealHours: 'Mittagstisch 11:30–14:00',
      menuUrl: 'https://dhbw-loerrach.de/mensa/cafeteria-im-kkh-loerrach',
      notice: 'Nur Barzahlung · kein gesonderter Studierendenrabatt',
    },
  ],
  categoryLabels: { main: 'Menü' },
  markerPolicy: 'hidden',
  pricePolicy: 'all',
});
