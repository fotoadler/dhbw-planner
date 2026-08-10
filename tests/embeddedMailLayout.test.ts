/**
 * Das native Layout ist nur auf einem Gerät vollständig prüfbar. Dieser Test
 * sichert deshalb bewusst schmal ab, dass die Inset-Logik überhaupt vorhanden
 * bleibt — er ersetzt keine Sichtprüfung auf Android 14 und Android 15+.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const androidEmbeddedMailPlugin = readFileSync(
  resolve(
    process.cwd(),
    'plugins/capacitor-embedded-mail/android/src/main/java/de/dhbw/capacitor/embeddedmail/EmbeddedMailPlugin.java',
  ),
  'utf8',
);

describe('embedded mail native layout', () => {
  it('berücksichtigt Statusleiste und Display-Cutout', () => {
    expect(androidEmbeddedMailPlugin).toContain('WindowInsetsCompat.Type.statusBars()');
    expect(androidEmbeddedMailPlugin).toContain('WindowInsetsCompat.Type.displayCutout()');
    expect(androidEmbeddedMailPlugin).toMatch(/params\.topMargin\s*=/);
  });

  it('zieht bereits verrechnete Systemleisten ab, statt sie doppelt zu addieren', () => {
    expect(androidEmbeddedMailPlugin).toContain('getLocationInWindow');
    expect(androidEmbeddedMailPlugin).toMatch(/Math\.max\(0,\s*statusInset - gapAboveHost\)/);
    expect(androidEmbeddedMailPlugin).toMatch(/Math\.max\(0,\s*navigationInset - gapBelowHost\)/);
  });

  it('zeigt die WebView erst nach der geladenen Seite', () => {
    expect(androidEmbeddedMailPlugin).toContain('view.setVisibility(View.INVISIBLE)');
    expect(androidEmbeddedMailPlugin).toContain('onPageFinished');
    // onPageCommitVisible meldet den ersten, noch leeren Frame — das blendete
    // genau die weiße Fläche ein, die der Ladehinweis ersetzen soll.
    expect(androidEmbeddedMailPlugin).not.toContain('onPageCommitVisible(');
    // Ohne Zeitgrenze bliebe der Ladehinweis bei einer hängenden Seite stehen.
    expect(androidEmbeddedMailPlugin).toContain('REVEAL_TIMEOUT_MS');
  });

  it('positioniert die WebView nach Layoutwechseln neu', () => {
    expect(androidEmbeddedMailPlugin).toContain('addOnLayoutChangeListener(hostLayoutListener)');
    expect(androidEmbeddedMailPlugin).toContain('removeOnLayoutChangeListener(hostLayoutListener)');
  });
});
