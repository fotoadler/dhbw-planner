/**
 * Schützt die Android-Themes gegen einen Startup-Crash.
 *
 * Ressourcen-Qualifier ersetzen einen Style vollständig, sie mergen ihn nicht
 * mit der Default-Variante. Fehlt in values-night/styles.xml das
 * parent-Attribut, verliert der Style im Dark Mode jede Abstammung von
 * Theme.AppCompat — AppCompatActivity.setContentView() wirft dann
 * "You need to use a Theme.AppCompat theme (or descendant) with this activity."
 * und die App stürzt bei jedem Start ab (nur im Dark Mode, deshalb im
 * Hell-Modus nicht bemerkbar).
 *
 * Der Fehler ist rein deklarativ und wird weder vom TypeScript-Compiler noch
 * von lintVitalRelease erkannt, deshalb dieser Test.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const DEFAULT_STYLES = 'android/app/src/main/res/values/styles.xml';
const NIGHT_STYLES = 'android/app/src/main/res/values-night/styles.xml';

interface AndroidStyle {
  parent: string | undefined;
  items: Map<string, string>;
}

/** Style-Name -> parent-Attribut und enthaltene Items. */
function parseStyles(path: string): Map<string, AndroidStyle> {
  const doc = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'application/xml');
  const styles = new Map<string, AndroidStyle>();
  for (const style of Array.from(doc.querySelectorAll('style'))) {
    const name = style.getAttribute('name');
    if (!name) continue;
    const items = new Map<string, string>();
    for (const item of Array.from(style.querySelectorAll(':scope > item'))) {
      const itemName = item.getAttribute('name');
      if (itemName) items.set(itemName, item.textContent?.trim() ?? '');
    }
    styles.set(name, { parent: style.getAttribute('parent') ?? undefined, items });
  }
  return styles;
}

describe('Android-Themes', () => {
  const defaults = parseStyles(DEFAULT_STYLES);
  const night = parseStyles(NIGHT_STYLES);

  it('liest beide Style-Dateien ein', () => {
    expect(defaults.size).toBeGreaterThan(0);
    expect(night.size).toBeGreaterThan(0);
  });

  it('definiert jeden Night-Style auch in der Default-Variante', () => {
    for (const name of night.keys()) {
      expect(defaults.has(name), `${name} fehlt in ${DEFAULT_STYLES}`).toBe(true);
    }
  });

  it.each([...night.keys()])('setzt für %s im Dark Mode einen expliziten parent', (name) => {
    expect(night.get(name)?.parent).toBeDefined();
  });

  it('leitet die App- und Activity-Themes von Theme.AppCompat ab', () => {
    for (const source of [defaults, night]) {
      expect(source.get('AppTheme')?.parent).toMatch(/^Theme\.AppCompat\./);
      // BridgeActivity setzt AppTheme.NoActionBar und ruft danach
      // setContentView() — genau hier prüft AppCompat die Abstammung.
      expect(source.get('AppTheme.NoActionBar')?.parent).toMatch(/^Theme\.AppCompat\./);
    }
  });

  it('behält im Dark Mode die vollständige Splashscreen-Konfiguration', () => {
    const launch = night.get('AppTheme.NoActionBarLaunch');
    expect(launch?.parent).toBe('Theme.SplashScreen');
    expect(launch?.items.get('postSplashScreenTheme')).toBe('@style/AppTheme.NoActionBar');
    expect(launch?.items.get('windowSplashScreenAnimatedIcon')).toBe('@mipmap/ic_launcher');
  });

  it('behält die strukturellen NoActionBar-Eigenschaften im Dark Mode', () => {
    const noActionBar = night.get('AppTheme.NoActionBar');
    for (const item of ['windowActionBar', 'windowNoTitle', 'android:background']) {
      expect(noActionBar?.items.get(item), `${item} fehlt in ${NIGHT_STYLES}`).toBe(
        defaults.get('AppTheme.NoActionBar')?.items.get(item),
      );
    }
  });
});
