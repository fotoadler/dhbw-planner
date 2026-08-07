import { Haptics } from '@capacitor/haptics';

/** Native selection feedback with a small browser fallback for Android webviews. */
export function selectionHaptic(): void {
  void Haptics.selectionChanged().catch(() => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(8);
    }
  });
}
