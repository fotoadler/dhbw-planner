import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getCourses, getSites, DhbwCourse, DhbwSite } from '../dhbwApi/client';
import { ApiSelection } from '../store/preferences';
import { LinkSetup } from './LinkSetup';
import { RaplaConfig } from '../rapla/client';
import { selectionHaptic } from '../lib/haptics';

type Step = 'site' | 'degree' | 'course' | 'manual';

interface Props {
  initialLink?: string;
  onSaveRapla: (link: string, config: RaplaConfig) => void;
  onSaveApi: (selection: ApiSelection) => void;
}

interface Choice {
  value: string;
  label: string;
  detail?: string;
}

const PICKER_ROW_HEIGHT = 96;

const SITE_LABELS: Record<string, string> = {
  CAS: 'Center for Advanced Studies',
  FN: 'Friedrichshafen',
  HDH: 'Heidenheim',
  HN: 'Heilbronn',
  HORB: 'Horb',
  KA: 'Karlsruhe',
  LÖR: 'Lörrach',
  MA: 'Mannheim',
  MGH: 'Bad Mergentheim',
  MOS: 'Mosbach',
  RV: 'Ravensburg',
  STG: 'Stuttgart',
  VS: 'Villingen-Schwenningen',
};

function siteLabel(site: DhbwSite): string {
  return SITE_LABELS[site.site] ?? site.site;
}

function degreeName(course: DhbwCourse): string {
  return course.degree?.name?.trim() || 'Weitere Studiengänge';
}

function PickerList({
  choices,
  onActiveChange,
  disabled = false,
}: {
  choices: Choice[];
  onActiveChange: (value: string) => void;
  disabled?: boolean;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexRef = useRef(0);
  const scrollFrameRef = useRef<number | null>(null);
  const onActiveChangeRef = useRef(onActiveChange);
  onActiveChangeRef.current = onActiveChange;

  const updateActiveIndex = () => {
    if (!pickerRef.current || choices.length === 0) return;
    const nextIndex = Math.max(
      0,
      Math.min(choices.length - 1, Math.round(pickerRef.current.scrollTop / PICKER_ROW_HEIGHT)),
    );
    if (nextIndex === activeIndexRef.current) return;
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    onActiveChange(choices[nextIndex].value);
    selectionHaptic();
  };

  const handleScroll = () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
    scrollFrameRef.current = requestAnimationFrame(() => {
      scrollFrameRef.current = null;
      updateActiveIndex();
    });
  };

  const scrollToChoice = (index: number) => {
    pickerRef.current?.scrollTo({ top: index * PICKER_ROW_HEIGHT, behavior: 'smooth' });
  };

  useEffect(() => () => {
    if (scrollFrameRef.current !== null) cancelAnimationFrame(scrollFrameRef.current);
  }, []);

  const firstChoiceValue = choices[0]?.value ?? '';
  const choiceSignature = choices.map((choice) => `${choice.value}\u001f${choice.label}\u001f${choice.detail ?? ''}`).join('\u001e');
  useEffect(() => {
    activeIndexRef.current = 0;
    setActiveIndex(0);
    pickerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    if (firstChoiceValue) onActiveChangeRef.current(firstChoiceValue);
  }, [choiceSignature, firstChoiceValue]);

  return (
    <div className="setup__picker-shell">
      <div className="setup__picker-fade setup__picker-fade--top" aria-hidden="true" />
      <div className="setup__picker-fade setup__picker-fade--bottom" aria-hidden="true" />
      <div className="setup__picker-focus" aria-hidden="true" />
      <div
        className="setup__picker"
        ref={pickerRef}
        onScroll={handleScroll}
        aria-label="Auswahl"
        role="listbox"
        aria-activedescendant={`picker-option-${activeIndex}`}
        tabIndex={0}
      >
        {choices.map((choice, index) => (
          <button
            className={`setup__picker-item${index === activeIndex ? ' is-active' : ''}`}
            id={`picker-option-${index}`}
            key={choice.value}
            type="button"
            onClick={() => scrollToChoice(index)}
            disabled={disabled}
            role="option"
            aria-selected={index === activeIndex}
          >
            <span className="setup__picker-copy">
              <span className="setup__picker-label">{choice.label}</span>
              {choice.detail && <span className="setup__picker-detail">{choice.detail}</span>}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PickerFooter({
  step,
  disabled,
  onConfirm,
  onManual,
}: {
  step: Step;
  disabled: boolean;
  onConfirm: () => void;
  onManual: () => void;
}) {
  return (
    <footer className="setup__footer">
      <button className="setup__confirm" type="button" onClick={onConfirm} disabled={disabled}>
        {step === 'course' ? 'Kurs auswählen' : 'Weiter'}
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
      </button>
      {step === 'site' && (
        <button className="setup__manual-link" type="button" onClick={onManual}>
          Rapla-Link verwenden
        </button>
      )}
    </footer>
  );
}

export function SetupWizard({ initialLink = '', onSaveRapla, onSaveApi }: Props) {
  const [step, setStep] = useState<Step>('site');
  const [sites, setSites] = useState<DhbwSite[]>([]);
  const [courses, setCourses] = useState<DhbwCourse[]>([]);
  const [site, setSite] = useState('');
  const [degree, setDegree] = useState('');
  const [activeChoice, setActiveChoice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const didLoadSites = useRef(false);

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const available = (await getSites())
        .filter((item) => item.lectures !== 'unavailable')
        .sort((a, b) => siteLabel(a).localeCompare(siteLabel(b), 'de'));
      setSites(available);
    } catch {
      setError('Standorte konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!didLoadSites.current) {
      didLoadSites.current = true;
      void loadSites();
    }
  }, [loadSites]);

  const degrees = useMemo(
    () => [...new Set(courses.map(degreeName))].sort((a, b) => a.localeCompare(b, 'de')),
    [courses],
  );

  const visibleCourses = useMemo(
    () => courses.filter((item) => degreeName(item) === degree).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [courses, degree],
  );

  const chooseSite = async (nextSite: string) => {
    if (loading) return;
    setSite(nextSite);
    setDegree('');
    setCourses([]);
    setError(null);
    setStep('degree');
    setLoading(true);
    try {
      setCourses(await getCourses(nextSite));
    } catch {
      setError('Studiengänge konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  const confirmCurrentChoice = (value: string) => {
    if (loading || !value) return;
    selectionHaptic();
    if (step === 'site') {
      void chooseSite(value);
    } else if (step === 'degree') {
      setDegree(value);
      setStep('course');
    } else {
      onSaveApi({ site, course: value, degree });
    }
  };

  const goBack = () => {
    selectionHaptic();
    setError(null);
    if (step === 'degree') setStep('site');
    if (step === 'course') setStep('degree');
  };

  if (step === 'manual') {
    return <LinkSetup initialLink={initialLink} onSave={onSaveRapla} onBack={() => { setError(null); setStep('site'); }} />;
  }

  const stepNumber = step === 'site' ? 1 : step === 'degree' ? 2 : 3;
  const selectedSite = sites.find((item) => item.site === site);
  const context = step === 'degree' ? (selectedSite ? siteLabel(selectedSite) : site) : degree;
  const choices: Choice[] =
    step === 'site'
      ? sites.map((item) => ({ value: item.site, label: siteLabel(item), detail: item.site }))
      : step === 'degree'
        ? degrees.map((item) => ({ value: item, label: item }))
        : visibleCourses.map((item) => ({ value: item.name, label: item.name }));

  return (
    <main className="setup setup--guided">
      <div className="setup__top">
        <div className="setup__brandline"><span className="setup__step">Schritt {stepNumber} von 3</span></div>
        {step !== 'site' && (
          <button className="setup__back" type="button" onClick={goBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
            Zurück
          </button>
        )}
        {context && <p className="setup__context">{context}</p>}
        <h1 className="setup__title">
          {step === 'site' && 'Wo studierst du?'}
          {step === 'degree' && 'Studiengang'}
          {step === 'course' && 'Kurs'}
        </h1>
        <div className="setup__progress" aria-label={`Schritt ${stepNumber} von 3`}>
          {[1, 2, 3].map((item) => <span className={item <= stepNumber ? 'is-active' : ''} key={item} />)}
        </div>
      </div>

      <section className="setup__content" aria-live="polite">
        {loading && choices.length === 0 ? (
          <div className="setup__loading">
            <span className="setup__spinner" aria-hidden="true" />
            <span>{step === 'site' ? 'Standorte' : step === 'degree' ? 'Studiengänge' : 'Kurse'} werden geladen</span>
          </div>
        ) : choices.length > 0 ? (
          <PickerList
            key={`${step}-${choices.length}-${choices[0]?.value ?? ''}`}
            choices={choices}
            onActiveChange={setActiveChoice}
            disabled={loading}
          />
        ) : (
          <div className="setup__empty">
            <p>{error ?? 'Keine Auswahl verfügbar.'}</p>
            {step === 'site' && <button type="button" onClick={() => void loadSites()}>Erneut laden</button>}
            {step === 'degree' && <button type="button" onClick={() => void chooseSite(site)}>Erneut laden</button>}
          </div>
        )}
        {error && choices.length > 0 && <p className="setup__error" role="alert">{error}</p>}
      </section>

      {choices.length > 0 && (
        <PickerFooter
          step={step}
          disabled={loading}
          onConfirm={() => confirmCurrentChoice(activeChoice || choices[0]?.value || '')}
          onManual={() => setStep('manual')}
        />
      )}
    </main>
  );
}
