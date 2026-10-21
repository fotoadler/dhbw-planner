# Native Store-Bewertungen

`useAppReview.ts` koordiniert die Bewertungsanfrage, `policy.ts` speichert ausschließlich lokale Zeitpunkte und Nutzungszähler. Das separate Capacitor-Plugin liegt unter `plugins/capacitor-app-review/`: StoreKit `AppStore.requestReview(in:)` ab iOS 16 (Fallback für iOS 15), Google Play Review 2.0.2 auf Android. Keine zusätzliche Berechtigung, keine eigene Analyse oder Übertragung von App-Nutzungsdaten.

- Frühestens nach 72 Stunden seit Aktivierung dieser Funktion und fünf Sitzungen. Updates übernehmen keine geschätzte frühere Nutzung. Kaltstart zählt einmal; Wiederaufnahme erst nach 30 Minuten als neue Sitzung.
- Nach 20 Sekunden ununterbrochen bereitem Kalender: geladen, online, Vordergrund, keine Einrichtung, Detailansicht oder andere Dialoge, keine ausstehende Zahlung. Eine lange Inaktivität berücksichtigt die Rückkehrfrist der Unterstützungshinweise.
- Mindestens sieben Tage nach jedem Unterstützungsdialog, einschließlich manueller Öffnung und Schließen. Automatische Unterstützung wird auch für sieben Tage nach einer Bewertungsanfrage blockiert. Nie beide automatisch innerhalb derselben App-Laufzeit. Eine bereits innerhalb der nächsten sieben Tage fällige Unterstützungsanzeige hat Vorrang.
- Frühestens nach 180 Tagen erneut. Der Versuch wird vor dem nativen Aufruf gespeichert, auch wenn das Betriebssystem keinen Dialog zeigt. Beschädigte Daten unterdrücken Anfragen.
- Android bereitet den Review-Flow vor, danach werden Kalender, Vordergrund und konkurrierende Dialoge erneut geprüft. Gemeinsame synchrone Reservierung verhindert parallele Timer. Ein inzwischen manuell geöffneter Unterstützungsdialog verwirft den Review-Versuch.
- Bewertungen sind unabhängig von Käufen, Unterstützerstatus und vermeintlicher Zufriedenheit. Keine Sterne-Vorabfrage, Belohnung, Kauf-Verknüpfung oder eigener Aufforderungsdialog. Manuell angeforderte Unterstützung bleibt jederzeit zugänglich.

Das Betriebssystem entscheidet über die Anzeige; die APIs melden weder Sterne noch erfolgte Bewertung. iOS-TestFlight zeigt keinen Bewertungsdialog. Android mit Installation aus einem Google-Play-Testtrack und berechtigtem Tester prüfen; Sideloading beweist die Store-Anzeige nicht. Automatisierte Tests prüfen Zeitregeln und gegenseitige Sperren, native Builds die API-Integration.

Quellen: [Apple](https://developer.apple.com/documentation/storekit/appstore/requestreview(in:)-1q8qs), [Google](https://developer.android.com/guide/playcore/in-app-review), [Android-Integration](https://developer.android.com/guide/playcore/in-app-review/kotlin-java).
