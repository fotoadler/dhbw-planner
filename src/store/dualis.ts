import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@dhbw/capacitor-secure-storage';

const DUALIS_PREFS_KEY = 'dualis.prefs.v1';
const DUALIS_CREDENTIALS_KEY = 'dualis.credentials.v1';

/**
 * SecureStorage ist ohne Web-Implementierung registriert: Keystore und Keychain
 * gibt es nur nativ. Im Browser darf das Speichern deshalb gar nicht erst
 * angeboten werden.
 */
export function isSecureStorageAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export interface DualisPrefs {
  username: string;
  rememberUsername: boolean;
  rememberCredentials: boolean;
}

export const DEFAULT_DUALIS_PREFS: DualisPrefs = {
  username: '',
  rememberUsername: false,
  rememberCredentials: false,
};

export interface StoredDualisCredentials {
  username: string;
  password: string;
  site: string;
}

export function parseStoredDualisCredentials(value: string | null | undefined): StoredDualisCredentials | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<StoredDualisCredentials>;
    if (
      typeof parsed.username !== 'string' ||
      typeof parsed.password !== 'string' ||
      typeof parsed.site !== 'string' ||
      !parsed.username ||
      !parsed.password
    ) {
      return null;
    }
    return { username: parsed.username, password: parsed.password, site: parsed.site };
  } catch {
    return null;
  }
}

export async function loadDualisPrefs(): Promise<DualisPrefs> {
  try {
    const { value } = await Preferences.get({ key: DUALIS_PREFS_KEY });
    if (!value) return DEFAULT_DUALIS_PREFS;
    const parsed = JSON.parse(value) as Partial<DualisPrefs>;
    return {
      username: typeof parsed.username === 'string' ? parsed.username : '',
      rememberUsername: parsed.rememberUsername === true,
      rememberCredentials: parsed.rememberCredentials === true,
    };
  } catch {
    return DEFAULT_DUALIS_PREFS;
  }
}

export async function saveDualisPrefs(prefs: DualisPrefs): Promise<void> {
  await Preferences.set({
    key: DUALIS_PREFS_KEY,
    value: JSON.stringify({
      rememberUsername: prefs.rememberUsername,
      username: prefs.rememberUsername ? prefs.username : '',
      rememberCredentials: prefs.rememberCredentials,
    }),
  });
}

export async function loadStoredDualisCredentials(): Promise<StoredDualisCredentials | null> {
  try {
    const { value } = await SecureStorage.get({ key: DUALIS_CREDENTIALS_KEY });
    return parseStoredDualisCredentials(value);
  } catch {
    // Im Browser gibt es absichtlich keinen Passwort-Fallback. Die App kann
    // dort weiterhin normal manuell angemeldet werden.
    return null;
  }
}

export async function saveStoredDualisCredentials(credentials: StoredDualisCredentials): Promise<boolean> {
  try {
    await SecureStorage.set({
      key: DUALIS_CREDENTIALS_KEY,
      value: JSON.stringify(credentials),
    });
    return true;
  } catch {
    return false;
  }
}

export async function clearStoredDualisCredentials(): Promise<void> {
  try {
    await SecureStorage.remove({ key: DUALIS_CREDENTIALS_KEY });
  } catch {
    // Das lokale Ausloggen darf nicht von einem bereits leeren Speicher abhängen.
  }
}
