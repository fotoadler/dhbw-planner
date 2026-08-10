import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import config from '../capacitor.config';

describe('native security configuration', () => {
  it('does not persist Capacitor cookies while keeping native HTTP enabled', () => {
    expect(config.plugins?.CapacitorCookies).toEqual({ enabled: false });
    expect(config.plugins?.CapacitorHttp).toEqual({ enabled: true });
  });

  it('never logs native plugin calls containing credentials', () => {
    expect(config.loggingBehavior).toBe('none');
  });

  it('keeps Android HttpURLConnection out of the WebView cookie store', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'android/app/src/main/java/de/dhbw/raplaplan/MainActivity.java'),
      'utf8',
    );

    expect(source).toContain('CookieHandler.setDefault(null);');
    expect(source.indexOf('super.onCreate(savedInstanceState);')).toBeLessThan(
      source.indexOf('disableAutomaticHttpCookies();'),
    );
  });
});
