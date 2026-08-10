import { badMergentheimDining } from './badMergentheim';
import { casDining } from './cas';
import { friedrichshafenDining } from './friedrichshafen';
import { heidenheimDining } from './heidenheim';
import { heilbronnDining } from './heilbronn';
import { horbDining } from './horb';
import { karlsruheDining } from './karlsruhe';
import { loerrachDining } from './loerrach';
import { mannheimDining } from './mannheim';
import { mosbachDining } from './mosbach';
import { ravensburgDining } from './ravensburg';
import { stuttgartDining } from './stuttgart';
import { villingenSchwenningenDining } from './villingenSchwenningen';
import type { DiningSiteProfile } from './types';

const PROFILES: DiningSiteProfile[] = [
  ravensburgDining,
  friedrichshafenDining,
  stuttgartDining,
  karlsruheDining,
  mannheimDining,
  mosbachDining,
  badMergentheimDining,
  heidenheimDining,
  heilbronnDining,
  villingenSchwenningenDining,
  casDining,
  horbDining,
  loerrachDining,
];

export const DINING_SITE_PROFILES: Readonly<Record<string, DiningSiteProfile>> = Object.freeze(
  Object.fromEntries(PROFILES.map((profile) => [profile.site, profile])),
);

export const DINING_SITE_OPTIONS = PROFILES.map((profile) => ({ value: profile.site, label: profile.label }));

export function diningProfileForSite(site: string): DiningSiteProfile {
  const code = site.trim().toUpperCase();
  return DINING_SITE_PROFILES[code] ?? {
    site: code,
    label: code || 'DHBW-Standort',
    operator: 'DHBW',
    presentation: 'single-facility',
    source: { kind: 'dhbw-api', apiSite: code },
    facilities: [{ id: `${code.toLowerCase()}-mensa`, name: `Mensa ${code}` }],
  };
}

export type { DiningSiteProfile } from './types';
