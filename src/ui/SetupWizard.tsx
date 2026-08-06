import { useCallback, useMemo, useState } from 'react';
import { getCourses, getSites, DhbwCourse, DhbwSite } from '../dhbwApi/client';
import { ApiSelection } from '../store/preferences';
import { LinkSetup } from './LinkSetup';
import { RaplaConfig } from '../rapla/client';

type Step = 'mode' | 'site' | 'degree' | 'course' | 'manual';

interface Props {
  initialLink?: string;
  onSaveRapla: (link: string, config: RaplaConfig) => void;
  onSaveApi: (selection: ApiSelection) => void;
}

const SITE_LABELS: Record<string, string> = {
  CAS: 'Center for Advanced Studies',
  FN: 'Friedrichshafen',
  HDH: 'Heidenheim',
  HN: 'Heilbronn',
  HORB: 'Horb',
  KA: 'Karlsruhe',
  LÖR: 'Lörrach',
  MA: 'Mannheim',
  MGH: 'Mosbach',
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

export function SetupWizard({ initialLink = '', onSaveRapla, onSaveApi }: Props) {
  const [step, setStep] = useState<Step>('mode');
  const [sites, setSites] = useState<DhbwSite[]>([]);
  const [courses, setCourses] = useState<DhbwCourse[]>([]);
  const [site, setSite] = useState('');
  const [degree, setDegree] = useState('');
  const [course, setCourse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const available = (await getSites())
        .filter((item) => item.lectures !== 'unavailable')
        .sort((a, b) => siteLabel(a).localeCompare(siteLabel(b), 'de'));
      setSites(available);
    } catch {
      setError('Die Standorte konnten gerade nicht geladen werden. Du kannst alternativ den Rapla-Link verwenden.');
    } finally {
      setLoading(false);
    }
  }, []);

  const degrees = useMemo(
    () => [...new Set(courses.map(degreeName))].sort((a, b) => a.localeCompare(b, 'de')),
    [courses],
  );

  const visibleCourses = useMemo(
    () => courses.filter((item) => degreeName(item) === degree).sort((a, b) => a.name.localeCompare(b.name, 'de')),
    [courses, degree],
  );

  const chooseSite = async (nextSite: string) => {
    setSite(nextSite);
    setDegree('');
    setCourse('');
    if (!nextSite) {
      setCourses([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setCourses(await getCourses(nextSite));
      setStep('degree');
    } catch {
      setCourses([]);
      setError('Die Studiengänge konnten gerade nicht geladen werden. Bitte versuche es erneut oder nutze den Rapla-Link.');
    } finally {
      setLoading(false);
    }
  };

  const chooseDegree = (nextDegree: string) => {
    setDegree(nextDegree);
    setCourse('');
    if (nextDegree) setStep('course');
  };

  const chooseCourse = (nextCourse: string) => {
    setCourse(nextCourse);
    if (nextCourse) {
      onSaveApi({ site, course: nextCourse, degree });
    }
  };

  const startGuidedMode = async () => {
    setStep('site');
    if (sites.length === 0) await loadSites();
  };

  if (step === 'manual') {
    return <LinkSetup initialLink={initialLink} onSave={onSaveRapla} onBack={() => setStep('mode')} />;
  }

  return (
    <div className="setup">
      <p className="setup__eyebrow">DHBW Plan</p>
      <h1 className="setup__title">
        {step === 'mode' ? 'Stundenplan einrichten' : 'Kurs auswählen'}
      </h1>

      {step === 'mode' ? (
        <>
          <p className="setup__hint">Wähle, wie du deinen Stundenplan verbinden möchtest.</p>
          <div className="setup__choices">
            <button className="setup__choice setup__choice--recommended" onClick={() => void startGuidedMode()}>
              <span className="setup__choice-title">Geführter Modus <small>Empfohlen</small></span>
              <span className="setup__choice-text">Standort, Studiengang und Kurs auswählen — ganz ohne Rapla-Link.</span>
            </button>
            <button className="setup__choice" onClick={() => setStep('manual')}>
              <span className="setup__choice-title">Manueller Modus <small>Rapla</small></span>
              <span className="setup__choice-text">Deinen vorhandenen Rapla-Link einfügen und direkt loslegen.</span>
            </button>
          </div>
          {error && <p className="setup__error">{error}</p>}
        </>
      ) : (
        <>
          <button className="setup__back" onClick={() => setStep(step === 'site' ? 'mode' : step === 'degree' ? 'site' : 'degree')}>
            ← Zurück
          </button>
          <p className="setup__hint">
            {step === 'site' && 'Wähle zuerst deinen DHBW-Standort.'}
            {step === 'degree' && `Studiengänge in ${SITE_LABELS[site] ?? site}`}
            {step === 'course' && `${degree} — jetzt deinen Kurs auswählen.`}
          </p>

          {step === 'site' && (
            <label className="setup__field">
              <span>Standort</span>
              <select className="setup__select" value={site} onChange={(event) => void chooseSite(event.target.value)} disabled={loading}>
                <option value="">Standort auswählen …</option>
                {sites.map((item) => (
                  <option key={item.site} value={item.site}>{siteLabel(item)}</option>
                ))}
              </select>
            </label>
          )}

          {step === 'degree' && (
            <label className="setup__field">
              <span>Studienfach</span>
              <select className="setup__select" value={degree} onChange={(event) => chooseDegree(event.target.value)} disabled={loading}>
                <option value="">Studienfach auswählen …</option>
                {degrees.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          )}

          {step === 'course' && (
            <label className="setup__field">
              <span>Kurs</span>
              <select className="setup__select" value={course} onChange={(event) => chooseCourse(event.target.value)} disabled={loading}>
                <option value="">Kurs auswählen …</option>
                {visibleCourses.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
              </select>
            </label>
          )}

          {loading && <p className="setup__status">Lade Auswahl …</p>}
          {error && <p className="setup__error">{error}</p>}
          {step === 'site' && !loading && sites.length === 0 && (
            <button className="setup__secondary" onClick={() => setStep('manual')}>Rapla-Link manuell einfügen</button>
          )}
          {step === 'degree' && !loading && degrees.length === 0 && (
            <p className="setup__status">Für diesen Standort sind derzeit keine Studiengänge verfügbar.</p>
          )}
          {step === 'course' && !loading && visibleCourses.length === 0 && (
            <p className="setup__status">Für diesen Studiengang sind derzeit keine Kurse verfügbar.</p>
          )}
        </>
      )}
    </div>
  );
}
