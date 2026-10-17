import { getCourses, type DhbwCourse } from './client';
import type { ApiSelection } from '../store/preferences';
import { choiceCategory, isChoiceModule } from '../schedule/modules';

const catalogs = new Map<string, {expires: number; pending: Promise<DhbwCourse[]>}>();
/** Refresh shared-plan discovery, including after returning to another profile. */
export function courseCatalog(site: string): Promise<DhbwCourse[]> {
  const cached = catalogs.get(site);
  if (cached && cached.expires > Date.now()) return cached.pending;
  const pending = getCourses(site).catch(error => { catalogs.delete(site); throw error; });
  catalogs.set(site, { expires: Date.now() + 60_000, pending });
  return pending;
}

export function groupSource(course: string): string | null {
  const match = course.match(/^(.*?)-+(?:GRUPPE-?|GR-?|G)(\d+|[A-Z])$/i);
  return match ? `${match[1].toUpperCase()}-GRUPPE-` : null;
}

/** Match cohort and source conventions, independently of campus, year and module handbook. */
export function suggestedCourses(selection: ApiSelection, catalog: DhbwCourse[]): DhbwCourse[] {
  const name = selection.course;
  const cohort = name.match(/^(.*?\d{2,4})([A-Z])?$/);
  return catalog.filter(c => {
    if (c.name === name || c.site !== selection.site) return false;
    if (groupSource(c.name) === `${name.toUpperCase()}-GRUPPE-`) return true;
    if (!cohort) return false;
    if (c.name === `${cohort[1]}-ALLE-KURSE`) return true;
    const range = c.name.match(/^(.*?\d{2,4})-([A-Z])-([A-Z])-(?:SG\+)?WAHLPFLICHT$/);
    return Boolean(range && range[1] === cohort[1] && cohort[2] && cohort[2] >= range[2] && cohort[2] <= range[3]);
  });
}

/** Completed configuration is separate from seeing or postponing a notice.
 * New categories/sources require review; a new date of an existing seminar does not.
 */
export function studyOptionsKey(sources: string[], labels: string[], course?: string): string {
  const categories = [...new Set(labels.map(label => choiceCategory(label, course, labels) ?? sources.map(source => choiceCategory(label, source, labels)).find(Boolean)).filter(Boolean))].sort();
  if (!sources.length && !categories.length) return '';
  return JSON.stringify(['choices-v4', [...new Set(sources)].sort(), categories]);
}
export function hasChoiceModules(labels: string[]): boolean {
  return labels.some(label => isChoiceModule(label, undefined, labels));
}
