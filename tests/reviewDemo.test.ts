import { describe, expect, it } from 'vitest';
import {
  isReviewDemoCredentials,
  isReviewDemoRaplaLink,
  REVIEW_DEMO_DUALIS_PASSWORD,
  REVIEW_DEMO_RAPLA_LINK,
} from '../src/demo/reviewDemo';

describe('App-Review-Demomodus', () => {
  it('akzeptiert ausschließlich den dokumentierten Review-Link', () => {
    expect(isReviewDemoRaplaLink(REVIEW_DEMO_RAPLA_LINK)).toBe(true);
    expect(isReviewDemoRaplaLink('https://rapla.dhbw.de/rapla/calendar?user=app-review&file=demo')).toBe(false);
    expect(isReviewDemoRaplaLink('https://app-review.demo.invalid/rapla?user=app-review&file=anderes')).toBe(false);
  });

  it('akzeptiert ausschließlich die dokumentierten Demo-Credentials', () => {
    expect(isReviewDemoCredentials({ username: 'APP-REVIEW', password: REVIEW_DEMO_DUALIS_PASSWORD })).toBe(true);
    expect(isReviewDemoCredentials({ username: 'app-review', password: 'falsch' })).toBe(false);
  });
});
