import { Preferences } from '@capacitor/preferences';

export const SUPPORT_STATE_KEY = 'support.v1';
export const DAY = 86_400_000;
const SESSION_GAP = 30 * 60_000;
export const SUPPORT_REMINDER_GAP = 90 * DAY;
export const FIRST_SUPPORT_SNOOZE = 14 * DAY;
const INACTIVITY_GAP = 30 * DAY;
export interface SupportState {
  firstLaunchAt: number;
  eligibleAt: number;
  sessions: number;
  lastSessionAt: number;
  lastUsedAt: number;
  returnEligibleAt: number;
  returnSession: number;
  lastOfferAt: number | null;
  nextPromptAt: number;
  promptCount: number;
  lastPromptAt: number | null;
  dismissed: boolean;
  hasSupported: boolean;
  pending: boolean;
  goldUnlocked: boolean;
  legacySupported: boolean;
}

export function initialSupportState(existing: boolean, now: number): SupportState {
  return { firstLaunchAt: now, eligibleAt: now + (existing ? 7 : 14) * DAY,
    sessions: 0, lastSessionAt: 0, lastUsedAt: now, returnEligibleAt: 0, returnSession: 0, lastOfferAt: null, nextPromptAt: 0, promptCount: 0, lastPromptAt: null,
    dismissed: false, hasSupported: false, pending: false, goldUnlocked: false, legacySupported: false };
}

export function shouldPrompt(state: SupportState, now: number): boolean {
  const automaticDue = state.lastPromptAt === null ? 0 : state.lastPromptAt +
    (state.promptCount === 1 ? FIRST_SUPPORT_SNOOZE : SUPPORT_REMINDER_GAP);
  const manualDue = state.lastOfferAt !== null && state.lastOfferAt > (state.lastPromptAt ?? -Infinity)
    ? state.lastOfferAt + SUPPORT_REMINDER_GAP : 0;
  return !state.dismissed && !state.hasSupported && !state.pending && state.sessions >= 10 &&
    now >= state.eligibleAt && now >= state.returnEligibleAt && state.sessions >= state.returnSession &&
    now >= Math.max(state.nextPromptAt ?? 0, automaticDue, manualDue);
}

function validState(value: unknown): value is SupportState {
  if (!value || typeof value !== 'object') return false;
  const s = value as SupportState;
  return [s.firstLaunchAt, s.eligibleAt, s.sessions, s.lastSessionAt, s.promptCount]
    .every(n => Number.isFinite(n) && n >= 0) &&
    (s.lastPromptAt === null || (Number.isFinite(s.lastPromptAt) && s.lastPromptAt >= 0)) &&
    typeof s.dismissed === 'boolean' && typeof s.hasSupported === 'boolean' && typeof s.pending === 'boolean';
}

// Serialize read/modify/write so a late prompt write cannot undo a purchase.
let writes: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = writes.then(work);
  writes = result.catch(() => undefined);
  return result;
}
async function read(existing: boolean, now: number): Promise<SupportState> {
  const { value } = await Preferences.get({ key: SUPPORT_STATE_KEY });
  if (value !== null) {
    try {
      const state: unknown = JSON.parse(value);
      if (validState(state)) return { ...state,
        nextPromptAt: Number.isFinite(state.nextPromptAt) ? state.nextPromptAt : 0,
        lastUsedAt: Number.isFinite(state.lastUsedAt) ? state.lastUsedAt : state.lastSessionAt,
        returnEligibleAt: Number.isFinite(state.returnEligibleAt) ? state.returnEligibleAt : 0,
        returnSession: Number.isFinite(state.returnSession) ? state.returnSession : 0,
        lastOfferAt: typeof state.lastOfferAt === 'number' && Number.isFinite(state.lastOfferAt) ? state.lastOfferAt : state.lastPromptAt,
        goldUnlocked: state.goldUnlocked === true,
        legacySupported: state.legacySupported === true || (state.legacySupported === undefined && state.hasSupported && !state.goldUnlocked) };
    } catch { /* fail closed below */ }
    // A damaged state must not restart automatic requests.
    return { ...initialSupportState(existing, now), dismissed: true };
  }
  return initialSupportState(existing, now);
}
export function readSupportState(): Promise<SupportState> {
  return serial(() => read(false, Date.now()));
}
export function updateSupportState(
  change: (state: SupportState) => SupportState, existing = false, now = Date.now(),
): Promise<SupportState> {
  return serial(async () => {
    const state = change(await read(existing, now));
    await Preferences.set({ key: SUPPORT_STATE_KEY, value: JSON.stringify(state) });
    return state;
  });
}
let startup: Promise<SupportState> | undefined;
export function startSupportSession(existing: boolean): Promise<SupportState> {
  // React StrictMode remounts must not count as a second launch.
  return startup ??= updateSupportState(s => nextSupportSession(s, Date.now(), true), existing);
}
/** Preserve the first visit after a practice phase; require another session on a later day. */
export function nextSupportSession(state: SupportState, now: number, coldStart = false): SupportState {
  const newSession = coldStart || now - state.lastSessionAt >= SESSION_GAP;
  const sessions = state.sessions + (newSession ? 1 : 0);
  const returning = state.sessions > 0 && now - state.lastUsedAt >= INACTIVITY_GAP;
  return { ...state, sessions, lastUsedAt: now,
    lastSessionAt: newSession ? now : state.lastSessionAt,
    returnEligibleAt: returning ? now + DAY : state.returnEligibleAt,
    returnSession: returning ? sessions + 1 : state.returnSession };
}
export function resumeSupportSession(now = Date.now()): Promise<SupportState> {
  return updateSupportState(s => nextSupportSession(s, now), false, now);
}
export function pauseSupportSession(now = Date.now()): Promise<SupportState> {
  return updateSupportState(s => ({ ...s, lastUsedAt: now }), false, now);
}
export function recordSupportOffer(state: SupportState, now: number, automatic: boolean): SupportState {
  const promptCount = state.promptCount + (automatic ? 1 : 0);
  return { ...state, lastOfferAt: now,
    nextPromptAt: now + (automatic && promptCount === 1 ? FIRST_SUPPORT_SNOOZE : SUPPORT_REMINDER_GAP),
    ...(automatic ? { promptCount, lastPromptAt: now } : {}) };
}
export function snoozeSupportOffer(state: SupportState, now: number): SupportState {
  return { ...state, nextPromptAt: now + (state.promptCount === 1 ? FIRST_SUPPORT_SNOOZE : SUPPORT_REMINDER_GAP) };
}
export function markSupported(goldUnlocked = false): Promise<SupportState> {
  return updateSupportState(s => ({ ...s, hasSupported: true, pending: false, goldUnlocked: s.goldUnlocked || goldUnlocked,
    legacySupported: s.legacySupported || !goldUnlocked }));
}
