import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DualisClient, DualisError } from '../dualis/client';
import { DualisCredentials, DualisDashboard, DualisExam, DualisLoginState, DualisModule } from '../dualis/types';
import { DEFAULT_DUALIS_PREFS, DualisPrefs, loadDualisPrefs, saveDualisPrefs } from '../store/dualis';
import { APP_STORE_DEMO_DUALIS, isAppStoreDemo } from '../demo/appStoreDemo';
import { isReviewDemoCredentials } from '../demo/reviewDemo';
import { normalizeSiteCode } from '../dhbw/siteConfiguration';

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

function loggedOutState(): DualisState {
  return {
    loginState: 'logged-out',
    prefs: DEFAULT_DUALIS_PREFS,
    dashboard: null,
    selectedSemester: '',
    semesterModules: [],
    moduleExams: {},
    loading: false,
    error: null,
  };
}

function userMessage(error: unknown): string {
  if (error instanceof DualisError) {
    if (error.reason === 'login-failed') return error.message;
    if (error.reason === 'missing-url') return 'Dualis hat eine erwartete Seite nicht geliefert.';
    if (error.reason === 'parse-failed') return 'Dualis sieht anders aus als erwartet. Die Daten konnten nicht gelesen werden.';
  }
  return 'Dualis ist gerade nicht erreichbar.';
}

export function useDualis(site?: string) {
  // Without a guided DHBW site (e.g. manual Rapla mode), never guess a
  // Ravensburg domain. The unknown-site profile requires the full address.
  const activeSite = normalizeSiteCode(site);
  const clientRef = useRef<DualisClient | null>(null);
  if (!clientRef.current) clientRef.current = new DualisClient(activeSite);
  const client = clientRef.current;
  const [reviewDemo, setReviewDemo] = useState(false);
  const demo = isAppStoreDemo() || reviewDemo;
  const [state, setState] = useState<DualisState>(() =>
    demo
      ? APP_STORE_DEMO_DUALIS
      : loggedOutState(),
  );

  const selectedSemesterRef = useRef('');
  selectedSemesterRef.current = state.selectedSemester;

  const previousSiteRef = useRef(activeSite);
  useEffect(() => {
    if (demo || previousSiteRef.current === activeSite) return;
    previousSiteRef.current = activeSite;
    client.setSite(activeSite);
    void client.logout();
    setState((current) => ({
      ...loggedOutState(),
      prefs: current.prefs,
    }));
  }, [activeSite, client, demo]);

  useEffect(() => {
    if (demo) return;
    void (async () => {
      const prefs = await loadDualisPrefs();
      setState((current) => ({ ...current, prefs }));
    })();
  }, [demo]);

  const loadDashboard = useCallback(async () => {
    if (demo) return;
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
  }, [demo]);

  const login = useCallback(
    async (credentials: DualisCredentials, rememberUsername: boolean) => {
      if (demo) return;
      if (isReviewDemoCredentials(credentials)) {
        // Kein Netzwerkzugriff und keine Persistenz: Dies sind ausschließlich
        // statische Beispieldaten für die App Review.
        setReviewDemo(true);
        setState(APP_STORE_DEMO_DUALIS);
        return;
      }
      client.setSite(activeSite);
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
    [activeSite, client, demo, loadDashboard],
  );

  const logout = useCallback(async () => {
    if (reviewDemo) {
      setReviewDemo(false);
      setState(loggedOutState());
      return;
    }
    if (demo) return;
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
  }, [demo, reviewDemo]);

  const selectSemester = useCallback(async (name: string) => {
    if (demo) return;
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
  }, [demo]);

  const loadModuleExams = useCallback(async (module: DualisModule) => {
    if (demo) return;
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
  }, [demo]);

  return useMemo(
    () => ({ ...state, isReviewDemo: reviewDemo, login, logout, refresh: loadDashboard, selectSemester, loadModuleExams }),
    [loadDashboard, loadModuleExams, login, logout, reviewDemo, selectSemester, state],
  );
}

export type UseDualis = ReturnType<typeof useDualis>;
