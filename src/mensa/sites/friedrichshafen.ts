import { ZEPPELIN_MENU_URL } from '../myMensa';
import { defineDiningSite } from './types';

export const friedrichshafenDining = defineDiningSite({
  site: 'FN',
  label: 'Friedrichshafen',
  operator: 'Seezeit Studierendenwerk Bodensee',
  presentation: 'facility-tabs',
  source: { kind: 'seezeit', legacyMensa: 'friedrichshafen', apiSite: 'FN' },
  officialInfoUrl: 'https://seezeit.com/essen/mensa-cafeteria-co/mensa-friedrichshafen/',
  facilities: [{
    id: 'fn-fallenbrunnen',
    apiId: 10,
    name: 'Mensa Fallenbrunnen',
    shortName: 'Seezeit',
    address: 'Fallenbrunnen 2, Gebäude H, 88045 Friedrichshafen',
    mealHours: 'Mittagessen 11:30–13:30',
    menuUrl: 'https://seezeit.com/essen/speiseplaene/mensa-friedrichshafen/',
    specialPeriods: [{
      from: '2026-06-29',
      to: '2026-09-18',
      label: 'Sommerpause bis 18. September',
      source: 'https://seezeit.com/essen/mensa-cafeteria-co/mensa-friedrichshafen/',
      checkedAt: '2026-08-10',
    }],
  }, {
    id: 'fn-zeppelin',
    name: 'Mensa Zeppelin Universität',
    shortName: 'Zeppelin Universität',
    source: { kind: 'my-mensa', mensaId: 'mensa_fallenbrunnen' },
    menuUrl: ZEPPELIN_MENU_URL,
    infoUrl: ZEPPELIN_MENU_URL,
  }],
  categoryLabels: { main: 'Angebot' },
});
