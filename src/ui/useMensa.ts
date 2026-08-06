/**
 * Lädt den Mensa-Speiseplan der gewählten Mensa und hält ihn frisch.
 *
 * Analog zum Stundenplan: der letzte Stand liegt im Preferences-Cache und wird
 * sofort angezeigt, während im Hintergrund aktualisiert wird. Ein Mensawechsel
 * lädt neu; beim App-Resume wird bei veraltetem Stand (> 6 h) nachgeladen.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { DhbwMensaClient, mapDhbwMensaResponse } from '../dhbwApi/mensa';
import { Mensa, MensaPlan, mensaLabel, mensaSiteCode } from '../seezeit/types';
import { loadMensaCache, saveMensaCache } from '../store/preferences';

/** Speisepläne ändern sich selten → 6 Stunden gelten als frisch genug. */
const STALE_MS = 6 * 60 * 60_000;

export function useMensa(mensa: Mensa, enabled: boolean) {
  const [plan, setPlan] = useState<MensaPlan>({});
  const [label, setLabel] = useState(() => mensaLabel(mensa));
  const mensaRef = useRef(mensa);
  mensaRef.current = mensa;
  const updatedAtRef = useRef(0);
  const clientRef = useRef(new DhbwMensaClient());

  const refresh = useCallback(async (m: Mensa): Promise<void> => {
    try {
      const response = await clientRef.current.fetchResponse(mensaSiteCode(m));
      const fresh = mapDhbwMensaResponse(response);
      const freshLabel = response
        .map((item) => item.mensaInfo.name.trim())
        .filter(Boolean)
        .join(' / ') || mensaLabel(m);
      // Zwischenzeitlicher Mensawechsel: veraltetes Ergebnis verwerfen.
      if (mensaRef.current !== m) return;
      setPlan(fresh);
      setLabel(freshLabel);
      updatedAtRef.current = Date.now();
      await saveMensaCache({ mensa: m, updatedAt: updatedAtRef.current, plan: fresh, label: freshLabel });
    } catch {
      /* Offline/Netzwerkfehler: letzter Cache bleibt sichtbar. */
    }
  }, []);

  // Mensawechsel oder (De-)Aktivierung: Cache laden, dann aktualisieren.
  useEffect(() => {
    if (!enabled) {
      setPlan({});
      setLabel(mensaLabel(mensa));
      return;
    }
    let cancelled = false;
    void (async () => {
      const cached = await loadMensaCache();
      if (cancelled) return;
      if (cached && cached.mensa === mensa) {
        setPlan(cached.plan);
        setLabel(cached.label ?? mensaLabel(mensa));
        updatedAtRef.current = cached.updatedAt;
      } else {
        setPlan({});
        setLabel(mensaLabel(mensa));
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

  return { plan, label };
}
