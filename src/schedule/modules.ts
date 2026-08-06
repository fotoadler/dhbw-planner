import { ScheduleEntry } from '../types';

/** Ein im Stundenplan auswählbares Vorlesungsmodul. */
export interface ScheduleModule {
  key: string;
  label: string;
}

/**
 * Rapla und die DHBW-API liefern derzeit keinen separaten, stabilen
 * Modul-Identifier. Der normalisierte Titel ist deshalb die gemeinsame
 * Filterkennung beider Quellen.
 */
export function scheduleModuleKey(entry: ScheduleEntry): string {
  return entry.title.trim();
}

function isModuleEntry(entry: ScheduleEntry): boolean {
  // Kurs-/Lecture-Einträge tragen den Kurscode. Freie API-Events (z. B.
  // Tanzkurse) und Rapla-Sondertermine ohne Kurscode gehören nicht in die
  // Modulauswahl, sollen im eigentlichen Kalender aber sichtbar bleiben.
  return entry.type !== 'holiday' && Boolean(entry.course?.trim()) && Boolean(scheduleModuleKey(entry));
}

/** Liefert eindeutige Module aus dem vollständigen, ungefilterten Plan. */
export function listScheduleModules(entries: ScheduleEntry[]): ScheduleModule[] {
  const modules = new Map<string, ScheduleModule>();
  for (const entry of entries) {
    if (!isModuleEntry(entry)) continue;
    const key = scheduleModuleKey(entry);
    if (!modules.has(key)) modules.set(key, { key, label: key });
  }
  return [...modules.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'));
}

/** Blendet abgewählte Module aus, ohne die Einträge aus dem Cache zu löschen. */
export function filterScheduleEntries(entries: ScheduleEntry[], hiddenModules: string[]): ScheduleEntry[] {
  const hidden = new Set(hiddenModules.map((module) => module.trim()).filter(Boolean));
  if (hidden.size === 0) return entries;
  return entries.filter((entry) => !isModuleEntry(entry) || !hidden.has(scheduleModuleKey(entry)));
}
