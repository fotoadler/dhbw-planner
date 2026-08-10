import { defineDiningSite } from './types';

export const casDining = defineDiningSite({
  site: 'CAS',
  label: 'CAS',
  operator: 'Studierendenwerk Heidelberg',
  presentation: 'single-facility',
  venueScope: 'multi-site',
  // Das CAS-Profil buendelt die Studienakademien; als Essensziel steht die
  // Mensa am Bildungscampus schon unter 'HN'.
  venuePicker: 'hidden',
  source: { kind: 'stw-heidelberg', venue: 'Mensa Bildungscampus Heilbronn', apiSite: 'CAS' },
  intro: 'Standardmäßig wird der Bildungscampus Heilbronn gezeigt. Bei Modulen an einer anderen Studienakademie kannst du den Essensstandort direkt wechseln.',
  officialInfoUrl: 'https://bildungscampus.hn/leben-am-campus/gastronomie',
  facilities: [{
    id: 'cas-bildungscampus',
    apiId: 4,
    name: 'Mensa am Bildungscampus',
    shortName: 'Bildungscampus',
    address: 'Bildungscampus 8, 74076 Heilbronn',
    mealHours: 'Mo–Fr 11:00–14:30',
    menuUrl: 'https://www.stw.uni-heidelberg.de/essen-trinken/speiseplan/',
  }],
  categoryLabels: { main: 'Tagesangebot' },
  markerPolicy: 'hidden',
  partners: [
    { id: 'cas-cafe', name: 'Café Bildungscampus', description: 'Im CAS-Gebäude BC 13 · Mo–Fr 07:30–17:00', infoUrl: 'https://www.stw.uni-heidelberg.de/essen-trinken/restaurant/cafe-bildungscampus-gebaeude-m/' },
    { id: 'cas-garden', name: 'Campus Garden', description: 'Gebäude BC 1', infoUrl: 'https://bildungscampus.hn/leben-am-campus/gastronomie' },
    { id: 'cas-heavens', name: 'Heaven’s Kitchen', description: 'Gebäude BC 11', infoUrl: 'https://bildungscampus.hn/leben-am-campus/gastronomie' },
    { id: 'cas-shopbox', name: 'shop.box', description: '24/7 am Bildungscampus', infoUrl: 'https://bildungscampus.hn/leben-am-campus/gastronomie' },
  ],
});
