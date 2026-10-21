import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  storage: new Map<string, string>(), prepare: vi.fn(), request: vi.fn(),
  activity: undefined as undefined | ((v: { isActive: boolean }) => void),
}));
vi.mock('@capacitor/preferences', () => ({ Preferences: {
  get: async ({ key }: { key: string }) => ({ value: m.storage.get(key) ?? null }),
  set: async ({ key, value }: { key: string; value: string }) => { m.storage.set(key, value); },
} }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock('@capacitor/app', () => ({ App: {
  getState: async () => ({ isActive: true }),
  addListener: async (_: string, fn: typeof m.activity) => {
    m.activity = fn; return { remove: vi.fn() };
  },
} }));
vi.mock('@dhbw/capacitor-app-review', () => ({ AppReview: { prepare: m.prepare, requestReview: m.request } }));
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let host: HTMLDivElement;
const now = 20 * 86_400_000;
async function mount(ready = true) {
  const { useAppReview } = await import('../src/review/useAppReview');
  function Harness() { useAppReview(true, ready); return null; }
  await act(async () => root.render(React.createElement(Harness)));
}
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(now); vi.clearAllMocks();
  m.storage.clear(); m.prepare.mockResolvedValue(undefined); m.request.mockResolvedValue(undefined);
  m.storage.set('app-review.v1', JSON.stringify({ firstSeenAt: 0, sessions: 5, lastSessionAt: 0, lastRequestAt: null, lastSupportAt: null }));
  // Supported users remain equally eligible to review, without purchase marketing.
  m.storage.set('support.v1', JSON.stringify({ firstLaunchAt: 0, eligibleAt: 0, sessions: 10,
    lastSessionAt: 0, promptCount: 0, lastPromptAt: null, dismissed: false, hasSupported: true, pending: false }));
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.useRealTimers(); });
it('requests native review after a quiet loaded calendar and persists the attempt', async () => {
  await mount();
  await act(async () => { await vi.advanceTimersByTimeAsync(19_999); });
  expect(m.prepare).not.toHaveBeenCalled();
  await act(async () => { await vi.advanceTimersByTimeAsync(1); });
  expect(m.request).toHaveBeenCalledOnce();
  expect(JSON.parse(m.storage.get('app-review.v1')!).lastRequestAt).toBe(now + 20_000);
});
it('never requests on a blocked screen or in the background', async () => {
  await mount();
  await act(async () => { m.activity?.({ isActive: false }); });
  await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
  expect(m.prepare).not.toHaveBeenCalled();
});
it('cancels a slow Play preparation if support opens in the meantime', async () => {
  let finish!: () => void;
  m.prepare.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  await mount();
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(m.prepare).toHaveBeenCalledOnce();
  const { supportActivity } = await import('../src/review/policy');
  await act(async () => { supportActivity(); finish(); });
  expect(m.request).not.toHaveBeenCalled();
});
it('gives an upcoming support reminder priority', async () => {
  const support = JSON.parse(m.storage.get('support.v1')!);
  m.storage.set('support.v1', JSON.stringify({ ...support, hasSupported: false, eligibleAt: now + 86_400_000 }));
  await mount();
  await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
  expect(m.prepare).not.toHaveBeenCalled();
});

it('does not schedule from settings, setup, offline or other unready screens', async () => {
  await mount(false);
  await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });
  expect(m.prepare).not.toHaveBeenCalled();
});
