import { defineDiningSite } from './types';

const STW_BASE = 'https://www.stw.uni-heidelberg.de/wp-content/uploads/2025';

export const badMergentheimDining = defineDiningSite({
  site: 'MGH',
  label: 'Bad Mergentheim',
  operator: 'DHBW Mosbach / Studierendenwerk Heidelberg',
  presentation: 'partner-list',
  source: { kind: 'partners' },
  intro: 'In Bad Mergentheim gibt es statt einer einzelnen Mensa neun Partnerrestaurants.',
  officialInfoUrl: 'https://www.mosbach.dhbw.de/bad-mergentheim/campusmensa/',
  facilities: [],
  voucher: {
    price: 2.7,
    value: 5.4,
    description: 'Essensmarken gibt es mit Studierendenausweis bei der Campusverwaltung.',
    infoUrl: 'https://www.mosbach.dhbw.de/bad-mergentheim/campusmensa/',
  },
  partners: [
    { id: 'mgh-pomodoro', name: 'Pomodoro-e-Basilico', address: 'Bahnhofplatz 1, Bad Mergentheim', description: 'Montags Ruhetag', menuUrl: `${STW_BASE}/04/sp-mgh-pomodoro-aktuell.pdf` },
    { id: 'mgh-ct-no1', name: 'CT No. 1', address: 'Härterichstraße 12, Bad Mergentheim', menuUrl: `${STW_BASE}/05/sp-mgh-no1-aktuell.pdf` },
    { id: 'mgh-la-flamme', name: 'La Flamme', address: 'Nonnengasse 7, Bad Mergentheim', description: 'Mo–Sa erst ab 17 Uhr', menuUrl: `${STW_BASE}/04/sp-mgh-laflamme-aktuell.pdf` },
    { id: 'mgh-schlossgarten', name: 'Café im Schlossgarten', address: 'Schloss 14, Bad Mergentheim', description: 'Freitags Ruhetag', menuUrl: `${STW_BASE}/04/sp-mgh-schlossgarten-aktuell.pdf` },
    { id: 'mgh-patila', name: 'Patila', address: 'Bahnhofstraße 14, Bad Mergentheim', menuUrl: `${STW_BASE}/04/sp-mgh-patila-aktuell.pdf` },
    { id: 'mgh-balis', name: 'Bali’s Imbiss', address: 'Poststraße 9, Bad Mergentheim', menuUrl: `${STW_BASE}/04/sp-mgh-balis-aktuell.pdf` },
    { id: 'mgh-poseidon', name: 'Zunftstuben Poseidon', address: 'Hans-Heinrich-Ehrler-Platz 42, Bad Mergentheim', description: 'Mittwochs Ruhetag', menuUrl: `${STW_BASE}/05/sp-mgh-poseidon-aktuell.pdf` },
    { id: 'mgh-cocoas', name: 'Cocoa’s Bistro', address: 'Bahnhofstraße 9, Bad Mergentheim', menuUrl: `${STW_BASE}/04/sp-mgh-cocoa-aktuell.pdf` },
    { id: 'mgh-kidano', name: 'Kidano Restaurant', address: 'Hans-Heinrich-Ehrler-Platz 39, Bad Mergentheim', description: 'Montags Ruhetag', menuUrl: 'https://mgh.kidano-restaurant.de/' },
  ],
});
