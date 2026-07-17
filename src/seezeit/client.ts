/**
 * Seezeit-Client: lädt eine Mensa-Speiseplanseite und parst sie.
 *
 * Wie bei Rapla läuft der Abruf nativ über CapacitorHttp (umgeht CORS — Seezeit
 * sendet keine CORS-Header), im Web-Dev-Modus über den Vite-Proxy (/seezeit/*).
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { berlinParts } from '../lib/berlinTime';
import { MENSA_SLUGS, parseSeezeit } from './parser';
import { Mensa, MensaPlan } from './types';

const BASE_URL = 'https://seezeit.com/essen/speiseplaene';

async function fetchHtml(url: string): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url,
      headers: { Accept: 'text/html' },
      responseType: 'text',
    });
    if (res.status >= 400) throw new Error(`Seezeit antwortete mit HTTP ${res.status}`);
    return typeof res.data === 'string' ? res.data : String(res.data);
  }

  // Web/Dev: relativer Pfad → Vite-Proxy übernimmt (siehe vite.config.ts).
  const u = new URL(url);
  const res = await fetch(`/seezeit${u.pathname}`, { headers: { Accept: 'text/html' } });
  if (!res.ok) throw new Error(`Seezeit antwortete mit HTTP ${res.status}`);
  return res.text();
}

/** Lädt und parst den Speiseplan einer Mensa (zwei Wochen, Mo–Fr). */
export async function fetchMensaPlan(mensa: Mensa): Promise<MensaPlan> {
  const html = await fetchHtml(`${BASE_URL}/${MENSA_SLUGS[mensa]}/`);
  return parseSeezeit(html, berlinParts(new Date()));
}
