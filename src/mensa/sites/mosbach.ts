import { defineDiningSite } from './types';

export const mosbachDining = defineDiningSite({
  site: 'MOS',
  label: 'Mosbach',
  operator: 'DHBW Mosbach / Kooperationspartner',
  presentation: 'preorder',
  source: { kind: 'dhbw-api' },
  officialInfoUrl: 'https://www.mosbach.dhbw.de/mosbach/campusmensa/',
  intro: 'Die Mensaria muss vorbestellt werden. Weitere Angebote werden separat geführt.',
  facilities: [{
    id: 'mos-tannenhof',
    name: 'Mensaria by Tannenhof',
    shortName: 'Mensaria',
    address: 'Knopfweg 1/1, 74821 Mosbach',
    mealHours: 'Ausgabe 12:00–14:00',
    orderUrl: 'https://stuv.app/mensa',
    infoUrl: 'https://www.mosbach.dhbw.de/mosbach/campusmensa/',
    menuUrl: 'https://www.stw.uni-heidelberg.de/wp-content/uploads/2025/04/sp-mos-mensa-tannenhof-aktuell.pdf',
    notice: 'Vorbestellung erforderlich · Campuscard · Bestätigungsmail mitbringen',
    specialPeriods: [{ from: '2026-07-01', to: '2026-09-11', label: 'Geschlossen bis 11. September' }],
  }],
  partners: [{
    id: 'mos-fideljo',
    name: 'Fideljo',
    description: 'Kooperationsrestaurant nahe Gebäude F · derzeit kein Speiseplan veröffentlicht',
    address: 'Neckarburkener Straße 18, 74821 Mosbach',
    hours: 'Mittagstisch 11:45–13:00',
  }],
  categoryLabels: { main: 'Tagesgericht' },
  markerPolicy: 'swapped',
});
