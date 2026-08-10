import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DualisClient, DualisError } from '../dualis/client';
import { DualisCredentials, DualisDashboard, DualisExam, DualisLoginState, DualisModule } from '../dualis/types';
import {
  clearStoredDualisCredentials,
  DEFAULT_DUALIS_PREFS,
  DualisPrefs,
  loadDualisPrefs,
  loadStoredDualisCredentials,
  saveDualisPrefs,
  saveStoredDualisCredentials,
} from '../store/dualis';
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
  /** Sachlicher Hinweis ohne Fehlercharakter, etwa nach erfolgreicher Anmeldung. */
  notice: string | null;
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
    notice: null,
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

/**
 * Kein Fehler: Die Anmeldung hat funktioniert, nur der Keystore beziehungsweise
 * die Keychain hat die Zugangsdaten nicht angenommen.
 */
export const CREDENTIALS_NOT_STORED_NOTICE =
  'Anmeldung erfolgreich. Deine Zugangsdaten konnten auf diesem Gerät nicht gespeichert werden — beim nächsten Start musst du dich erneut anmelden.';

function storedLoginMessage(error: unknown): string {
  if (error instanceof DualisError && error.reason === 'login-failed') {
    return 'Die gespeicherte Dualis-Anmeldung ist nicht mehr gültig. Bitte erneut anmelden.';
  }
  return 'Die gespeicherte Dualis-Anmeldung konnte nicht wiederhergestellt werden. Bitte später erneut versuchen.';
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
  const siteChangePromiseRef = useRef(Promise.resolve());
  const restoreAttemptRef = useRef<string | null>(null);

  useEffect(() => {
    if (demo || previousSiteRef.current === activeSite) return;
    previousSiteRef.current = activeSite;
    client.setSite(activeSite);
    const logoutPromise = client.logout();
    siteChangePromiseRef.current = logoutPromise;
    void logoutPromise.then(() => {
      setState((current) => ({
        ...loggedOutState(),
        prefs: current.prefs,
      }));
    });
  }, [activeSite, client, demo]);

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

  useEffect(() => {
    if (demo) return;
    let cancelled = false;

    const restore = async () => {
      const prefs = await loadDualisPrefs();
      if (cancelled) return;
      setState((current) => ({ ...current, prefs }));

      if (!prefs.rememberCredentials) return;
      const stored = await loadStoredDualisCredentials();
      if (cancelled || !stored || stored.site !== activeSite) return;

      const restoreKey = `${stored.site}:${stored.username}`;
      if (restoreAttemptRef.current === restoreKey) return;
      restoreAttemptRef.current = restoreKey;

      await siteChangePromiseRef.current;
      if (cancelled) return;

      client.setSite(activeSite);
      setState((current) => ({
        ...current,
        loginState: 'logging-in',
        loading: true,
        error: null,
      }));

      try {
        await client.login({ username: stored.username, password: stored.password });
        if (cancelled) {
          await client.logout();
          return;
        }
        setState((current) => ({ ...current, loginState: 'logged-in', loading: false }));
        await loadDashboard();
      } catch (error) {
        if (error instanceof DualisError && error.reason === 'login-failed') {
          await clearStoredDualisCredentials();
        }
        if (!cancelled) {
          setState((current) => ({
            ...current,
            loginState: 'failed',
            loading: false,
            error: storedLoginMessage(error),
          }));
        }
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [activeSite, client, demo, loadDashboard]);

  const login = useCallback(
    async (credentials: DualisCredentials, rememberUsername: boolean, rememberCredentials: boolean) => {
      if (demo) return;
      if (isReviewDemoCredentials(credentials)) {
        // Kein Netzwerkzugriff und keine Persistenz: Dies sind ausschließlich
        // statische Beispieldaten für die App Review.
        setReviewDemo(true);
        setState(APP_STORE_DEMO_DUALIS);
        return;
      }
      client.setSite(activeSite);
      setState((current) => ({ ...current, loginState: 'logging-in', loading: true, error: null, notice: null }));
      try {
        await client.login(credentials);
        const credentialsStored = rememberCredentials
          ? await saveStoredDualisCredentials({ ...credentials, site: activeSite })
          : (await clearStoredDualisCredentials(), true);
        const prefs = { username: credentials.username, rememberUsername, rememberCredentials: credentialsStored };
        await saveDualisPrefs(prefs);
        setState((current) => ({ ...current, loginState: 'logged-in', prefs }));
        await loadDashboard();
        if (rememberCredentials && !credentialsStored) {
          setState((current) => ({ ...current, notice: CREDENTIALS_NOT_STORED_NOTICE }));
        }
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
    await clearStoredDualisCredentials();
    const prefs = { ...state.prefs, rememberCredentials: false };
    await saveDualisPrefs(prefs);
    setState((current) => ({
      ...current,
      loginState: 'logged-out',
      prefs,
      dashboard: null,
      selectedSemester: '',
      semesterModules: [],
      moduleExams: {},
      loading: false,
      error: null,
      notice: null,
    }));
  }, [client, demo, reviewDemo, state.prefs]);

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
