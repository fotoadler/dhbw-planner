import { describe, expect, it } from 'vitest';
import { parseStoredDualisCredentials } from '../src/store/dualis';

describe('stored Dualis credentials', () => {
  it('accepts a complete credential record', () => {
    expect(parseStoredDualisCredentials(JSON.stringify({
      username: 'student@example.de',
      password: 'secret',
      site: 'RV',
    }))).toEqual({ username: 'student@example.de', password: 'secret', site: 'RV' });
  });

  it('rejects incomplete or malformed records', () => {
    expect(parseStoredDualisCredentials(null)).toBeNull();
    expect(parseStoredDualisCredentials('{not-json')).toBeNull();
    expect(parseStoredDualisCredentials(JSON.stringify({ username: 'student', site: 'RV' }))).toBeNull();
  });
});
