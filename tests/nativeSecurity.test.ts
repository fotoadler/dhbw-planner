import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../capacitor.config';

const androidNightStyles = readFileSync(
  resolve(process.cwd(), 'android/app/src/main/res/values-night/styles.xml'),
  'utf8',
);

describe('native security configuration', () => {
  it('does not persist Capacitor cookies while keeping native HTTP enabled', () => {
    expect(config.plugins?.CapacitorCookies).toEqual({ enabled: false });
    expect(config.plugins?.CapacitorHttp).toEqual({ enabled: true });
  });

  it('keeps the Android night themes compatible with Capacitor BridgeActivity', () => {
    expect(androidNightStyles).toContain(
      '<style name="AppTheme" parent="Theme.AppCompat.DayNight.DarkActionBar">',
    );
    expect(androidNightStyles).toContain(
      '<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">',
    );
    expect(androidNightStyles).toContain(
      '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">',
    );
    expect(androidNightStyles).toContain(
      '<item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>',
    );
  });
});
