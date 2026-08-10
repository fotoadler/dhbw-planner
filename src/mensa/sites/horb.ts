import { defineDiningSite } from './types';

export const horbDining = defineDiningSite({
  site: 'HORB',
  label: 'Horb',
  operator: 'Studierendenwerk Stuttgart',
  presentation: 'single-facility',
  source: { kind: 'dhbw-api' },
  officialInfoUrl: 'https://www.studierendenwerk-stuttgart.de/essen/mensen-und-cafeterien/mensa-horb',
  facilities: [{
    id: 'horb-mensa',
    apiId: 9,
    name: 'Mensa Horb',
    address: 'Florianstraße 15, 72160 Horb',
    openingHours: 'Ab 07:30 bis 15:00',
    mealHours: 'Essensausgabe 11:15–14:15',
    menuUrl: 'https://www.studierendenwerk-stuttgart.de/essen/speiseplan',
    specialPeriods: [
      { from: '2026-07-27', to: '2026-09-04', label: 'Sommerpause' },
      { from: '2026-12-23', to: '2026-12-31', label: 'Geschlossen' },
    ],
  }],
  categoryLabels: { main: 'Mittagsangebot', side: 'Beilage', dessert: 'Dessert' },
  markerPolicy: 'swapped',
  pricePolicy: 'student-only',
  partners: [
    { id: 'horb-automat-mensa', name: 'Automatenstation Mensa Horb', description: 'Snacks außerhalb der Mensazeiten', address: 'Florianstraße 15', infoUrl: 'https://www.studierendenwerk-stuttgart.de/essen/mensen-und-cafeterien/automatenstation-mensa-horb' },
    { id: 'horb-automat-hohenberg', name: 'Automatenstation Hohenbergcampus', description: 'Snacks außerhalb der Mensazeiten', address: 'Geschwister-Scholl-Straße 10', infoUrl: 'https://www.studierendenwerk-stuttgart.de/essen/mensen-und-cafeterien/automatenstation-horb-geschwister-scholl' },
  ],
});
