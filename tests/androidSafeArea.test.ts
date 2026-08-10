/**
 * Android-WebViews melden über env(safe-area-inset-*) nur Display-Cutouts, nicht
 * Status- und Navigationsleiste. Das Layout stützt sich deshalb auf Werte, die
 * MainActivity nativ liest und in die Seite schreibt. Beide Enden dieser Kette
 * sind rein deklarativ und werden von keinem Laufzeittest berührt.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

const mainActivity = read('android/app/src/main/java/de/dhbw/raplaplan/MainActivity.java');
const styles = read('src/styles.css');

describe('android safe area insets', () => {
  it('schreibt die nativen Insets als CSS-Variablen in die Seite', () => {
    expect(mainActivity).toContain("setProperty('--inset-top'");
    expect(mainActivity).toContain("setProperty('--inset-bottom'");
    expect(mainActivity).toContain('WindowInsetsCompat.Type.systemBars()');
    expect(mainActivity).toContain('WindowInsetsCompat.Type.displayCutout()');
  });

  it('zieht bereits verrechnete Leisten ab, statt sie doppelt zu melden', () => {
    expect(mainActivity).toContain('getLocationInWindow');
    expect(mainActivity).toMatch(/Math\.max\(0,\s*bars\.top - position\[1\]\)/);
    expect(mainActivity).toMatch(/Math\.max\(0,\s*bars\.bottom - gapBelow\)/);
  });

  it('reicht die Insets nach, weil die Seite asynchron lädt', () => {
    expect(mainActivity).toContain('PUBLISH_DELAYS_MS');
    expect(mainActivity).toContain('postDelayed(publishInsets');
  });

  it('nutzt im CSS den größeren Wert aus env() und Variable', () => {
    expect(styles).toContain('--safe-top: max(env(safe-area-inset-top, 0px), var(--inset-top, 0px))');
    expect(styles).toContain(
      '--safe-bottom: max(env(safe-area-inset-bottom, 0px), var(--inset-bottom, 0px))',
    );
    // Kopfzeile und Tab-Leiste sind die Stellen, an denen die Leisten zuletzt
    // Text überdeckt haben.
    expect(styles).toMatch(/\.app \{[^}]*padding-top: var\(--safe-top\)/);
    expect(styles).toMatch(/\.tabbar \{[^}]*padding-bottom: var\(--safe-bottom\)/);
  });

  it('lässt keine direkten env()-Zugriffe außerhalb der Variablendefinition zurück', () => {
    const uses = styles.match(/env\(safe-area-inset-[a-z]+/g) ?? [];
    expect(uses).toHaveLength(2);
  });
});
