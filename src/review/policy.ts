import { Preferences } from '@capacitor/preferences';

export const DAY = 86_400_000;
export const REVIEW_KEY = 'app-review.v1';
export const PROMPT_SEPARATION = 7 * DAY;
export interface ReviewState {
  firstSeenAt: number;
  sessions: number;
  lastSessionAt: number;
  lastRequestAt: number | null;
  lastSupportAt: number | null;
}
export function initialReviewState(now: number): ReviewState {
  return { firstSeenAt: now, sessions: 0, lastSessionAt: 0, lastRequestAt: null, lastSupportAt: null };
}
export function nextReviewSession(s: ReviewState, now: number, cold = false): ReviewState {
  return cold || now - s.lastSessionAt >= 30 * 60_000
    ? { ...s, sessions: s.sessions + 1, lastSessionAt: now } : s;
}
export function reviewDue(s: ReviewState, now: number, lastOfferAt: number | null): boolean {
  const support = Math.max(s.lastSupportAt ?? -Infinity, lastOfferAt ?? -Infinity);
  return now - s.firstSeenAt >= 3 * DAY && s.sessions >= 5 &&
    now - support >= PROMPT_SEPARATION &&
    (s.lastRequestAt === null || now - s.lastRequestAt >= 180 * DAY);
}
export function supportSeparated(s: ReviewState, now: number): boolean {
  return s.lastRequestAt === null || now - s.lastRequestAt >= PROMPT_SEPARATION;
}
let queue: Promise<unknown> = Promise.resolve();
export function updateReviewState(change: (s: ReviewState) => ReviewState, now = Date.now()): Promise<ReviewState> {
  const job = queue.then(async () => {
    const { value } = await Preferences.get({ key: REVIEW_KEY });
    let s = initialReviewState(now);
    if (value !== null) {
      const parsed = JSON.parse(value) as ReviewState;
      if (![parsed.firstSeenAt, parsed.sessions, parsed.lastSessionAt].every(n => Number.isFinite(n) && n >= 0) ||
          ![parsed.lastRequestAt, parsed.lastSupportAt].every(n => n === null || (Number.isFinite(n) && n >= 0))) {
        throw new Error('Invalid review state'); // Damaged data never restarts requests.
      }
      s = parsed;
    }
    const next = change(s);
    await Preferences.set({ key: REVIEW_KEY, value: JSON.stringify(next) });
    return next;
  });
  queue = job.catch(() => undefined);
  return job;
}
let started: Promise<ReviewState> | undefined;
export function startReviewSession(): Promise<ReviewState> {
  return started ??= updateReviewState(s => nextReviewSession(s, Date.now(), true));
}
// Shared synchronous guard closes the async-read race between both prompt timers.
let supportThisRun = false;
let reviewThisRun = false;
let supportGeneration = 0;
export function supportActivity(): void {
  supportThisRun = true;
  supportGeneration++;
  void updateReviewState(s => ({ ...s, lastSupportAt: Date.now() })).catch(() => undefined);
}
export function reserveAutomaticSupport(): boolean {
  if (reviewThisRun) return false;
  supportActivity();
  return true;
}
export function reviewTicket(): number | null {
  return supportThisRun || reviewThisRun ? null : supportGeneration;
}
export function validReviewTicket(ticket: number): boolean {
  return !supportThisRun && !reviewThisRun && ticket === supportGeneration;
}
export function reviewReservationValid(ticket: number): boolean {
  return !supportThisRun && ticket === supportGeneration;
}
export function reserveReview(ticket: number): boolean {
  if (!validReviewTicket(ticket)) return false;
  reviewThisRun = true;
  return true;
}
export async function automaticSupportAllowed(): Promise<boolean> {
  if (reviewThisRun) return false;
  try {
    const s = await updateReviewState(s => s);
    return !reviewThisRun && supportSeparated(s, Date.now());
  } catch { return false; }
}
