import { automaticSupportAllowed, reserveAutomaticSupport, supportActivity } from '../review/policy';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { NativePurchases, type Product } from '@capgo/native-purchases';
import { loadSupportProducts, nativeSupportAvailable, recoverSupportPurchases, SUPPORT_PRODUCTS } from './purchases';
import { pauseSupportSession, recordSupportOffer, resumeSupportSession, shouldPrompt, snoozeSupportOffer, startSupportSession, updateSupportState, type SupportState } from './state';

export function useSupport(enabled: boolean, existing: boolean, ready: boolean) {
  const [state, setState] = useState<SupportState | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [foreground, setForeground] = useState(false);
  const [storeReady, setStoreReady] = useState(false);
  const attempted = useRef(false);
  const recorded = useRef(false);
  const isBusy = useRef(false);
  const appActive = useRef(false);
  const promptReady = enabled && ready && foreground && storeReady;
  const canPrompt = useRef(promptReady);
  canPrompt.current = promptReady;
  const setPurchaseBusy = (value: boolean) => { isBusy.current = value; setBusy(value); };

  useEffect(() => {
    if (!enabled || !nativeSupportAvailable()) return;
    let active = true, generation = 0, receivedActivity = false, started = false;
    const refresh = async (resume: boolean) => {
      if (isBusy.current || !appActive.current) return;
      const request = ++generation;
      canPrompt.current = false; setStoreReady(false);
      try {
        await startSupportSession(existing);
        started = true;
        const local = await updateSupportState(s => s);
        if (active) setState(local);
        if (resume) await resumeSupportSession();
        await recoverSupportPurchases();
        const next = await updateSupportState(s => s);
        const catalog = await loadSupportProducts();
        if (active && appActive.current && generation === request) {
          setState(next); setProducts(catalog); setStoreReady(true);
        }
      } catch { /* Store failures suppress automatic prompts; local entitlements remain usable. */ }
    };
    const activity = (isActive: boolean, resume: boolean) => {
      if (!active) return;
      appActive.current = isActive; setForeground(isActive);
      if (isActive) void refresh(resume);
      else {
        ++generation; canPrompt.current = false; setStoreReady(false);
        if (started) void pauseSupportSession().catch(() => undefined);
      }
    };
    const resume = CapApp.addListener('appStateChange', ({ isActive }) => {
      receivedActivity = true; activity(isActive, true);
    });
    void CapApp.getState().then(({ isActive }) => {
      // An older getState response must not overwrite a newer background event.
      if (!receivedActivity) activity(isActive, false);
    }).catch(() => undefined);
    const updates = NativePurchases.addListener('transactionUpdated', () => { void refresh(false); });
    return () => {
      active = false; ++generation; canPrompt.current = false;
      void resume.then(handle => handle.remove()).catch(() => undefined);
      void updates.then(handle => handle.remove()).catch(() => undefined);
    };
  }, [enabled]); // Capture whether a course already exists before first-time setup writes.

  useEffect(() => {
    if (!promptReady || !state || !shouldPrompt(state, Date.now()) || products.length !== SUPPORT_PRODUCTS.length || open || attempted.current) return;
    let current = true;
    const timer = window.setTimeout(() => {
      // Re-read after waiting, but do not count a dialog before it is actually rendered.
      void automaticSupportAllowed().then(async allowed => {
        if (!allowed) return;
        const next = await updateSupportState(s => s);
        if (!current || !canPrompt.current || attempted.current || !shouldPrompt(next, Date.now())) return;
        if (!reserveAutomaticSupport()) return;
        attempted.current = true; recorded.current = false;
        setState(next); setAutomatic(true); setOpen(true);
      }).catch(() => undefined);
    }, 1500);
    return () => { current = false; window.clearTimeout(timer); };
  }, [promptReady, state, products, open]);

  useLayoutEffect(() => {
    if (!open || !automatic || !promptReady || recorded.current) return;
    // This runs only after the visible dialog has committed to the DOM.
    recorded.current = true;
    supportActivity();
    let active = true;
    void updateSupportState(s => recordSupportOffer(s, Date.now(), true))
      .then(next => { if (active) setState(next); }).catch(() => undefined);
    return () => { active = false; };
  }, [open, automatic, promptReady]);

  useEffect(() => {
    if (open && automatic && !ready && !busy) setOpen(false);
  }, [open, automatic, ready, busy]);

  const close = () => {
    if (isBusy.current) return;
    supportActivity();
    setOpen(false);
    if (automatic) void updateSupportState(s => snoozeSupportOffer(s, Date.now())).then(setState).catch(() => undefined);
  };
  return { open, automatic, busy, products, setProducts, setBusy: setPurchaseBusy, close, promptReady, loaded: state !== null,
    goldUnlocked: Boolean(state?.goldUnlocked || state?.legacySupported),
    show: () => {
      supportActivity();
      attempted.current = true; setAutomatic(false); setOpen(true);
      // Looking at the offer voluntarily also starts the 90-day quiet period.
      void updateSupportState(s => recordSupportOffer(s, Date.now(), false)).then(setState).catch(() => undefined);
    },
    supported: async () => setState(await updateSupportState(s => s)),
  };
}
