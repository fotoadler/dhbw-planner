import { Preferences } from '@capacitor/preferences';

const DUALIS_PREFS_KEY = 'dualis.prefs.v1';

export interface DualisPrefs {
  username: string;
  rememberUsername: boolean;
}

export const DEFAULT_DUALIS_PREFS: DualisPrefs = {
  username: '',
  rememberUsername: false,
};

export async function loadDualisPrefs(): Promise<DualisPrefs> {
  try {
    const { value } = await Preferences.get({ key: DUALIS_PREFS_KEY });
    if (!value) return DEFAULT_DUALIS_PREFS;
    return { ...DEFAULT_DUALIS_PREFS, ...(JSON.parse(value) as Partial<DualisPrefs>) };
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
    }),
  });
}
