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
- App beenden und neu starten: Hauptprofil und gespeicherter Modulfilter bleiben erhalten, Standardansicht Woche öffnet sich.

Der App-Prozess blieb während der gesamten Bedienprüfung derselbe (PID 10508); kein unbeabsichtigter Prozessneustart. Die gezielte Systemlog-Suche nach unbehandelten Ausnahmen, Fatal Errors und „Terminating app“ ergab keinen App-Absturz. Screenshots und Buildlogs werden lokal im Release-Artefaktordner aufbewahrt.

## Automatische Prüfung

486 Tests in 49 Dateien erfolgreich. Web-Build und TypeScript einschließlich der ausgelagerten Konzeptvorschau erfolgreich. Der native iOS-Debug-/Simulator-Build war erfolgreich.

## Aussagegrenzen

Das ist ein gezielter Regressionstest, keine Garantie für jede denkbare Eingabe oder jeden Geräte-/OS-Zustand. Dualis-/Mail-Anmeldung, externe Konten, physische Android-Geräte und vollständige EventKit-Konten-Synchronisierung sind durch diesen Simulatorlauf nicht neu abgenommen. Die Überlappungs-/Gestenfälle sind zusätzlich durch Browserprüfungen und Regressionstests abgedeckt.

## Build- und Uploadnachweis

[PR #37](https://github.com/fotoadler/dhbw-planner/pull/37), Merge-Commit `a92f4e12`. Beide Store-Pakete wurden anschließend aus diesem Stand gebaut. Android-APK-Signatur erfolgreich geprüft, iOS-Codesign einschließlich eingebetteter Komponenten erfolgreich geprüft. Die Web-Dateien in APK, AAB und iOS-Archiv entsprechen bytegenau dem geprüften Build.

Android 1.5.2 (14) wurde in Google Play als Produktionsupdate hochgeladen und zur Überprüfung abgeschickt. Die Übersicht zeigt nach den Vorabprüfungen „Änderungen, die überprüft werden“ und „Deine Änderungen werden jetzt überprüft“. Verwaltete Veröffentlichung ist aus, vollständiger Roll-out nach Freigabe. iOS 1.5.2 (15) wurde erfolgreich an App Store Connect übertragen; die weitere Verarbeitung war beim Uploadabschluss noch offen. Die anschließende App-Review-Einreichung wartet auf die lokale Bestätigung der Apple-Passkey-Anmeldung in Safari. Die deutsche Versionsbeschreibung mit sechs belegten Standorten ist vorbereitet, aber noch nicht in App Store Connect gespeichert. Aktueller Auslieferungsstand und Prüfsummen: [STORE_RELEASE.md](../STORE_RELEASE.md).
