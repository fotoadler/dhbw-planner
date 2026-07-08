import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DualisClient, DualisError } from '../dualis/client';
import { DualisCredentials, DualisDashboard, DualisExam, DualisLoginState, DualisModule } from '../dualis/types';
import { DEFAULT_DUALIS_PREFS, DualisPrefs, loadDualisPrefs, saveDualisPrefs } from '../store/dualis';

export interface DualisState {
  loginState: DualisLoginState;
  prefs: DualisPrefs;
  dashboard: DualisDashboard | null;
  selectedSemester: string;
  semesterModules: DualisModule[];
  moduleExams: Record<string, DualisExam[]>;
  loading: boolean;
  error: string | null;
}

const client = new DualisClient();

function userMessage(error: unknown): string {
  if (error instanceof DualisError) {
    if (error.reason === 'login-failed') return 'Anmeldung fehlgeschlagen. Prüfe Benutzername und Passwort.';
    if (error.reason === 'missing-url') return 'Dualis hat eine erwartete Seite nicht geliefert.';
    if (error.reason === 'parse-failed') return 'Dualis sieht anders aus als erwartet. Die Daten konnten nicht gelesen werden.';
  }
  return 'Dualis ist gerade nicht erreichbar.';
}

export function useDualis() {
  const [state, setState] = useState<DualisState>({
    loginState: 'logged-out',
    prefs: DEFAULT_DUALIS_PREFS,
    dashboard: null,
    selectedSemester: '',
    semesterModules: [],
    moduleExams: {},
    loading: false,
    error: null,
  });

  const selectedSemesterRef = useRef('');
  selectedSemesterRef.current = state.selectedSemester;

  useEffect(() => {
    void (async () => {
      const prefs = await loadDualisPrefs();
      setState((current) => ({ ...current, prefs }));
    })();
  }, []);

  const loadDashboard = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const dashboard = await client.loadDashboard();
      const selectedSemester = selectedSemesterRef.current || dashboard.semesters[0] || '';
      const semester = selectedSemester ? await client.loadSemester(selectedSemester) : null;
      setState((current) => ({
        ...current,
        dashboard,
        selectedSemester,
        semesterModules: semester?.modules ?? [],
        loading: false,
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: userMessage(error) }));
    }
  }, []);

  const login = useCallback(
    async (credentials: DualisCredentials, rememberUsername: boolean) => {
      setState((current) => ({ ...current, loginState: 'logging-in', loading: true, error: null }));
      try {
        await client.login(credentials);
        const prefs = { username: credentials.username, rememberUsername };
        await saveDualisPrefs(prefs);
        setState((current) => ({ ...current, loginState: 'logged-in', prefs }));
        await loadDashboard();
      } catch (error) {
        setState((current) => ({
          ...current,
          loginState: 'failed',
          loading: false,
          error: userMessage(error),
        }));
      }
    },
    [loadDashboard],
  );

  const logout = useCallback(async () => {
    await client.logout();
    setState((current) => ({
      ...current,
      loginState: 'logged-out',
      dashboard: null,
      selectedSemester: '',
      semesterModules: [],
      moduleExams: {},
      loading: false,
      error: null,
    }));
  }, []);

  const selectSemester = useCallback(async (name: string) => {
    setState((current) => ({ ...current, selectedSemester: name, loading: true, error: null }));
    try {
      const semester = await client.loadSemester(name);
      setState((current) => ({
        ...current,
        semesterModules: semester.modules,
        moduleExams: {},
        loading: false,
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: userMessage(error) }));
    }
  }, []);

  const loadModuleExams = useCallback(async (module: DualisModule) => {
    if (!module.detailsUrl) return;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const exams = await client.loadModuleExams(module);
      setState((current) => ({
        ...current,
        moduleExams: { ...current.moduleExams, [module.id]: exams },
        loading: false,
      }));
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: userMessage(error) }));
    }
  }, []);

  return useMemo(
    () => ({ ...state, login, logout, refresh: loadDashboard, selectSemester, loadModuleExams }),
    [loadDashboard, loadModuleExams, login, logout, selectSemester, state],
  );
}

export type UseDualis = ReturnType<typeof useDualis>;
