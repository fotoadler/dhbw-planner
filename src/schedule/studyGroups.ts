/** Explicit group identifiers, shared by classification and selection. No course/year assumptions. */
export function studyGroup(label: string): { id: string; family: string } | null {
  const reversed = /\b([A-Z])(?:\s+|-)(?:Gruppen|Grp\.?)(?=\s|$|[),])/i.exec(label);
  if (reversed) return { id: reversed[1].toUpperCase(), family: label.replace(reversed[0], '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de') };
  const marker = /\b(?:Gruppe|Grp|Gr)\.?\s*[:\-]?\s*/i.exec(label);
  if (!marker) return null;
  const identifier = /^(?:([A-ZÄÖÜ][a-zäöüß]*\s*[-–]\s*[A-ZÄÖÜ][a-zäöüß]*)\b|(\d+|[A-Z]\d+|[A-Z]{1,4})\b)/.exec(label.slice(marker.index + marker[0].length));
  if (!identifier || /^(?:NUR|MIT|UND|DER|DIE|DES|VON)$/.test(identifier[0])) return null;
  const start = marker.index;
  const end = start + marker[0].length + identifier[0].length;
  const before = label.slice(0, start);
  const after = label.slice(end);
  // Joint sessions stay included; “Gr. 1+2” must not become an exclusive single-group offer.
  if (/\b(?:alle|beide|sämtliche|gesamte)\s*$/i.test(before) || /^\s*(?:\+|\/|&|[-–]\s*\d|,\s*\d|und\b)/i.test(after)) return null;
  const family = `${before} ${after.replace(/^\s*\([A-ZÄÖÜ]+\s*[-–]\s*[A-ZÄÖÜ]+\)/, '')}`
    .replace(/[()]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de');
  return { id: identifier[0], family };
}
