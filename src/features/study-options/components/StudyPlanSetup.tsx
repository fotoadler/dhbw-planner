import { useEffect, useState } from 'react';
import { getCourseSchedule } from '../../../dhbwApi/client';
import { courseCatalog, suggestedCourses } from '../../../dhbwApi/studyOptions';
import { isChoiceModule, listScheduleModules } from '../../../schedule/modules';
import type { AppSettings } from '../../../store/preferences';
import type { ScheduleEntry } from '../../../types';
import { ModuleSelection } from './ModuleSelection';

interface Props { settings: AppSettings; onSave: (settings: AppSettings) => void; onCancel: () => void }
/** Course is still a draft here: no device-calendar/notification side effects before completion. */
export function StudyPlanSetup({ settings, onSave, onCancel }: Props) {
  const [entries, setEntries] = useState<ScheduleEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const selection = settings.apiSelection!;
  useEffect(() => {
    let active = true;
    setError(false); setEntries(null);
    void Promise.all([getCourseSchedule(selection.course), courseCatalog(selection.site)]).then(([plan, catalog]) => {
      if (!active) return;
      const labels = plan.entries.map(e => e.title);
      const hasOffers = plan.entries.some(e => isChoiceModule(e.title, e.course ?? selection.course, labels)) || suggestedCourses(selection, catalog).length > 0;
      if (!hasOffers) { onSave({ ...settings, apiSelection: { ...selection, selectedOptionalModules: [], optionsNoticeSeen: true } }); return; }
      setEntries(plan.entries);
    }, () => { if (active) setError(true); });
    return () => { active = false; };
  }, [selection.course, selection.site, attempt]);
  const draft = { ...settings, apiSelection: { ...selection, selectedOptionalModules: [], selectedAdditionalModules: [], additionalCourses: [] } };
  return <main className="app study-setup">
    <header className="app__header"><button type="button" className="iconbtn" aria-label="Zurück zur Kurswahl" onClick={onCancel}>‹</button><div className="app__date"><h1 className="app__day">Deine Kurswahl</h1><p className="app__subtitle">{selection.course}</p></div></header>
    {entries ? <ModuleSelection key={selection.course} settings={draft} modules={listScheduleModules(entries)} entries={entries} setup onChange={onSave} /> : <div className="study-setup__status">{error ? <><p>Angebote konnten nicht geladen werden.</p><button type="button" className="sheet__textbtn" onClick={() => setAttempt(n => n + 1)}>Erneut versuchen</button></> : <p>Angebote werden geprüft …</p>}</div>}
  </main>;
}
