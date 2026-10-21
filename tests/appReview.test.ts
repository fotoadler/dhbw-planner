import { beforeEach, describe, expect, it, vi } from 'vitest';
const storage = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({ Preferences: {
  get: async ({ key }: { key: string }) => ({ value: storage.get(key) ?? null }),
  set: async ({ key, value }: { key: string; value: string }) => { storage.set(key, value); },
} }));
import { DAY, initialReviewState, nextReviewSession, reviewDue, supportSeparated,
  updateReviewState, REVIEW_KEY } from '../src/review/policy';

beforeEach(() => storage.clear());
const frequent = () => ({ ...initialReviewState(DAY), sessions: 5 });
describe('native store review timing', () => {
  it('requires three full days AND five real sessions, including after updates', () => {
    expect(reviewDue(frequent(), 4 * DAY - 1, null)).toBe(false);
    expect(reviewDue(frequent(), 4 * DAY, null)).toBe(true);
    expect(reviewDue({ ...frequent(), sessions: 4 }, 100 * DAY, null)).toBe(false);
    expect(reviewDue(initialReviewState(100 * DAY), 100 * DAY, null)).toBe(false);
  });
  it('does not count a brief foreground return as another usage', () => {
    const s = nextReviewSession(initialReviewState(DAY), DAY, true);
    expect(nextReviewSession(s, DAY + 29 * 60_000).sessions).toBe(1);
    expect(nextReviewSession(s, DAY + 30 * 60_000).sessions).toBe(2);
  });
  it('separates support and reviews by seven days in BOTH directions', () => {
    expect(reviewDue(frequent(), 10 * DAY - 1, 3 * DAY)).toBe(false);
    expect(reviewDue(frequent(), 10 * DAY, 3 * DAY)).toBe(true);
    expect(reviewDue({ ...frequent(), lastSupportAt: 9 * DAY }, 10 * DAY, 3 * DAY)).toBe(false);
    expect(supportSeparated({ ...frequent(), lastRequestAt: 3 * DAY }, 10 * DAY - 1)).toBe(false);
    expect(supportSeparated({ ...frequent(), lastRequestAt: 3 * DAY }, 10 * DAY)).toBe(true);
  });
  it('limits requests to once every 180 days even if the store shows nothing', () => {
    const s = { ...frequent(), lastRequestAt: 4 * DAY };
    expect(reviewDue(s, 184 * DAY - 1, null)).toBe(false);
    expect(reviewDue(s, 184 * DAY, null)).toBe(true);
  });
  it('preserves both timestamps when asynchronous writes overlap', async () => {
    await Promise.all([
      updateReviewState(s => ({ ...s, lastSupportAt: DAY })),
      updateReviewState(s => ({ ...s, lastRequestAt: 2 * DAY })),
    ]);
    expect(JSON.parse(storage.get(REVIEW_KEY)!)).toMatchObject({ lastSupportAt: DAY, lastRequestAt: 2 * DAY });
  });
  it('fails closed on damaged local state instead of resetting the waiting period', async () => {
    storage.set(REVIEW_KEY, '{}');
    await expect(updateReviewState(s => s)).rejects.toThrow('Invalid review state');
  });
  it('cancels a prepared review when support opens and suppresses auto support after reserving', async () => {
    vi.resetModules();
    const policy = await import('../src/review/policy');
    const ticket = policy.reviewTicket()!;
    expect(policy.reserveReview(ticket)).toBe(true);
    expect(await policy.automaticSupportAllowed()).toBe(false);
    policy.supportActivity();
    expect(policy.reviewReservationValid(ticket)).toBe(false);
    expect(policy.reviewTicket()).toBe(null);
  });
});
