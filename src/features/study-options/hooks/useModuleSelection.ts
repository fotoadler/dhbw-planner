import { useEffect, useMemo, useState } from 'react';
import { getCourseSchedule, type DhbwCourse } from '../../../dhbwApi/client';
import { courseCatalog, groupSource, studyOptionsKey, suggestedCourses } from '../../../dhbwApi/studyOptions';
import { isChoiceModule, listScheduleModules, type ScheduleModule } from '../../../schedule/modules';
import { groupIdentifier, numberedGroupFamily, type ChoiceOffer } from '../model/offerVariants';
import { buildModuleChoices } from '../model/moduleChoices';
import type { ModuleSelectionProps } from '../model/types';

/** Per-profile draft; commits only through save(). */
export function useModuleSelection({ settings, modules, entries, onChange }: ModuleSelectionProps) {
  const selection = settings.scheduleSource === 'dhbw-api' ? settings.apiSelection : null;
  const [catalog, setCatalog] = useState<DhbwCourse[]>([]);
  const [groups, setGroups] = useState((selection?.additionalCourses ?? []).filter(c => groupSource(c)));
  const [hidden, setHidden] = useState(settings.hiddenModules);
  const [selected, setSelected] = useState(() => [...new Set([
    ...(selection?.selectedOptionalModules ?? modules.filter(m => isChoiceModule(m.key, selection?.course, modules.map(item => item.label)) && !settings.hiddenModules.includes(m.key)).map(m => m.key)),
    ...(selection?.selectedAdditionalModules ?? []),
  ])]);
  const [loaded, setLoaded] = useState<Record<string, ScheduleModule[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [dirty, setDirty] = useState(false);
  const suggestions = useMemo(() => selection ? suggestedCourses(selection, catalog) : [], [selection, catalog]);
  const configuredExtras = selection?.additionalCourses ?? [];
  const base = useMemo(() => entries && selection
    ? listScheduleModules(entries.filter(e => !configuredExtras.includes(e.course ?? '')))
    : modules, [entries, modules, selection]);

  // Known shared plans are read automatically. Users choose offers, never technical sources.
  const loadOffers = async () => {
    if (!selection) return;
    setLoading(true); setError('');
    try {
      const available = await courseCatalog(selection.site);
      const pools = [...new Set([
        ...suggestedCourses(selection, available).filter(c => !groupSource(c.name)).map(c => c.name),
        ...configuredExtras,
      ])];
      const values = await Promise.all(pools.map(async course => {
        const result = await getCourseSchedule(course);
        return [course, result.entries] as const;
      }));
      setCatalog(available);
      setLoaded(Object.fromEntries(values.map(([course, values]) => [course, listScheduleModules(values)])));
    } catch { setError('Angebote konnten nicht vollständig geladen werden. Deine gespeicherte Auswahl bleibt erhalten.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void loadOffers(); }, [selection?.site, selection?.course]);

  const groupModules = groups.flatMap(c => loaded[c] ?? listScheduleModules((entries ?? []).filter(e => e.course === c)));
  const { poolSources, poolModules, all, extraKeys, baseKeys, choices, common, categoryOf } = buildModuleChoices(base, loaded, groupModules, selection?.course);
  const matches = (m: ScheduleModule) => m.label.toLocaleLowerCase('de').includes(query.trim().toLocaleLowerCase('de'));
  const visibleChoices = choices.filter(matches).sort((a, b) => a.label.localeCompare(b.label, 'de'));
  const visibleCommon = common.filter(matches);
  const optionsKey = studyOptionsKey(suggestions.map(c => c.name), [...base, ...poolModules].map(m => m.label), selection?.course);
  const needsSetup = Boolean(selection && optionsKey && !loading && !error && selection.optionsConfiguredKey !== optionsKey);
  const isChosen = (offer: ChoiceOffer) => offer.memberKeys.some(key => selected.includes(key) && !hidden.includes(key));
  const chosenCount = choices.filter(isChosen).length;
  const setChoice = (key: string, checked: boolean) => {
    const offer = choices.find(item => item.key === key);
    if (!offer) return;
    const family = numberedGroupFamily(offer.label);
    const replaced = new Set(choices.filter(item => checked && family && numberedGroupFamily(item.label) === family && groupIdentifier(item.label) !== groupIdentifier(offer.label)).flatMap(item => item.memberKeys));
    setSelected(prev => checked
      ? [...new Set([...prev.filter(item => !replaced.has(item)), ...offer.memberKeys])]
      : prev.filter(item => !offer.memberKeys.includes(item)));
    if (checked) setHidden(prev => prev.filter(item => !offer.memberKeys.includes(item)));
    setDirty(true);
  };
  const chooseGroup = async (course: string) => {
    if (loading) return;
    const family = groupSource(course);
    if (groups.includes(course)) { setGroups(groups.filter(c => c !== course)); setDirty(true); return; }
    setLoading(true); setError('');
    try {
      const result = await getCourseSchedule(course);
      const values = listScheduleModules(result.entries);
      if (!values.length) { setError('Für diese Gruppe sind noch keine Termine verfügbar.'); return; }
      const replaced = groups.filter(c => groupSource(c) === family);
      const oldKeys = new Set(replaced.flatMap(c => (loaded[c] ?? []).map(m => m.key)));
      setLoaded(prev => ({ ...prev, [course]: values }));
      setGroups(prev => [...prev.filter(c => groupSource(c) !== family), course]);
      setSelected(prev => [...new Set([...prev.filter(k => !oldKeys.has(k)), ...values.map(m => m.key)])]);
      setDirty(true);
    } catch { setError('Gruppentermine konnten nicht geladen werden. Bitte erneut versuchen.'); }
    finally { setLoading(false); }
  };
  const save = () => {
    const selectedSet = new Set(selected.filter(key => !hidden.includes(key)));
    for (const offer of choices.filter(isChosen)) {
      for (const key of offer.memberKeys) if (!hidden.includes(key)) selectedSet.add(key);
    }
    const pools = poolSources.filter(c => loaded[c].some(m => selectedSet.has(m.key) || !categoryOf(m)));
    const extraCourses = [...new Set([...groups, ...pools])];
    onChange({ ...settings,
      hiddenModules: selection ? hidden : [...new Set([...hidden.filter(key => !selectedSet.has(key)), ...choices.filter(m => !m.memberKeys.some(key => selectedSet.has(key))).flatMap(m => m.memberKeys)])],
      ...(selection ? { apiSelection: { ...selection, additionalCourses: extraCourses,
        selectedAdditionalModules: [...selectedSet].filter(k => extraKeys.has(k)),
        selectedOptionalModules: [...selectedSet].filter(k => baseKeys.has(k) && Boolean(categoryOf(all.get(k)!))),
        optionsConfiguredKey: optionsKey,
        optionsNoticeSeen: true } } : {}),
    });
    setDirty(false);
  };
  const toggleCommon = (key: string, checked: boolean) => {
    setHidden(prev => checked ? prev.filter(k => k !== key) : [...new Set([...prev, key])]);
    setDirty(true);
  };
  const clearSelection = () => { setSelected([]); setGroups([]); setDirty(true); };
  const discard = () => {
    setGroups(configuredExtras.filter(c => groupSource(c)));
    setSelected([...new Set([...(selection?.selectedOptionalModules ?? base.filter(m => isChoiceModule(m.key, selection?.course, base.map(item => item.label)) && !settings.hiddenModules.includes(m.key)).map(m => m.key)), ...(selection?.selectedAdditionalModules ?? [])])]);
    setHidden(settings.hiddenModules);
    setDirty(false);
  };
  return { suggestions, groups, loading, choices, chosenCount, query, setQuery, needsSetup, error, loadOffers,
    visibleChoices, categoryOf, selected, hidden, common, visibleCommon, chooseGroup, save, dirty,
    setChoice, isChosen, toggleCommon, clearSelection, discard };
}
