import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

export type ThemeMode = 'auto' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'dhbw-planner-theme-mode';

const LIGHT_STATUS_BAR_BACKGROUND = '#ffffff';
const DARK_STATUS_BAR_BACKGROUND = '#101318';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'auto' || value === 'light' || value === 'dark';
}

export function readThemeHint(): ThemeMode {
  if (typeof window === 'undefined') return 'auto';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

export function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveTheme(mode: ThemeMode, system: ResolvedTheme = systemTheme()): ResolvedTheme {
  return mode === 'auto' ? system : mode;
}

async function syncNativeStatusBar(theme: ResolvedTheme): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? DARK_STATUS_BAR_BACKGROUND : LIGHT_STATUS_BAR_BACKGROUND,
    });
  } catch {
    // The web fallback and native theme defaults still keep the UI usable if
    // the platform plugin is unavailable during an early app launch.
  }
}

export function applyTheme(mode: ThemeMode, system: ResolvedTheme = systemTheme()): ResolvedTheme {
  const resolved = resolveTheme(mode, system);
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Preferences remains the durable source of truth.
  }
  void syncNativeStatusBar(resolved);
  return resolved;
}

export function bootstrapTheme(): void {
  applyTheme(readThemeHint());
}
