# Release-QA 1.5.2

Prüfung am 17. Oktober 2026, iPhone 17 Pro im eigenen frischen Simulator mit iOS 26.5, Xcode 27 / Device Hub. Build 1.5.2 (15), produktive Web-Assets nach `npm run build` und `npx cap sync`, kein Testdaten- oder Vorschau-Server.

## Durchgeklickte native Abläufe

- Kaltstart und API-Einrichtung: Friedrichshafen → Mobile Informatik → FN-TIM24.
- „Deine Kurswahl“ hält vor dem Kalender an, WF-Angebote und GR-Laborgruppen sind zunächst abgewählt. Gruppe 1 wählen und speichern.
- Betriebssystem-Benachrichtigungsberechtigung ablehnen: Kalender bleibt bedienbar.
- Wochen-, Monats- und Tagesansicht, Tag mit Terminen und leeres Wochenende samt Mensa-Angebot.
- Monatsdetailfenster → konkretes Modul ausblenden → bestätigen: nur dieses Modul verschwindet; Filterzähler steigt.
- Vorlesung in der Tagesansicht 700 ms gedrückt halten: Bestätigungsdialog nach Loslassen, keine Textmarkierung; Abbrechen funktioniert.
- Einstellungen öffnen: Auswahlstatus und sichtbare Module stimmen.
- Dualis-Loginansicht und native Mail-WebView bis zur OWA-Anmeldemaske öffnen, zurück zum Kalender. Keine echten Zugangsdaten eingegeben.
- Zusätzliches Ansichtprofil FN-TIM23 einrichten; dessen eigene Wahlangebote werden abgefragt. Profilmenü zeigt TIM24 als unverändertes Hauptprofil. Wechsel zurück zu TIM24 lädt den Plan samt seinem Modulfilter.
- App beenden und neu starten; gespeicherte Konfiguration auf erneuten Start prüfen.

Der App-Prozess blieb während der gesamten Bedienprüfung derselbe (PID 10508); kein unbeabsichtigter Prozessneustart. Die gezielte Systemlog-Suche nach unbehandelten Ausnahmen, Fatal Errors und „Terminating app“ ergab keinen App-Absturz. Screenshots und Buildlogs werden lokal im Release-Artefaktordner aufbewahrt.

## Automatische Prüfung

486 Tests in 49 Dateien erfolgreich. Web-Build und TypeScript einschließlich der ausgelagerten Konzeptvorschau erfolgreich. Der native iOS-Debug-/Simulator-Build war erfolgreich.

## Aussagegrenzen

Das ist ein gezielter Regressionstest, keine Garantie für jede denkbare Eingabe oder jeden Geräte-/OS-Zustand. Dualis-/Mail-Anmeldung, externe Konten, physische Android-Geräte und vollständige EventKit-Konten-Synchronisierung sind durch diesen Simulatorlauf nicht neu abgenommen. Die Überlappungs-/Gestenfälle sind zusätzlich durch Browserprüfungen und Regressionstests abgedeckt.
