/**
 * Lokaler Demomodus für die App-Review.
 *
 * Die Werte hier sind absichtlich keine Geheimnisse. Sie gewähren keinen
 * Zugang zu externen Systemen, sondern wählen ausschließlich fest eingebaute
 * Beispieldaten aus. So kann die App Review ohne persönliche Zugangsdaten
 * alle relevanten Bereiche prüfen.
 */

import type { DualisCredentials } from '../dualis/types';

export const REVIEW_DEMO_RAPLA_LINK =
  'https://app-review.demo.invalid/rapla?user=app-review&file=demo';

export const REVIEW_DEMO_DUALIS_USERNAME = 'app-review';
export const REVIEW_DEMO_DUALIS_PASSWORD = 'DHBW-Review-Demo';

export function isReviewDemoRaplaLink(link: string): boolean {
  try {
    const url = new URL(link.trim());
    return (
      url.origin === 'https://app-review.demo.invalid' &&
      url.pathname === '/rapla' &&
      url.searchParams.get('user') === 'app-review' &&
      url.searchParams.get('file') === 'demo'
    );
  } catch {
    return false;
  }
}

export function isReviewDemoCredentials(credentials: DualisCredentials): boolean {
  return (
    credentials.username.trim().toLowerCase() === REVIEW_DEMO_DUALIS_USERNAME &&
    credentials.password === REVIEW_DEMO_DUALIS_PASSWORD
  );
}
