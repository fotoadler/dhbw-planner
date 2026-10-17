import { useEffect, useState } from 'react';
import { getCourseSchedule } from '../../../dhbwApi/client';
import { courseCatalog, groupSource, studyOptionsKey, suggestedCourses } from '../../../dhbwApi/studyOptions';
import type { AppSettings } from '../../../store/preferences';
import type { ScheduleModule } from '../../../schedule/modules';

export function useStudyOptions(settings: AppSettings | null, modules: ScheduleModule[], updatedAt?: Date | null) {
  const selection = settings?.scheduleSource === 'dhbw-api' ? settings.apiSelection : null;
  const [result, setResult] = useState<{key: string; signature: string} | null>(null);
  const key = selection ? `${selection.site}:${selection.course}` : '';
  const labels = JSON.stringify(modules.map(m => m.label));
  useEffect(() => {
    let active = true;
    if (!selection) { setResult(null); return; }
    const check = async () => {
      try {
        const catalog = await courseCatalog(selection.site);
        const sources = suggestedCourses(selection, catalog).map(c => c.name);
        const plans = await Promise.all(sources.filter(c => !groupSource(c)).map(c => getCourseSchedule(c)));
        const signature = studyOptionsKey(sources, [...JSON.parse(labels), ...plans.flatMap(p => p.entries.map(e => e.title))], selection.course);
        if (active) setResult({key, signature});
      } catch { /* A failed check never marks configuration complete. Retry on refresh/focus. */ }
    };
    void check();
    window.addEventListener('focus', check);
    return () => { active = false; window.removeEventListener('focus', check); };
  }, [key, labels, updatedAt?.getTime()]);
  return result?.key === key ? result.signature : '';
}
