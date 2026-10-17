export function sourceLabel(course: string): string {
  const group = course.match(/-+(?:GRUPPE-?|GR-?)(\d+|[A-Z])$/i);
  const lab = course.match(/-G(\d+|[A-Z])$/i);
  return lab ? `${course.startsWith('MOS-') ? 'Laborgruppe' : 'Gruppe'} ${lab[1]}` : group ? `Gruppe ${group[1]}` : course;
}

/** Short display text; raw titles remain the stable selection and accessibility keys. */
export function choiceLabel(label: string): { title: string; detail?: string } {
  const unit = label.match(/^M(\d+)\s+U([\d+]+)\s+/i);
  if (unit) return { title: label.slice(unit[0].length).trim() || label, detail: `Modul ${unit[1]} · Einheit ${unit[2]}` };
  const module = label.match(/^M(\d+)\s+(?:WPS\s*:?|Übung(?:en)?\s*:?|Ü\s*|Studienschwerpunkt)\s*/i);
  if (module) return { title: label.slice(module[0].length).trim() || label, detail: `Modul ${module[1]}` };
  const elective = label.match(/^WPM-([A-Z])\s*:\s*/i);
  if (elective) return { title: label.slice(elective[0].length).trim() || label, detail: `WPM-${elective[1]}` };
  return { title: label };
}
