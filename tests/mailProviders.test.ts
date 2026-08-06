import { describe, expect, it } from 'vitest';
import { mailProviderForSite, RAVENSBURG_MAIL_PROVIDER } from '../src/mail/providers';

describe('mail provider mapping', () => {
  it('exposes the Ravensburg OWA provider for RV only', () => {
    expect(mailProviderForSite('RV')).toEqual(RAVENSBURG_MAIL_PROVIDER);
    expect(mailProviderForSite('FN')).toBeNull();
    expect(mailProviderForSite('MA')).toBeNull();
    expect(mailProviderForSite(undefined)).toBeNull();
  });

  it('keeps the OWA host separate from the /owa path', () => {
    expect(new URL(RAVENSBURG_MAIL_PROVIDER.webmailUrl).hostname).toBe('webmail.dhbw-ravensburg.de');
    expect(RAVENSBURG_MAIL_PROVIDER.webmailUrl).toMatch(/\/owa\/$/);
    expect(RAVENSBURG_MAIL_PROVIDER.usernameHint).toBe('DOMAB\\Benutzername');
  });
});
