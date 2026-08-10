import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

const mocks = vi.hoisted(() => ({
  native: true,
  prefs: new Map<string, string>(),
  secureSet: vi.fn(async () => {}),
  secureGet: vi.fn(async () => ({ value: null as string | null })),
  secureRemove: vi.fn(async () => {}),
  login: vi.fn(async (_credentials: { username: string; password: string }) => {}),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mocks.native,
  },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: mocks.prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => {
      mocks.prefs.set(key, value);
    },
  },
}));

vi.mock('@dhbw/capacitor-secure-storage', () => ({
  SecureStorage: {
    get: mocks.secureGet,
    set: mocks.secureSet,
    remove: mocks.secureRemove,
  },
}));

vi.mock('../src/dualis/client', () => ({
  DualisError: class DualisError extends Error {},
  DualisClient: class DualisClient {
    setSite() {}
    login(credentials: { username: string; password: string }) {
      return mocks.login(credentials);
    }
    async logout() {}
    async loadDashboard() {
      return { summary: null, modules: [], semesters: [] };
    }
    async loadSemester() {
      return { name: '', modules: [] };
    }
  },
}));

import { isSecureStorageAvailable, saveStoredDualisCredentials } from '../src/store/dualis';
import { CREDENTIALS_NOT_STORED_NOTICE, useDualis, type UseDualis } from '../src/ui/useDualis';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Rendert den Hook ohne Testbibliothek und gibt seinen jeweils aktuellen Wert zurück. */
async function renderDualis(): Promise<() => UseDualis> {
  let latest: UseDualis | null = null;
  const Probe = () => {
    latest = useDualis('RV');
    return null;
  };
  const root = createRoot(document.createElement('div'));
  await act(async () => {
    root.render(createElement(Probe));
  });
  return () => {
    if (!latest) throw new Error('Hook wurde nicht gerendert.');
    return latest;
  };
}

describe('secure credential storage', () => {
  beforeEach(() => {
    mocks.native = true;
    mocks.prefs.clear();
    mocks.secureSet.mockClear();
    mocks.secureSet.mockImplementation(async () => {});
    mocks.login.mockClear();
  });

  it('is only offered where a keystore exists', () => {
    expect(isSecureStorageAvailable()).toBe(true);
    mocks.native = false;
    expect(isSecureStorageAvailable()).toBe(false);
  });

  it('reports a failing keystore instead of throwing', async () => {
    mocks.secureSet.mockRejectedValueOnce(new Error('keystore unavailable'));

    await expect(saveStoredDualisCredentials({ username: 'a', password: 'b', site: 'RV' })).resolves.toBe(false);
  });

  it('keeps a login successful and explains the unsaved credentials as a notice', async () => {
    mocks.secureSet.mockRejectedValueOnce(new Error('keystore unavailable'));
    const dualis = await renderDualis();

    await act(async () => {
      await dualis().login({ username: 'student', password: 'secret' }, true, true);
    });

    expect(dualis().loginState).toBe('logged-in');
    expect(dualis().notice).toBe(CREDENTIALS_NOT_STORED_NOTICE);
    expect(dualis().error).toBeNull();
    // Ohne gespeicherte Zugangsdaten darf der Wiederherstellungsversuch beim
    // nächsten Start nicht scheitern, deshalb bleibt die Einstellung aus.
    expect(dualis().prefs.rememberCredentials).toBe(false);
  });

  it('leaves no notice when the credentials are stored', async () => {
    const dualis = await renderDualis();

    await act(async () => {
      await dualis().login({ username: 'student', password: 'secret' }, true, true);
    });

    expect(dualis().notice).toBeNull();
    expect(dualis().prefs.rememberCredentials).toBe(true);
    expect(mocks.secureSet).toHaveBeenCalledOnce();
  });
});
