import { describe, expect, it } from 'vitest';
import { mailProviderForSite, RAVENSBURG_MAIL_PROVIDER } from '../src/mail/providers';

describe('mail provider mapping', () => {
  it('exposes the Ravensburg OWA provider for RV', () => {
    expect(mailProviderForSite('RV')).toEqual(RAVENSBURG_MAIL_PROVIDER);
    expect(mailProviderForSite('FN')?.platform).toBe('owa');
    expect(mailProviderForSite('MA')?.webmailUrl).toBe('https://studgate.dhbw-mannheim.de/');
    expect(mailProviderForSite(undefined)).toBeNull();
  });

  it('keeps the OWA host separate from the /owa path', () => {
    expect(new URL(RAVENSBURG_MAIL_PROVIDER.webmailUrl).hostname).toBe('webmail1.dhbw-ravensburg.de');
    expect(RAVENSBURG_MAIL_PROVIDER.webmailUrl).toMatch(/\/owa\/$/);
    expect(RAVENSBURG_MAIL_PROVIDER.fallbackUrls).toEqual(['https://webmail.dhbw-ravensburg.de/owa/']);
    expect(RAVENSBURG_MAIL_PROVIDER.usernameHint).toBe('DOMAB\\Benutzername');
  });

  it('keeps a documented forwarding-only location without a fake mail login', () => {
    expect(mailProviderForSite('KA')).toBeNull();
  });

  it('supports different webmail platforms through the same adapter', () => {
    expect(mailProviderForSite('STG')?.platform).toBe('roundcube');
    expect(mailProviderForSite('VS')?.platform).toBe('modoboa');
    expect(mailProviderForSite('HDH')?.platform).toBe('owa');
  });
});
