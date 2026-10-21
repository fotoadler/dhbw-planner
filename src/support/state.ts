import { Preferences } from '@capacitor/preferences';

export const SUPPORT_STATE_KEY = 'support.v1';
export const DAY = 86_400_000;
const SESSION_GAP = 30 * 60_000;
export interface SupportState {
  firstLaunchAt: number;
  eligibleAt: number;
  sessions: number;
  lastSessionAt: number;
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
    sessions: 0, lastSessionAt: 0, promptCount: 0, lastPromptAt: null,
    dismissed: false, hasSupported: false, pending: false, goldUnlocked: false, legacySupported: false };
}

export function shouldPrompt(state: SupportState, now: number): boolean {
  return !state.dismissed && !state.hasSupported && !state.pending && state.sessions >= 10 &&
    now >= state.eligibleAt && state.promptCount < 2 &&
    (state.lastPromptAt === null || now - state.lastPromptAt >= 45 * DAY);
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
      if (validState(state)) return { ...state, goldUnlocked: state.goldUnlocked === true,
        legacySupported: state.legacySupported === true || (state.legacySupported === undefined && state.hasSupported && !state.goldUnlocked) };
    } catch { /* fail closed below */ }
    // A damaged state must not restart automatic requests.
    return { ...initialSupportState(existing, now), dismissed: true };
  }
  return initialSupportState(existing, now);
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
  return startup ??= updateSupportState(s => ({ ...s, sessions: s.sessions + 1, lastSessionAt: Date.now() }), existing);
}
export function resumeSupportSession(now = Date.now()): Promise<SupportState> {
  return updateSupportState(s => now - s.lastSessionAt >= SESSION_GAP
    ? { ...s, sessions: s.sessions + 1, lastSessionAt: now } : s, false, now);
}
export function markSupported(goldUnlocked = false): Promise<SupportState> {
  return updateSupportState(s => ({ ...s, hasSupported: true, pending: false, goldUnlocked: s.goldUnlocked || goldUnlocked,
    legacySupported: s.legacySupported || !goldUnlocked }));
}
