import { useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { NativePurchases, type Product } from '@capgo/native-purchases';
import { loadSupportProducts, nativeSupportAvailable, recoverSupportPurchases, SUPPORT_PRODUCTS } from './purchases';
import { resumeSupportSession, shouldPrompt, startSupportSession, updateSupportState, type SupportState } from './state';

export function useSupport(enabled: boolean, existing: boolean, ready: boolean) {
  const [state, setState] = useState<SupportState | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const [busy, setBusy] = useState(false);
  const attempted = useRef(false);
  const isBusy = useRef(false);
  const canPrompt = useRef(ready);
  canPrompt.current = ready;
  const setPurchaseBusy = (value: boolean) => { isBusy.current = value; setBusy(value); };

  useEffect(() => {
    if (!enabled || !nativeSupportAvailable()) return;
    let active = true;
    const refresh = async (resume: boolean) => {
      if (isBusy.current) return;
      try {
        await startSupportSession(existing);
        const local = await updateSupportState(s => s);
        if (active) setState(local);
        if (resume) await resumeSupportSession();
        await recoverSupportPurchases();
        const next = await updateSupportState(s => s);
        if (active) setState(next);
        const catalog = await loadSupportProducts();
        if (active) setProducts(catalog);
      } catch { /* No automatic prompt when the store or local persistence is unavailable. */ }
    };
    void refresh(false);
    const resume = CapApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) void refresh(true);
    });
    const updates = NativePurchases.addListener('transactionUpdated', () => { void refresh(false); });
    return () => {
      active = false;
      void resume.then(handle => handle.remove()).catch(() => undefined);
      void updates.then(handle => handle.remove()).catch(() => undefined);
    };
  }, [enabled]); // existing is captured when settings first finish loading, before setup writes.

  useEffect(() => {
    if (!ready || !state || !shouldPrompt(state, Date.now()) || products.length !== SUPPORT_PRODUCTS.length || open || attempted.current) return;
    const timer = window.setTimeout(() => {
      attempted.current = true;
      let show = false;
      void updateSupportState(s => {
        if (!shouldPrompt(s, Date.now())) return s;
        show = true;
        return { ...s, promptCount: s.promptCount + 1, lastPromptAt: Date.now() };
      }).then(next => {
        setState(next);
        if (show && canPrompt.current) { setAutomatic(true); setOpen(true); }
      }).catch(() => undefined);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [ready, state, products, open]);

  const close = () => { if (!isBusy.current) setOpen(false); };
  return { open, automatic, busy, products, setProducts, setBusy: setPurchaseBusy, close, loaded: state !== null,
    goldUnlocked: Boolean(state?.goldUnlocked || state?.legacySupported),
    show: () => { setAutomatic(false); setOpen(true); },
    dismiss: async () => {
      try { setState(await updateSupportState(s => ({ ...s, dismissed: true }))); setOpen(false); }
      catch { throw new Error('Die Auswahl konnte nicht gespeichert werden. Bitte erneut versuchen.'); }
    },
    supported: async () => setState(await updateSupportState(s => s)),
  };
}
