import { defineDiningSite } from './types';

export const badMergentheimDining = defineDiningSite({
  site: 'MGH',
  label: 'Bad Mergentheim',
  operator: 'DHBW Mosbach / Studierendenwerk Heidelberg',
  presentation: 'partner-list',
  source: { kind: 'partners' },
  intro: 'Neun Partnerrestaurants akzeptieren Essensmarken; aktuelle Online-Speisepläne fehlen derzeit.',
  officialInfoUrl: 'https://www.mosbach.dhbw.de/bad-mergentheim/campusmensa/',
  facilities: [],
  voucher: {
    price: 2.7,
    value: 5.4,
    description: 'Essensmarken gibt es mit Studierendenausweis bei der Campusverwaltung.',
    infoUrl: 'https://www.mosbach.dhbw.de/bad-mergentheim/campusmensa/',
  },
  partners: [
    { id: 'mgh-pomodoro', name: 'Pomodoro-e-Basilico', address: 'Bahnhofplatz 1, Bad Mergentheim', description: 'Montags Ruhetag' },
    { id: 'mgh-ct-no1', name: 'CT No. 1', address: 'Härterichstraße 12, Bad Mergentheim' },
    { id: 'mgh-la-flamme', name: 'La Flamme', address: 'Nonnengasse 7, Bad Mergentheim', description: 'Mo–Sa erst ab 17 Uhr' },
    { id: 'mgh-schlossgarten', name: 'Café im Schlossgarten', address: 'Schloss 14, Bad Mergentheim', description: 'Freitags Ruhetag' },
    { id: 'mgh-patila', name: 'Patila', address: 'Bahnhofstraße 14, Bad Mergentheim' },
    { id: 'mgh-balis', name: 'Bali’s Imbiss', address: 'Poststraße 9, Bad Mergentheim' },
    { id: 'mgh-poseidon', name: 'Zunftstuben Poseidon', address: 'Hans-Heinrich-Ehrler-Platz 42, Bad Mergentheim', description: 'Mittwochs Ruhetag' },
    { id: 'mgh-cocoas', name: 'Cocoa’s Bistro', address: 'Bahnhofstraße 9, Bad Mergentheim' },
    { id: 'mgh-kidano', name: 'Kidano Restaurant', address: 'Hans-Heinrich-Ehrler-Platz 39, Bad Mergentheim', description: 'Montags Ruhetag', infoUrl: 'https://mgh.kidano-restaurant.de/' },
  ],
});
