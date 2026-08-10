import { defineDiningSite } from './types';

export const heidenheimDining = defineDiningSite({
  site: 'HDH',
  label: 'Heidenheim',
  operator: 'Studierendenwerk Ulm',
  presentation: 'facility-tabs',
  source: { kind: 'dhbw-api' },
  officialInfoUrl: 'https://studierendenwerk-ulm.de/essen-trinken/mensen-und-cafeterien/#mensa-dhbw-heidenheim',
  facilities: [
    {
      id: 'hdh-marienstrasse', apiId: 13, kind: 'warm-meals', name: 'Cafeteria Marienstraße', shortName: 'Marienstraße',
      address: 'Marienstraße 20, 89518 Heidenheim', openingHours: 'Mo–Do 08:00–15:30 · Fr 08:00–14:00',
      mealHours: 'Essensausgabe 11:30–13:45', menuUrl: 'https://sw-ulm-spl51.maxmanager.xyz/index.php?locationId=15',
      orderUrl: 'https://stwulm.my-mensa.de/mensatogo.php?einrichtung=15',
      notice: 'Fleisch- und Fischgerichte müssen bis 09:00 Uhr vorbestellt werden.',
      specialPeriods: [{ from: '2026-07-27', to: '2026-09-05', label: 'Verkürzte Sommeröffnung', hours: 'Mo–Fr 07:30–14:00' }],
    },
    {
      id: 'hdh-wilhelmstrasse', kind: 'snack-only', name: 'Pausenverkauf Wilhelmstraße', shortName: 'Wilhelmstraße',
      address: 'Wilhelmstraße 10, 89518 Heidenheim', openingHours: 'Mo–Fr 08:15–10:30 und 11:00–13:30',
      notice: 'Getränke, Backwaren, Snacks und Süßigkeiten; kein Mittagsspeiseplan.',
      specialPeriods: [{ from: '2026-08-31', to: '2026-09-25', label: 'Geschlossen' }],
    },
  ],
  categoryLabels: { main: 'Tagesgericht' },
  markerPolicy: 'hidden',
});
