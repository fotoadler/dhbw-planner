/**
 * Android-Zurück-Button.
 *
 * @capacitor/app registriert beim Start einen aktiven OnBackPressedCallback.
 * Ohne 'backButton'-Listener macht dieser nur `webView.goBack()` — und die
 * WebView hat hier nie eigene History, weil die Navigation reiner React-State
 * ist. Der Callback verschluckt den Zurück-Druck dann wirkungslos: Man kommt
 * weder eine Ebene zurück noch aus der App heraus.
 *
 * Sobald ein Listener registriert ist, übergibt Capacitor die Entscheidung
 * vollständig an JS. `handler` baut deshalb den UI-Zustand eine Ebene ab und
 * meldet mit `true`, dass der Druck verarbeitet wurde. Bei `false` ist die
 * oberste Ebene erreicht und die App wird beendet — das entspricht dem
 * Android-Standardverhalten.
 */

import { useEffect, useRef } from 'react';
import { App as CapApp } from '@capacitor/app';

export function useBackButton(handler: () => boolean): void {
  // Der Listener wird nur einmal registriert; über die Ref sieht er trotzdem
  // immer den aktuellen Zustand (ein Re-Register pro State-Änderung würde
  // Zurück-Drücke während des Austauschs verlieren).
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = CapApp.addListener('backButton', () => {
      if (handlerRef.current()) return;
      void CapApp.exitApp();
    });
    return () => {
      void listener.then((l) => l.remove());
    };
  }, []);
}
