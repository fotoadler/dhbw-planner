import { defineDiningSite } from './types';

export const heilbronnDining = defineDiningSite({
  site: 'HN',
  label: 'Heilbronn',
  operator: 'Studierendenwerk Heidelberg',
  presentation: 'single-facility',
  source: { kind: 'stw-heidelberg', venue: 'Mensa Bildungscampus Heilbronn', apiSite: 'HN' },
  officialInfoUrl: 'https://www.stw.uni-heidelberg.de/essen-trinken/restaurant/mensa-am-bildungscampus/',
  facilities: [{
    id: 'hn-bildungscampus',
    apiId: 4,
    name: 'Mensa am Bildungscampus',
    address: 'Bildungscampus 8, 74076 Heilbronn',
    mealHours: 'Mo–Fr 11:00–14:30',
    menuUrl: 'https://www.stw.uni-heidelberg.de/essen-trinken/speiseplan/',
  }],
  // Der API-Bucket enthaelt auch Dessert und Suppentopf. Bis der offizielle
  // Source-Adapter die Ausgaben liefert, ist eine neutrale Bezeichnung korrekt.
  categoryLabels: { main: 'Angebot' },
  markerPolicy: 'hidden',
  partners: [
    { id: 'hn-cafe', name: 'Café am Bildungscampus', infoUrl: 'https://www.stw.uni-heidelberg.de/essen-trinken/restaurant/cafe-bildungscampus-gebaeude-m/' },
    { id: 'hn-campus-garden', name: 'Campus Garden', infoUrl: 'https://bildungscampus.hn/leben-am-campus/gastronomie' },
    { id: 'hn-shopbox', name: 'shop.box', infoUrl: 'https://bildungscampus.hn/leben-am-campus/gastronomie' },
  ],
});
