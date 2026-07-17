import { useState } from 'react';
import { DualisModule } from '../dualis/types';
import { UseDualis } from './useDualis';

interface DualisViewProps {
  dualis: UseDualis;
  /** Unteransicht wird in App gehalten, damit sie den Tab-Wechsel überlebt. */
  page: 'overview' | 'exams';
}

export function DualisView({ dualis, page }: DualisViewProps) {
  if (dualis.loginState !== 'logged-in') {
    return (
      <DualisLogin
        initialUsername={dualis.prefs.username}
        initialRememberUsername={dualis.prefs.rememberUsername}
        loading={dualis.loginState === 'logging-in' || dualis.loading}
        error={dualis.error}
        onLogin={dualis.login}
      />
    );
  }

  return (
    <div className="dualis">
      {dualis.error && <p className="dualis__notice">{dualis.error}</p>}

      {page === 'overview' ? (
        <DualisOverview
          loading={dualis.loading}
          summary={dualis.dashboard?.summary ?? null}
          modules={dualis.dashboard?.modules ?? []}
          onRefresh={dualis.refresh}
        />
      ) : (
        <DualisExams
          loading={dualis.loading}
          semesters={dualis.dashboard?.semesters ?? []}
          selectedSemester={dualis.selectedSemester}
          modules={dualis.semesterModules}
          moduleExams={dualis.moduleExams}
          onSelectSemester={dualis.selectSemester}
          onLoadModule={dualis.loadModuleExams}
        />
      )}
    </div>
  );
}

interface LoginProps {
  initialUsername: string;
  initialRememberUsername: boolean;
  loading: boolean;
  error: string | null;
  onLogin: (credentials: { username: string; password: string }, rememberUsername: boolean) => Promise<void>;
}

function DualisLogin({ initialUsername, initialRememberUsername, loading, error, onLogin }: LoginProps) {
  const [username, setUsername] = useState(initialUsername);
  const [password, setPassword] = useState('');
  const [rememberUsername, setRememberUsername] = useState(initialRememberUsername);

  const submit = () => {
    if (!username.trim() || !password) return;
    void onLogin({ username: username.trim(), password }, rememberUsername);
  };

  return (
    <div className="dualis dualis--login">
      <div className="dualis-login">
        <h2>Dualis anmelden</h2>
        <p>
          Prüfungsleistungen und Modulnoten werden direkt von Dualis geladen. Du kannst dein Kürzel
          eingeben; die Ravensburger Dualis-Adresse wird automatisch ergänzt.
        </p>

        <label className="sheet__label" htmlFor="dualis-user">
          Benutzername
        </label>
        <input
          id="dualis-user"
          className="sheet__input"
          value={username}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={loading}
          onChange={(event) => setUsername(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />

        <label className="sheet__label" htmlFor="dualis-password">
          Passwort
        </label>
        <input
          id="dualis-password"
          className="sheet__input"
          type="password"
          value={password}
          disabled={loading}
          onChange={(event) => setPassword(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && submit()}
        />

        <label className="dualis-login__check">
          <span>Benutzername merken</span>
          <input
            type="checkbox"
            checked={rememberUsername}
            disabled={loading}
            onChange={(event) => setRememberUsername(event.target.checked)}
          />
        </label>

        {error && <p className="setup__error">{error}</p>}

        <button className="setup__button" disabled={loading || !username.trim() || !password} onClick={submit}>
          {loading ? 'Melde an …' : 'Anmelden'}
        </button>
      </div>
    </div>
  );
}

interface OverviewProps {
  loading: boolean;
  summary: {
    gpaTotal: number | null;
    gpaMainModules: number | null;
    creditsGained: number | null;
    creditsTotal: number | null;
  } | null;
  modules: DualisModule[];
  onRefresh: () => Promise<void>;
}

function DualisOverview({ loading, summary, modules, onRefresh }: OverviewProps) {
  return (
    <>
      <section className="dualis-metrics">
        <Metric value={formatValue(summary?.gpaTotal)} label="GPA gesamt" />
        <Metric value={formatValue(summary?.gpaMainModules)} label="Hauptmodule" />
        <Metric
          value={
            summary?.creditsGained != null && summary?.creditsTotal != null
              ? `${formatValue(summary?.creditsGained)} / ${formatValue(summary?.creditsTotal)}`
              : '–'
          }
          label="Credits"
        />
      </section>

      <div className="dualis__sectionhead">
        <h2>Modulnoten</h2>
        <button className="dualis__textbtn" disabled={loading} onClick={() => void onRefresh()}>
          Aktualisieren
        </button>
      </div>

      {loading && modules.length === 0 ? (
        <p className="dayview__empty">Lade Dualis …</p>
      ) : (
        <div className="dualis-table">
          <div className="dualis-table__head">
            <span>Modul</span>
            <span>Credits</span>
            <span>Note</span>
          </div>
          {modules.map((module) => (
            <ModuleRow key={module.id || module.name} module={module} />
          ))}
        </div>
      )}
    </>
  );
}

interface ExamsProps {
  loading: boolean;
  semesters: string[];
  selectedSemester: string;
  modules: DualisModule[];
  moduleExams: Record<string, Array<{ name: string; semester: string; grade: string }>>;
  onSelectSemester: (name: string) => Promise<void>;
  onLoadModule: (module: DualisModule) => Promise<void>;
}

function DualisExams({
  loading,
  semesters,
  selectedSemester,
  modules,
  moduleExams,
  onSelectSemester,
  onLoadModule,
}: ExamsProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = (module: DualisModule) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(module.id)) {
        next.delete(module.id);
      } else {
        next.add(module.id);
        if (!moduleExams[module.id]) void onLoadModule(module); // beim ersten Aufklappen laden
      }
      return next;
    });
  };

  return (
    <>
      <label className="dualis-select">
        <span>Semester</span>
        <select
          value={selectedSemester}
          disabled={loading}
          onChange={(event) => void onSelectSemester(event.target.value)}
        >
          {semesters.map((semester) => (
            <option key={semester} value={semester}>
              {semester}
            </option>
          ))}
        </select>
      </label>

      {loading && modules.length === 0 ? (
        <p className="dayview__empty">Lade Prüfungen …</p>
      ) : modules.length === 0 ? (
        <p className="dayview__empty">Keine Module in diesem Semester.</p>
      ) : (
        <div className="dualis-table">
          <div className="dualis-table__head">
            <span>Modul</span>
            <span>Credits</span>
            <span>Note</span>
          </div>
          {modules.map((module) => {
            const isOpen = expanded.has(module.id);
            const exams = moduleExams[module.id];
            return (
              <div className="dualis-module" key={module.id || module.name}>
                <button
                  className="dualis-module__button"
                  disabled={!module.detailsUrl || loading}
                  onClick={() => toggle(module)}
                >
                  <ModuleRow module={module} tappable={Boolean(module.detailsUrl)} expanded={isOpen} />
                </button>
                {isOpen && exams && (
                  <div className="dualis-exams">
                    {exams.length === 0 ? (
                      <p>Keine Einzelprüfungen gefunden.</p>
                    ) : (
                      exams.map((exam) => (
                        <div className="dualis-exam" key={`${module.id}-${exam.name}-${exam.semester}`}>
                          <span>{exam.name}</span>
                          <span>{exam.semester}</span>
                          <strong>{exam.grade || '–'}</strong>
                        </div>
                      ))
                    )}
                  </div>
                )}
                {isOpen && !exams && <div className="dualis-exams"><p>Lade …</p></div>}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="dualis-metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ModuleRow({ module, tappable = false, expanded = false }: {
  module: DualisModule;
  tappable?: boolean;
  expanded?: boolean;
}) {
  return (
    <div className={`dualis-mrow${tappable ? ' dualis-mrow--tap' : ''}${expanded ? ' is-expanded' : ''}`}>
      <span className="dualis-mrow__name">{module.name || module.id}</span>
      <span className="dualis-mrow__credits">{module.credits || ''}</span>
      <span className="dualis-mrow__grade">{module.grade || ''}</span>
      <span className="dualis-mrow__status">
        {module.passed ? (
          <svg className="dualis-mrow__check" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-label="bestanden">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : null}
      </span>
    </div>
  );
}

function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return '–';
  return new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 }).format(value);
}
