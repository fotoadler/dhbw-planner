import { groupSource } from '../../../dhbwApi/studyOptions';
import { mergeOfferVariants } from './offerVariants';
import { choiceCategory, type ScheduleModule } from '../../../schedule/modules';

/** The presence of an additional source does not make its common lectures elective. */
export function buildModuleChoices(base: ScheduleModule[], loaded: Record<string, ScheduleModule[]>, groupModules: ScheduleModule[], course?: string) {
  const poolSources = Object.keys(loaded).filter(c => !groupSource(c));
  const poolModules = poolSources.flatMap(c => loaded[c]);
  const all = new Map([...base, ...poolModules, ...groupModules].map(m => [m.key, m]));
  const extraKeys = new Set([...poolModules, ...groupModules].map(m => m.key));
  const baseKeys = new Set(base.map(m => m.key));
  const groupOnlyKeys = new Set(groupModules.filter(m => !baseKeys.has(m.key)).map(m => m.key));
  const baseLabels = base.map(m => m.label);
  const categoryOf = (m: ScheduleModule & { memberKeys?: string[] }) => choiceCategory(m.label, course, baseLabels) ?? poolSources.map(source => loaded[source].some(item => (m.memberKeys ?? [m.key]).includes(item.key)) ? choiceCategory(m.label, source, loaded[source].map(item => item.label)) : null).find(Boolean) ?? null;
  const choices = mergeOfferVariants([...all.values()].filter(m => !groupOnlyKeys.has(m.key) && categoryOf(m) !== null));
  const common = [...new Map([...base, ...poolModules].filter(m => !categoryOf(m)).map(m => [m.key, m])).values()];
  return { poolSources, poolModules, all, extraKeys, baseKeys, choices, common, categoryOf };
}
