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
  it('keeps the Android mail WebView below the status bar and display cutout', () => {
    expect(androidEmbeddedMailPlugin).toContain('WindowInsetsCompat.Type.statusBars()');
    expect(androidEmbeddedMailPlugin).toContain('WindowInsetsCompat.Type.displayCutout()');
    expect(androidEmbeddedMailPlugin).toContain('params.topMargin = statusInset;');
  });
});
