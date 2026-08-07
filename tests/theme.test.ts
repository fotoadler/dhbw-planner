import { describe, expect, it } from 'vitest';
import { isThemeMode, resolveTheme } from '../src/lib/theme';

describe('Theme-Modus', () => {
  it('akzeptiert nur Auto, Hell und Dunkel', () => {
    expect(isThemeMode('auto')).toBe(true);
    expect(isThemeMode('light')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);
    expect(isThemeMode('system')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
  });

  it('folgt im Auto-Modus dem System', () => {
    expect(resolveTheme('auto', 'light')).toBe('light');
    expect(resolveTheme('auto', 'dark')).toBe('dark');
  });

  it('ignoriert das System bei manueller Auswahl', () => {
    expect(resolveTheme('light', 'dark')).toBe('light');
    expect(resolveTheme('dark', 'light')).toBe('dark');
  });
});
