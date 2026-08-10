import { describe, expect, it } from 'vitest';
import config from '../capacitor.config';

describe('native security configuration', () => {
  it('does not persist Capacitor cookies while keeping native HTTP enabled', () => {
    expect(config.plugins?.CapacitorCookies).toEqual({ enabled: false });
    expect(config.plugins?.CapacitorHttp).toEqual({ enabled: true });
  });

  it('never logs native plugin calls containing credentials', () => {
    expect(config.loggingBehavior).toBe('none');
  });
});
