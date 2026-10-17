import type { ScheduleModule } from '../../../schedule/modules';
import { studyGroup } from '../../../schedule/studyGroups';

export interface ChoiceOffer extends ScheduleModule {
  memberKeys: string[];
}

/** Only explicit room annotations are equivalent; instructors and seminar numbers remain distinct. */
export function offerTitle(label: string): string {
  return label.replace(/\s+[A-Z]\.\d+\s+als Besprechungs- und Arbeitsraum\s*$/i, '')
    .replace(/\s+(?:\[findet online statt\]|findet online statt[!.]*|\(?online(?:vorlesung)?[!.]*\)?|Präsenz)\s*$/i, '').trim();
}

export function mergeOfferVariants(modules: ScheduleModule[]): ChoiceOffer[] {
  const offers = new Map<string, ChoiceOffer>();
  for (const module of modules) {
    const title = offerTitle(module.label);
    const existing = offers.get(title);
    if (existing) existing.memberKeys.push(module.key);
    else offers.set(title, { key: title, label: title, memberKeys: [module.key] });
  }
  return [...offers.values()];
}

/** Explicit numbered alternatives are exclusive within the same named laboratory/activity. */
export function numberedGroupFamily(label: string): string | null {
  return studyGroup(offerTitle(label))?.family ?? null;
}

export function groupIdentifier(label: string): string | null {
  return studyGroup(offerTitle(label))?.id ?? null;
}
