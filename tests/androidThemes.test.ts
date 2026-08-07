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

/** Style-Name -> parent-Attribut (undefined, wenn keins gesetzt ist). */
function parseStyleParents(path: string): Map<string, string | undefined> {
  const doc = new DOMParser().parseFromString(readFileSync(path, 'utf8'), 'application/xml');
  const parents = new Map<string, string | undefined>();
  for (const style of Array.from(doc.querySelectorAll('style'))) {
    const name = style.getAttribute('name');
    if (!name) continue;
    parents.set(name, style.getAttribute('parent') ?? undefined);
  }
  return parents;
}

describe('Android-Themes', () => {
  const defaults = parseStyleParents(DEFAULT_STYLES);
  const night = parseStyleParents(NIGHT_STYLES);

  it('liest beide Style-Dateien ein', () => {
    expect(defaults.size).toBeGreaterThan(0);
    expect(night.size).toBeGreaterThan(0);
  });

  it('definiert jeden Night-Style auch in der Default-Variante', () => {
    for (const name of night.keys()) {
      expect(defaults.has(name), `${name} fehlt in ${DEFAULT_STYLES}`).toBe(true);
    }
  });

  it.each([...night.keys()])('setzt für %s im Dark Mode denselben parent wie am Tag', (name) => {
    // Ohne parent wird der Style zur Wurzel (bzw. erbt nur über die
    // Punkt-Notation) und verliert die AppCompat-Abstammung.
    expect(night.get(name)).toBeDefined();
    expect(night.get(name)).toBe(defaults.get(name));
  });

  it('leitet das Activity-Theme von Theme.AppCompat ab', () => {
    // BridgeActivity setzt AppTheme.NoActionBar und ruft danach
    // setContentView() — genau hier prüft AppCompat die Abstammung.
    for (const source of [defaults, night]) {
      expect(source.get('AppTheme.NoActionBar')).toMatch(/^Theme\.AppCompat\./);
    }
  });
});
