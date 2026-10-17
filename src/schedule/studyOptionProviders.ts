/** Verified provider conventions that cannot be inferred safely from arbitrary abbreviations.
 * API audit: 2026-10-17. Course patterns intentionally cover future cohorts.
 * See docs/STUDY_OPTION_DETECTION_AUDIT.md for evidence and unresolved cases.
 */
export function providerChoiceCategory(label: string, course?: string): string | null {
  if (/^STG-SO\d{2,4}-[A-Z]-[A-Z]-(?:SG\+)?WAHLPFLICHT$/i.test(course ?? '')) {
    if (/^\s*M(?:3|9|15)\b.*\bGruppe\b/i.test(label)) return 'Gruppen';
    if (/^\s*M(?:9|15)\b/i.test(label)) return 'Studienschwerpunkte';
    if (/^\s*M11(?:2)?\s+U3\b/i.test(label)) return 'Wahlpflichtseminare';
    if (/^\s*M14\s+U[234]\b/i.test(label)) return 'Wahlmodule';
  }
  // Only these legacy handbooks use an unlabelled M10 pool. Do not project module numbers
  // onto a future handbook (2026 already changed); explicit WPS labels work universally.
  if (/^VS-SXX(?:24|25)-ALLE-KURSE$/.test(course ?? '') && /^\s*M10\s+/i.test(label)) return 'Wahlpflichtseminare';
  if (/^MA-+TCT\d{2,4}(?:$|-)/i.test(course ?? '') && /\b(?:CBIW|TAC)\b/.test(label)) return 'Studienschwerpunkte';
  if (/^MOS-WWI\d{2,4}/i.test(course ?? '') && /\b(?:Vertiefung|Schwerpunkt)\s+(?:Handel|Industrie|KI|HD|IN)\b/i.test(label)) return 'Studienschwerpunkte';
  if (/^VS-WWI\d{2,4}/i.test(course ?? '') && /\bVertiefung\s+(?:Finanzdienstleister|Verwaltungsinformatik|IT(?:-Risikomanag\w*\s+und\s+Auditing)?|FD|VI)\b/i.test(label)) return 'Studienschwerpunkte';
  return null;
}
