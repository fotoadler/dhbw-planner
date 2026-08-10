import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const haptics = vi.hoisted(() => ({
  selectionStart: vi.fn(() => Promise.resolve()),
  selectionChanged: vi.fn(() => Promise.resolve()),
  selectionEnd: vi.fn(() => Promise.resolve()),
}));

vi.mock('@capacitor/haptics', () => ({ Haptics: haptics }));

import { selectionHaptic } from '../src/lib/haptics';

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('selectionHaptic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
  });

  it('führt den von iOS benötigten Start-Changed-End-Lebenszyklus aus', async () => {
    selectionHaptic();
    await flushPromises();

    expect(haptics.selectionStart).toHaveBeenCalledOnce();
    expect(haptics.selectionChanged).toHaveBeenCalledOnce();
    expect(haptics.selectionEnd).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(160);
    await flushPromises();

    expect(haptics.selectionEnd).toHaveBeenCalledOnce();
    expect(haptics.selectionStart.mock.invocationCallOrder[0]).toBeLessThan(haptics.selectionChanged.mock.invocationCallOrder[0]);
    expect(haptics.selectionChanged.mock.invocationCallOrder[0]).toBeLessThan(haptics.selectionEnd.mock.invocationCallOrder[0]);
  });
});
