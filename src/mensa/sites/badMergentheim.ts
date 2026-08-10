import { defineDiningSite } from './types';

/**
 * Das Studierendenwerk Heidelberg fuehrt fuer jedes Kooperationsrestaurant eine
 * eigene Speiseplan-PDF-Adresse, liefert dort aktuell aber acht Mal dieselbe
 * Datei mit dem Text „Derzeit kein Speiseplan vorhanden!" (identische Pruefsumme
 * 551af561cace507ffb3f20f5e8fe0c53, Stand 10. August 2026). Ein Knopf
 * „Speiseplan" wuerde also acht Mal in dasselbe leere Dokument fuehren; verlinkt
 * werden deshalb nur restauranteigene Seiten. Sobald das Studierendenwerk echte
 * Plaene veroeffentlicht, koennen die `menuUrl`-Felder zurueckkommen.
 */
export const badMergentheimDining = defineDiningSite({
  site: 'MGH',
  label: 'Bad Mergentheim',
  operator: 'DHBW Mosbach / Studierendenwerk Heidelberg',
  presentation: 'partner-list',
  source: { kind: 'partners' },
  officialInfoUrl: 'https://www.mosbach.dhbw.de/bad-mergentheim/campusmensa/',
  intro: 'Der Campus hat keine eigene Mensa. Mit der Essensmarke gibt es ein Mittagessen bei den Kooperationsrestaurants; tagesaktuelle Speisepläne veröffentlicht das Studierendenwerk derzeit nicht.',
  facilities: [],
  voucher: {
    price: 2.7,
    value: 5.4,
    description: 'Essensmarken gibt es mit Studierendenausweis bei der Campusverwaltung.',
    infoUrl: 'https://www.mosbach.dhbw.de/bad-mergentheim/campusmensa/',
  },
  partners: [
    {
      id: 'mgh-pomodoro', name: 'Pomodoro-e-Basilico', address: 'Bahnhofplatz 1, Bad Mergentheim',
      description: 'Montags Ruhetag',
      infoUrl: 'https://pomodoro-e-basilico.eatbu.com/?lang=de',
    },
    {
      id: 'mgh-ct-no1', name: 'CT No. 1', address: 'Härterichstraße 12, Bad Mergentheim',
      infoUrl: 'https://ct-no1.de/speisekarte/',
    },
    {
      id: 'mgh-la-flamme', name: 'La Flamme', address: 'Nonnengasse 7, Bad Mergentheim',
      description: 'Mo–Sa erst ab 17 Uhr',
      infoUrl: 'https://www.la-flamme.de/standorte/bad-mergentheim/',
    },
    {
      id: 'mgh-schlossgarten', name: 'Café im Schlossgarten', address: 'Schloss 14, Bad Mergentheim',
      description: 'Freitags Ruhetag',
      infoUrl: 'https://www.cafe-im-schlossgarten.de/',
    },
    {
      id: 'mgh-patila', name: 'Patila', address: 'Bahnhofstraße 14, Bad Mergentheim',
      infoUrl: 'https://visit.bad-mergentheim.de/de/kultur-schloss-genuss/gastronomieverzeichnis/patila-id_2191/',
    },
    {
      id: 'mgh-balis', name: 'Bali’s Imbiss', address: 'Poststraße 9, Bad Mergentheim',
    },
    {
      id: 'mgh-poseidon', name: 'Zunftstuben Poseidon', address: 'Hans-Heinrich-Ehrler-Platz 42, Bad Mergentheim',
      description: 'Mittwochs Ruhetag',
      infoUrl: 'https://www.poseidon-mgh.de/',
    },
    {
      id: 'mgh-cocoas', name: 'Cocoa’s Bistro', address: 'Bahnhofstraße 1, Bad Mergentheim',
    },
    {
      id: 'mgh-kidano', name: 'Kidano Restaurant', address: 'Hans-Heinrich-Ehrler-Platz 39, Bad Mergentheim',
      description: 'Montags Ruhetag', menuUrl: 'https://kidano-restaurant.de/mittagstisch/',
      infoUrl: 'https://kidano-restaurant.de/menu/',
    },
  ],
});
