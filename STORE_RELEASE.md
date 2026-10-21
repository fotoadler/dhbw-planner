# DHBW Planner Store Release

## App Identity

- App name: DHBW Planner
- iOS bundle ID: `de.dhbw.raplaplan`
- Android application ID: `de.dhbw.raplaplan`
- Android minimum: Android 7 / API 24, required by the existing Google Play automatic protection.












## Version 1.5.3 — Rapla-Fix, 20. Oktober 2026

Neue Rapla-Freigabelinks werden jetzt unterstützt, auch ohne salt-Parameter – unter anderem am Campus Friedrichshafen. Der Link bleibt nach einem Neustart gespeichert, und weitere Kalenderwochen werden korrekt geladen.

- Grundlage: [PR #39](https://github.com/fotoadler/dhbw-planner/pull/39), Merge-Commit `13dfa7e65ae297f906f2d1df9a262b8795992bb4`, mit lokalen Versionsanpassungen auf 1.5.3. Keine weiteren Produktivänderungen.
- Android 1.5.3 (15), iOS 1.5.3 (16), einschließlich Widget-Erweiterung. Bestehende Signieridentitäten und Mindestversionen unverändert (Android API 24 / iOS 15).
- TypeScript/Vite-Build, Capacitor-Sync, signierter Android-APK-/AAB-Build und signiertes iOS-Archiv erfolgreich. APK-Signatur und iOS-Codesign einschließlich eingebetteter Komponenten geprüft. Alle acht Web-Dateien in APK, AAB und iOS-Archiv stimmen bytegenau mit `dist` überein.
- iOS-Upload am 20. Oktober erfolgreich (`Upload succeeded` / `EXPORT SUCCEEDED`), Build verarbeitet und Version 1.5.3 zugeordnet. **Zur Prüfung eingereicht**, bestätigter Status `Waiting for Review`, Build 16. Submission ID: `0c84b675-e277-4357-be08-995b342873dd`, Einreichung 20. Oktober um 15:07 MESZ. Deutsche Versionshinweise gespeichert; automatische Veröffentlichung nach Freigabe für alle Nutzer, kein gestaffelter Roll-out.
- Google Play: Bundle 15 (1.5.3) verarbeitet, deutsche Versionshinweise gespeichert. Bundle 9 bleibt für ältere Geräte enthalten, Bundle 14 wird ersetzt. Keine Geräte fallen weg. Nur die bekannten Mapping-Datei-Warnungen bei deaktivierter Minifizierung. **Zur Prüfung gesendet**: Die Übersicht zeigt „Änderungen, die überprüft werden“ für Produktion 1.5.3. Automatische Vorabprüfungen laufen noch; danach erfolgt die Prüfung. Vollständiger Roll-out nach Freigabe, verwaltete Veröffentlichung aus.
- Die bisherigen Releases 1.5.2 sind am 20. Oktober in beiden Store-Konsolen als veröffentlicht bestätigt (Google Play 100 %, App Store `Ready for Distribution`). Das ist keine native Geräteabnahme von 1.5.3; neue Store-Freigabe und öffentliche Verfügbarkeit von 1.5.3 stehen aus.

## Version 1.5.2 — Hochgeladen am 17., zur Prüfung eingereicht am 17./18. Oktober 2026

Wahlkurse, WPS, Schwerpunkte und Gruppen jetzt bei der Einrichtung und in den Einstellungen auswählen – u. a. in Villingen-Schwenningen, Stuttgart, Mannheim, Mosbach, Heidenheim und Friedrichshafen. Gemeinsame und vergangene Termine bleiben enthalten. Bestehende Profile erkennen eine offene Kurswahl. Außerdem verbessert: Module bei überlappenden Terminen und per langem Drücken ausblenden, ohne versehentliche Textmarkierung.

- Signierte Builds: iOS 1.5.2 (15), Android 1.5.2 (14).
- [PR #37](https://github.com/fotoadler/dhbw-planner/pull/37) am 17. Oktober in `main` gemergt; Buildquellen: `a92f4e1274cb8c393fe6d86af3d6e06752dd2ec1`. Community-/Watch-Branches bleiben außerhalb dieses Releases.
- 486 Tests in 49 Dateien, TypeScript/Vite-Build und Capacitor-Sync erfolgreich.
- iOS-Simulator-Build erfolgreich; native Bedienprüfung mit FN-TIM24/FN-TIM23 auf iPhone 17 Pro / iOS 26.5 ohne beobachteten Absturz. Einzelheiten und Grenzen: [Release-QA](docs/RELEASE_1_5_2_QA.md).
- GitHub `web-quality` und `Android main beta` für den Merge-Commit erfolgreich.
- Android: signiertes APK/AAB erstellt, versionCode 14, minSdk 24 / targetSdk 36. AAB SHA-256: `6368d8e532f39a7e1e2afb82bf2eb2f6655fcde141ed6542936b60f4f7b6a693`. APK-Signatur (v2) geprüft.
- Google Play: Bundle 14 (1.5.2) verarbeitet, deutsche Versionshinweise gespeichert, Produktionsrelease 1.5.2 in „Veröffentlichungen – Übersicht“. Legacy-Bundle 9 bleibt enthalten; keine Geräte fallen weg. Nur die bekannten Mapping-Datei-Warnungen für 9 und 14 (Minifizierung deaktiviert). **Zur Prüfung abgeschickt**, Übersicht zeigt „Änderungen, die überprüft werden“ und „Deine Änderungen werden jetzt überprüft“. Verwaltete Veröffentlichung aus, vollständiger Roll-out nach Freigabe. Versionshinweise nennen sechs belegte Standorte als Beispiele.
- iOS: signiertes Archiv 1.5.2 (15), Mindestversion iOS 15. Xcode meldete am 17. Oktober um 23:35 MESZ `Upload succeeded` / `EXPORT SUCCEEDED`; Paket wurde von App Store Connect zur Verarbeitung angenommen. Build verarbeitet und Version 1.5.2 zugeordnet. Am 18. Oktober zur App-Prüfung eingereicht, bestätigter Status **Waiting for Review**. Submission ID: `137c93d2-e881-4394-a598-61649032ca7d`. Automatische Veröffentlichung nach Freigabe für alle Nutzer (kein gestaffelter Roll-out). Deutsche Versionsbeschreibung inklusive der sechs belegten Standorte gespeichert.
- Web-Assets in APK, AAB und iOS-Archiv bytegleich zum geprüften `dist`-Build.

## Version 1.5.1 — Update descriptions

Kursprofile lassen sich jetzt direkt im Kalender speichern, wechseln und löschen. Ein Hauptprofil steuert Erinnerungen, Live-Aktivitäten, Kalenderabgleich, Mail und Dualis; zusätzliche Profile dienen nur zur Stundenplanansicht. In Friedrichshafen ist außerdem der Speiseplan der Zeppelin Universität mit DHBW-Preisen verfügbar.

### Scope

Based on production 1.5.0 (GitHub main `2c05c4f2`), with saved course profiles, Zeppelin menus and the profile focus correction. The separate Community branch is not included. Google Play production 1.5.0 (11, plus retained legacy bundle 9) and iOS 1.5.0 (13) were verified live on 13 October. Android internal-test Community bundle 12 is retained on its existing track; the update uses bundle 13. iOS uses build 14.

### Submission status (historischer Einreichungsstand vom 13. Oktober)

Google Play 1.5.1 war bei der erneuten Live-Prüfung am 17. Oktober vollständig veröffentlicht. Der folgende Abschnitt dokumentiert den damaligen Einreichungsstand, nicht den aktuellen Status.

- 378 tests (41 files), production web build and Capacitor sync passed on 13 October.
- Signed Android release APK/AAB: 1.5.1, versionCode 13, API 24 minimum / target API 36. AAB SHA-256: `a8de50dc72fdfb020441b4cf10d008ddb9eabfe9be6cc9f17d1611747dadca0d`.
- Google Play: production 1.5.1 (13 plus legacy bundle 9) sent for review, full rollout after approval, managed publishing off. UI shows “Änderungen, die überprüft werden”; automatic prechecks still running. No device-support loss; only existing mapping-file warnings (minification disabled).
- Signed iOS archive: 1.5.1 (14), minimum iOS 15. App Store Connect upload succeeded; build processed and attached. Version 1.5.1 (14) submitted on 13 October, status **Warten auf Prüfung**, automatic release after approval. Submission ID: `0da958e1-c81e-4248-8099-ce22365c2165`.
- The web bundle hash matches across `dist`, the Android assets and the iOS archive.
- Release approval and public 1.5.1 availability are not confirmed.

## Version 1.5.0 — Update descriptions

### Google Play „Was ist neu“ und App Store „Neu in dieser Version“

Neue Monatsansicht mit Wischnavigation und Tagesdetails sowie eine Jetzt-Linie in der Wochenansicht. Dazu kommen die automatische Gerätekalender-Synchronisierung und Verbesserungen bei Wochenenden, Dualis und Stabilität.

## Version 1.4.2 — Previous update descriptions

### Google Play „Was ist neu“

Verbesserte Navigation und Darstellung:

- Horizontale Wischbewegungen wechseln jetzt zuverlässig zwischen Tagen und Wochen.
- Die Wochenansicht scrollt nicht mehr unbeabsichtigt über den oberen Stundenplanrand.
- Falsche Dozentenangaben wie „Online“ werden nicht mehr angezeigt.
- Live Activities bleiben besser lesbar.
- Einstellungen und Startbildschirm wurden optisch überarbeitet.

### App Store „Neu in dieser Version“

Diese Version verbessert die Navigation zwischen Tagen und Wochen, verhindert unbeabsichtigtes vertikales Scrollen bei horizontalen Wischbewegungen und korrigiert falsche Dozentenanzeigen. Außerdem wurden Live Activities, der Startbildschirm und die Einstellungen weiter überarbeitet.

## Validation — 11 October 2026

- Web production build and all 360 tests (38 files) passed.
- Capacitor sync passed for Android and iOS; plugin sources are versioned.
- Signed Android release APK and bundle built with OpenJDK 21: version 1.5.0, versionCode 11, target API 36.
- Android build 11 installed and launched on a physical Samsung Galaxy Tab A7 Lite (SM-T220). Ravensburg OWA now renders its mobile login view with all form controls visible; horizontal swipe does not shift the page. Authentication and mailbox contents were not tested.
- Four existing embedded-mail native layout regression tests passed after the Android fix.
- Signed iOS release archive: version 1.5.0, build 13, app minimum iOS 15; App Store Connect upload succeeded.
- Android 16 back gesture from issue #33 remains unverified on a physical Android 16 device.

## Store submission — 11 October 2026

- App Store Connect: 1.5.0 (13) uploaded and submitted; status **Warten auf Prüfung**. Submission ID: `9ce5aa9c-9b17-4a35-8945-507ee435333d`. Automatic release after approval.
- Google Play: production release 1.5.0 with bundle 11 sent; status **Änderungen, die überprüft werden** (automated prechecks still running). Full rollout after approval; managed publishing remains off.
- Bundle 10 was superseded before submission by bundle 11 with the physical-tablet webmail correction. Bundle 9 (1.4.2 / API 23) stays included for older devices; Google reports no loss of available device models. New 1.5.0 updates require API 24.
- Only Play warnings: missing R8/ProGuard mapping for bundles 9 and 11; release builds do not enable minification, so no mapping file exists.
- Both stores received the brief German update description above. Approval and live availability are pending.

## Store Listing Draft

Short description:

DHBW Planner zeigt deinen DHBW-Stundenplan kompakt als Tages-, Wochen- und Monatsansicht mit optionaler Gerätekalender-Synchronisierung und lokalen Erinnerungen — geführt über Standort, Studiengang und Kurs oder alternativ über deinen Rapla-Link.

Full description:

DHBW Planner ist eine schlanke App für Studierende der DHBW. Im geführten Modus wählst du Standort, Studiengang und Kurs direkt in der App aus; ein Rapla-Link kann weiterhin als manueller Modus verwendet werden. Der Stundenplan wird lokal auf deinem Gerät gespeichert und in einer schnellen Tages-, Wochen- und Monatsansicht angezeigt. Vergangene Wochen sind verfügbar, soweit die jeweilige Quelle die Termine bereitstellt. Optional können Modulnoten und Prüfungsleistungen direkt aus Dualis angezeigt werden.

Funktionen:

- Tagesansicht mit Wochenleiste
- Wochenansicht mit vergangenen und kommenden Terminen
- Geführte DHBW-Kursauswahl ohne Rapla-Link
- Rapla-Link als alternative manuelle Datenquelle
- Automatische Mensa passend zum DHBW-Standort mit manueller Auswahlmöglichkeit
- Suchbare Modulfilter zum Ausblenden einzelner Vorlesungen
- Offline-Anzeige des zuletzt geladenen Stundenplans
- Optionale automatische Synchronisierung mit dem Gerätekalender
- Lokale Erinnerungen vor Uni-Terminen
- Pull-to-refresh für Aktualisierungen
- Dualis-Ansicht für Modulnoten und Prüfungen
- Uni-Mail direkt in der App über den Webmail-Zugang des Standorts
- Helles und dunkles Design

Privacy summary:

Die App speichert Rapla-Link beziehungsweise API-Kursauswahl, Stundenplan- und Mensa-Cache, ausgeblendete Module, ein lokales Dozenten-Verzeichnis und optionale Dualis-Einstellungen lokal auf dem Gerät. Dualis-Zugangsdaten werden bei ausdrücklich gewähltem „Angemeldet bleiben“ nach erfolgreichem Login auf iOS/Android im nativen Secure Storage gespeichert; ohne diese Option bleibt das Passwort im Arbeitsspeicher. Die Mail-WebView hält Sitzungsdaten persistent. Löschversuche und Implementierungsgrenzen sind in `docs/AUTHENTICATION_PERSISTENCE.md` beschrieben. Es wird kein Tracking eingebaut. Netzwerkzugriffe erfolgen direkt zum Abrufen von Stundenplan-, Mensa- und Dualis-Daten. Die optionale Gerätekalender-Synchronisierung benötigt Kalenderzugriff; je nach Kalenderkonto kann das Betriebssystem übertragene Termine mit dem Kontenanbieter synchronisieren. Lokale Benachrichtigungen werden auf dem Gerät verarbeitet.

Support text:

Bei Problemen prüfe zuerst, ob die gewählte Kursquelle erreichbar ist. Im manuellen Modus muss der Rapla-Link in den Einstellungen korrekt hinterlegt und Rapla erreichbar sein; im geführten Modus kann die Kursauswahl erneut durchgeführt werden.

## Android Release Steps

1. Reuse the existing upload keystore and signing configuration for updates. Only create a key for a genuinely new app; never replace the existing upload identity as a routine release step.
2. Copy `android/release-signing.example.properties` to `android/release-signing.properties`.
3. Fill in the keystore path and passwords. The file is git-ignored; `android/app/build.gradle` already reads it and applies the release signing config when it exists.
4. Bump `versionCode` and `versionName` in `android/app/build.gradle`, plus `package.json`, the iOS project and this file.
5. Build the release app bundle:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew bundleRelease
```

6. Upload the signed `.aab` to a new release in the existing Play Console app `de.dhbw.raplaplan`. Save and verify the build/version, release notes and device compatibility. Review submission and public rollout are separate from upload.

## iOS Release Steps

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select the appropriate Apple Developer Team locally in Xcode.
3. Confirm bundle ID `de.dhbw.raplaplan`.
4. Use the existing App Store Connect app record for that bundle ID and an unused build number.
5. Product > Archive.
6. Distribute App > App Store Connect (or `xcodebuild -exportArchive` with destination `upload`). Confirm upload success; processing and App Review are separate steps.




























