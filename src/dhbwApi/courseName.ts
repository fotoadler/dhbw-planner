/**
 * Korrigiert ausschließlich eine bekannte historische Heidenheim-Schreibweise.
 * Der aktuelle Kurskatalog und der Rapla-Endpunkt verwenden `HDH-…`; mit
 * `DHD-…` antwortet die API mit 404.
 */
export function canonicalCourseName(site: string, course: string): string {
  const trimmed = course.trim();
  if (site.trim().toUpperCase() === 'HDH' && /^DHD-/i.test(trimmed)) {
    return `HDH-${trimmed.slice(4)}`;
  }
  return trimmed;
}
