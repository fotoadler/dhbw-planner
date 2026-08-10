import { defineDiningSite } from './types';

export const villingenSchwenningenDining = defineDiningSite({
  site: 'VS',
  label: 'Villingen-Schwenningen',
  operator: 'Studierendenwerk Freiburg-Schwarzwald',
  presentation: 'single-facility',
  source: { kind: 'dhbw-api' },
  officialInfoUrl: 'https://www.swfr.de/essen/mensen-cafes-speiseplaene/villingen-schwenningen/mensa-cafeteria-schwenningen',
  facilities: [{
    id: 'vs-schwenningen',
    apiId: 2,
    name: 'Mensa Schwenningen',
    address: 'Karlstraße 19, 78054 Schwenningen',
    mealHours: 'Mittagessen 11:30–14:00',
    menuUrl: 'https://www.swfr.de/essen/mensen-cafes-speiseplaene/villingen-schwenningen/mensa-cafeteria-schwenningen',
    specialPeriods: [{ from: '2026-08-01', to: '2026-09-13', label: 'Sommerpause bis 13. September' }],
  }],
  categoryLabels: { main: 'Menü' },
  markerPolicy: 'hidden',
  partners: [{
    id: 'vs-k19',
    name: 'Cafeteria K19',
    description: 'Frühstück, Snacks, Getränke und Kuchen · Sommerpause bis 06.09.2026',
    address: 'Karlstraße 19, 78054 Schwenningen',
    infoUrl: 'https://www.swfr.de/essen/mensen-cafes-speiseplaene/villingen-schwenningen/mensa-cafeteria-schwenningen',
  }],
});
