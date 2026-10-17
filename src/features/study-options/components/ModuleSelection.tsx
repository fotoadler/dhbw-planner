import { useEffect, useRef } from 'react';
import { groupSource } from '../../../dhbwApi/studyOptions';
import type { ChoiceOffer } from '../model/offerVariants';
import { useModuleSelection } from '../hooks/useModuleSelection';
import { sourceLabel } from '../model/presentation';
import type { ModuleSelectionProps } from '../model/types';
import { ChoiceRow } from './ChoiceRow';

export function ModuleSelection(props: ModuleSelectionProps) {
  const { initiallyOpen, setup = false } = props;
  const { suggestions, groups, loading, choices, chosenCount, query, setQuery, needsSetup, error, loadOffers,
    visibleChoices, categoryOf, hidden, common, visibleCommon, chooseGroup, save, dirty,
    setChoice, isChosen, toggleCommon, clearSelection, discard } = useModuleSelection(props);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (initiallyOpen) {
      details.current?.setAttribute('open', '');
      details.current?.scrollIntoView({ block: 'start' });
    }
  }, [initiallyOpen]);
  const choiceRow = (module: ChoiceOffer) => <ChoiceRow key={module.key} module={module}
    checked={isChosen(module)} onChange={checked => setChoice(module.key, checked)} />;
  const content = <>
    <div className="study-choice__content">
      {!setup && needsSetup && <p className="sheet__note">Deine Wahlangebote sind noch nicht vollständig eingerichtet.</p>}
      {(suggestions.some(c => groupSource(c.name)) || groups.length > 0) && <fieldset className="study-choice__groups">
        <legend>Deine Gruppe</legend>
        {[...new Set([...suggestions.filter(c => groupSource(c.name)).map(c => c.name), ...groups])].map(course => <label className="sheet__module study-choice__row" key={course}>
          <input type="checkbox" checked={groups.includes(course)} disabled={loading} onChange={() => void chooseGroup(course)} />
          <span>{sourceLabel(course)}</span>
        </label>)}
      </fieldset>}
      {(chosenCount > 0 || groups.length > 0) && <div className="study-choice__selection"><button type="button" className="sheet__textbtn" onClick={clearSelection}>Auswahl leeren</button></div>}
      {(choices.length > 0 || loading) && <>
        <input className="sheet__module-search" type="search" placeholder="Wahlangebote suchen" aria-label="Wahlkurse & Module suchen" value={query} onChange={e => setQuery(e.target.value)} />
      </>}
      {loading && <p className="sheet__note" role="status">Angebote werden geladen …</p>}
      {error && <p className="sheet__note" role="alert">{error} <button type="button" className="sheet__textbtn" onClick={() => void loadOffers()}>Erneut laden</button></p>}
      {['Wahlpflichtseminare', 'Übungen', 'Studienschwerpunkte', 'Wahlmodule', 'Gruppen', 'Weitere Angebote'].map(category => {
        const values = visibleChoices.filter(m => categoryOf(m) === category);
        const count = choices.filter(m => categoryOf(m) === category && isChosen(m)).length;
        return values.length > 0 && <details className="study-choice__category" key={category} open={query ? true : undefined}>
          <summary><span>{category}</span><span className={count ? 'study-choice__count study-choice__count--selected' : 'study-choice__count'}>{count} / {choices.filter(m => categoryOf(m) === category).length}</span></summary>
          <fieldset className="study-choice__offers"><legend className="sr-only">{category}</legend>{values.map(choiceRow)}</fieldset>
        </details>;
      })}
      {query && !visibleChoices.length && (setup || !visibleCommon.length) && <p className="sheet__note">Keine passenden Angebote gefunden.</p>}
      {setup && common.length > 0 && <p className="study-choice__included">Gemeinsame Termine sind enthalten.</p>}
      {!setup && common.length > 0 && <details className="study-choice__common">
        <summary>Übrige Module bearbeiten</summary>
        <p className="sheet__note">Nur ändern, wenn du von einem Modul befreit bist.</p>
        {visibleCommon.map(m => <label className="sheet__module" key={m.key}><input type="checkbox" checked={!hidden.includes(m.key)} onChange={e => toggleCommon(m.key, e.target.checked)} /><span>{m.label}</span></label>)}
      </details>}
      {!loading && !choices.length && !suggestions.some(c => groupSource(c.name)) && !error && <p className="sheet__note">Keine gesonderten Wahlangebote gefunden.</p>}
    </div>
    {(dirty || setup || needsSetup) && <div className="study-options__save"><button type="button" disabled={loading || Boolean(error)} onClick={save}>{setup ? 'Weiter zum Kalender' : 'Auswahl übernehmen'}</button>{!setup && <button type="button" onClick={discard}>Verwerfen</button>}</div>}
  </>;
  return setup ? <section className="study-choice study-choice--setup">{content}</section> : <details ref={details} className="sheet__module-picker study-choice" open={initiallyOpen || undefined}>
    <summary><span>Module auswählen</span><span className="sheet__module-picker-count">{needsSetup ? 'Noch einrichten' : `${chosenCount + groups.length} ausgewählt`}</span></summary>{content}
  </details>;
}
