import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { AppReview } from '@dhbw/capacitor-app-review';
import { shouldPrompt, updateSupportState } from '../support/state';
import { nextReviewSession, PROMPT_SEPARATION, reserveReview, reviewDue, reviewTicket,
  reviewReservationValid, startReviewSession, updateReviewState, validReviewTicket } from './policy';

/** Native system UI only. No rating gates, incentives, custom prompts, or browser fallback. */
export function useAppReview(enabled: boolean, ready: boolean): void {
  const [foreground, setForeground] = useState(false);
  const [session, setSession] = useState(0);
  const allowed = enabled && ready && foreground;
  const canRequest = useRef(allowed);
  canRequest.current = allowed;

  useEffect(() => {
    if (!enabled || !Capacitor.isNativePlatform()) return;
    let live = true, activityReceived = false;
    const activity = (active: boolean, resume: boolean) => {
      if (!live) return;
      setForeground(active);
      if (!active) { canRequest.current = false; return; }
      void (async () => {
        await startReviewSession();
        if (resume) await updateReviewState(s => nextReviewSession(s, Date.now()));
        if (live) setSession(n => n + 1);
      })().catch(() => undefined);
    };
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      activityReceived = true; activity(isActive, true);
    });
    void App.getState().then(({ isActive }) => {
      if (!activityReceived) activity(isActive, false);
    }).catch(() => undefined);
    return () => { live = false; void listener.then(h => h.remove()).catch(() => undefined); };
  }, [enabled]);

  useEffect(() => {
    if (!allowed || !session || !Capacitor.isNativePlatform()) return;
    let live = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        const ticket = reviewTicket();
        if (ticket === null) return;
        const eligible = async () => {
          const s = await updateReviewState(s => s);
          const support = await updateSupportState(s => s);
          const now = Date.now();
          return live && canRequest.current && validReviewTicket(ticket) && !support.pending &&
            now >= support.returnEligibleAt && support.sessions >= support.returnSession &&
            reviewDue(s, now, support.lastOfferAt) &&
            !shouldPrompt(support, now + PROMPT_SEPARATION);
        };
        if (!await eligible()) return;
        await AppReview.prepare(); // Play preparation may take time: validate again afterwards.
        if (!await eligible()) return;
        if (!reserveReview(ticket)) return;
        // Persist the attempt even when the OS silently suppresses its dialog.
        await updateReviewState(s => ({ ...s, lastRequestAt: Date.now() }));
        if (!live || !canRequest.current || !reviewReservationValid(ticket)) return;
        await AppReview.requestReview();
      })().catch(() => undefined); // Store failures never interrupt the calendar.
    }, 20_000);
    return () => { live = false; window.clearTimeout(timer); };
  }, [allowed, session]);
}
