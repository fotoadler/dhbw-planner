/** Standortbewusster Mensa-Loader mit Cache sowie sichtbaren Lade-/Fehlerzustaenden. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { loadDiningSnapshot } from '../mensa/loadDining';
import type { DiningLoadStatus, DiningSnapshot } from '../mensa/model';
import { diningProfileForSite, type DiningSiteProfile } from '../mensa/sites';
import { Mensa, mensaSiteCode } from '../seezeit/types';
import { loadMensaCache, saveMensaCache } from '../store/preferences';

const STALE_MS = 6 * 60 * 60_000;

export function useMensa(mensa: Mensa, enabled: boolean) {
  const site = mensaSiteCode(mensa);
  const profile = diningProfileForSite(site);
  const [snapshot, setSnapshot] = useState<DiningSnapshot | null>(null);
  const [status, setStatus] = useState<DiningLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const siteRef = useRef(site);
  const profileRef = useRef<DiningSiteProfile>(profile);
  const snapshotRef = useRef<DiningSnapshot | null>(snapshot);
  const updatedAtRef = useRef(0);
  siteRef.current = site;
  profileRef.current = profile;
  snapshotRef.current = snapshot;

  const refresh = useCallback(async (): Promise<void> => {
    const requestedSite = siteRef.current;
    const requestedProfile = profileRef.current;
    setStatus((current) => current === 'ready' || current === 'stale' ? 'stale' : 'loading');
    setError(null);
    try {
      const fresh = await loadDiningSnapshot(requestedProfile);
      if (siteRef.current !== requestedSite) return;
      const updatedAt = Date.now();
      setSnapshot(fresh);
      setStatus('ready');
      updatedAtRef.current = updatedAt;
      await saveMensaCache({ site: requestedSite, updatedAt, snapshot: fresh });
    } catch (cause) {
      if (siteRef.current !== requestedSite) return;
      setError(cause instanceof Error ? cause.message : 'Speiseplan konnte nicht geladen werden.');
      setStatus((current) => snapshotRef.current || current === 'stale' ? 'stale' : 'error');
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setStatus('idle');
      setError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const cached = await loadMensaCache();
      if (cancelled) return;
      if (cached?.site === site) {
        setSnapshot(cached.snapshot);
        updatedAtRef.current = cached.updatedAt;
        setStatus(Date.now() - cached.updatedAt > STALE_MS ? 'stale' : 'ready');
      } else {
        setSnapshot(null);
        updatedAtRef.current = 0;
        setStatus('loading');
      }
      void refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [site, enabled, refresh]);

  useEffect(() => {
    if (!enabled) return;
    const listener = CapApp.addListener('resume', () => {
      if (Date.now() - updatedAtRef.current > STALE_MS) void refresh();
    });
    return () => {
      void listener.then((registered) => registered.remove());
    };
  }, [enabled, refresh]);

  return { profile, snapshot, status, error, refresh };
}
