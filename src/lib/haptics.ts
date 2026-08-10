import { Haptics } from '@capacitor/haptics';

const SELECTION_IDLE_MS = 160;
let selectionActive = false;
let selectionGeneration = 0;
let selectionQueue: Promise<void> = Promise.resolve();
let selectionEndTimer: ReturnType<typeof setTimeout> | null = null;

function browserFallback(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(8);
}

function recoverHaptics(): void {
  selectionActive = false;
  browserFallback();
}

/**
 * Native selection feedback for scroll pickers and selects.
 * Capacitor's iOS implementation requires start -> changed -> end; calling
 * selectionChanged on its own resolves successfully but produces no feedback.
 */
export function selectionHaptic(): void {
  const generation = ++selectionGeneration;
  if (selectionEndTimer !== null) clearTimeout(selectionEndTimer);

  selectionQueue = selectionQueue.then(async () => {
    if (!selectionActive) {
      await Haptics.selectionStart();
      selectionActive = true;
    }
    await Haptics.selectionChanged();
  }).catch(recoverHaptics);

  selectionEndTimer = setTimeout(() => {
    selectionQueue = selectionQueue.then(async () => {
      if (!selectionActive || generation !== selectionGeneration) return;
      await Haptics.selectionEnd();
      selectionActive = false;
      selectionEndTimer = null;
    }).catch(recoverHaptics);
  }, SELECTION_IDLE_MS);
}
