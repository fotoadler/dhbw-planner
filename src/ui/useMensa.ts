/**
 * Lädt den Mensa-Speiseplan der gewählten Mensa und hält ihn frisch.
 *
 * Analog zum Stundenplan: der letzte Stand liegt im Preferences-Cache und wird
 * sofort angezeigt, während im Hintergrund aktualisiert wird. Ein Mensawechsel
 * lädt neu; beim App-Resume wird bei veraltetem Stand (> 6 h) nachgeladen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { fetchMensaPlan } from '../seezeit/client';
import { Mensa, MensaPlan } from '../seezeit/types';
import { loadMensaCache, saveMensaCache } from '../store/preferences';

/** Speisepläne ändern sich selten → 6 Stunden gelten als frisch genug. */
const STALE_MS = 6 * 60 * 60_000;

export function useMensa(mensa: Mensa, enabled: boolean) {
  const [plan, setPlan] = useState<MensaPlan>({});
  const mensaRef = useRef(mensa);
  mensaRef.current = mensa;
  const updatedAtRef = useRef(0);

  const refresh = useCallback(async (m: Mensa): Promise<void> => {
    try {
      const fresh = await fetchMensaPlan(m);
      // Zwischenzeitlicher Mensawechsel: veraltetes Ergebnis verwerfen.
      if (mensaRef.current !== m) return;
      setPlan(fresh);
      updatedAtRef.current = Date.now();
      await saveMensaCache({ mensa: m, updatedAt: updatedAtRef.current, plan: fresh });
    } catch {
      /* Offline/Netzwerkfehler: letzter Cache bleibt sichtbar. */
    }
  }, []);

  // Mensawechsel oder (De-)Aktivierung: Cache laden, dann aktualisieren.
  useEffect(() => {
    if (!enabled) {
      setPlan({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const cached = await loadMensaCache();
      if (cancelled) return;
      if (cached && cached.mensa === mensa) {
        setPlan(cached.plan);
        updatedAtRef.current = cached.updatedAt;
      } else {
        setPlan({});
        updatedAtRef.current = 0;
      }
      void refresh(mensa);
    })();
    return () => {
      cancelled = true;
    };
  }, [mensa, enabled, refresh]);

  // App-Resume: bei veraltetem Stand neu laden.
  useEffect(() => {
    if (!enabled) return;
    const listener = CapApp.addListener('resume', () => {
      if (Date.now() - updatedAtRef.current > STALE_MS) void refresh(mensaRef.current);
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, [enabled, refresh]);

  return { plan };
}
