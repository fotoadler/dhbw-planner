# DHBW Planner Store Release

## App Identity

- App name: DHBW Planner
- iOS bundle ID: `de.dhbw.raplaplan`
- Android application ID: `de.dhbw.raplaplan`
- Current app version: `1.5.2` (`package.json`: `1.5.2`)
- Current iOS build: `15`
- Current Android versionCode: `14`
- Android minimum: Android 7 / API 24, required by the existing Google Play automatic protection.

## Version 1.5.2 — Release in Vorbereitung

Wahlkurse, Seminare, Studienschwerpunkte und Gruppen lassen sich jetzt direkt nach der Kurswahl und später in den Einstellungen konfigurieren. Gemeinsame und vergangene Termine bleiben enthalten. Bereits eingerichtete Profile weisen auf eine offene Auswahl hin. Außerdem wurde das Ausblenden von Modulen bei überlappenden Terminen und per langem Drücken verbessert.

- Geplante Builds: iOS 1.5.2 (15), Android 1.5.2 (14).
- Veröffentlichung über einen ausdrücklich angeforderten Pull Request nach `main`; Community-/Watch-Branches bleiben außerhalb dieses Releases.
- Native Laufzeitprüfung, Merge und Upload werden erst nach tatsächlichem Erfolg im Release-Protokoll ergänzt. Die vorliegenden Browserprüfungen ersetzen keinen Simulatorlauf.

## Version 1.5.1 — Update descriptions

Kursprofile lassen sich jetzt direkt im Kalender speichern, wechseln und löschen. Ein Hauptprofil steuert Erinnerungen, Live-Aktivitäten, Kalenderabgleich, Mail und Dualis; zusätzliche Profile dienen nur zur Stundenplanansicht. In Friedrichshafen ist außerdem der Speiseplan der Zeppelin Universität mit DHBW-Preisen verfügbar.

### Scope

Based on production 1.5.0 (GitHub main `2c05c4f2`), with saved course profiles, Zeppelin menus and the profile focus correction. The separate Community branch is not included. Google Play production 1.5.0 (11, plus retained legacy bundle 9) and iOS 1.5.0 (13) were verified live on 13 October. Android internal-test Community bundle 12 is retained on its existing track; the update uses bundle 13. iOS uses build 14.

### Submission status

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

Die App speichert Rapla-Link beziehungsweise API-Kursauswahl, Stundenplan- und Mensa-Cache, ausgeblendete Module, ein lokales Dozenten-Verzeichnis und optionale Dualis-Einstellungen lokal auf dem Gerät. Dualis-Zugangsdaten werden nur auf Wunsch im geschützten Gerätespeicher gespeichert. Es wird kein Tracking eingebaut. Netzwerkzugriffe erfolgen direkt zum Abrufen von Stundenplan-, Mensa- und Dualis-Daten. Die optionale Gerätekalender-Synchronisierung benötigt Kalenderzugriff; je nach Kalenderkonto kann das Betriebssystem übertragene Termine mit dem Kontenanbieter synchronisieren. Lokale Benachrichtigungen werden auf dem Gerät verarbeitet.

Support text:

Bei Problemen prüfe zuerst, ob die gewählte Kursquelle erreichbar ist. Im manuellen Modus muss der Rapla-Link in den Einstellungen korrekt hinterlegt und Rapla erreichbar sein; im geführten Modus kann die Kursauswahl erneut durchgeführt werden.

## Android Release Steps

1. Create an upload keystore outside the repository.
2. Copy `android/release-signing.example.properties` to `android/release-signing.properties`.
3. Fill in the keystore path and passwords. The file is git-ignored; `android/app/build.gradle` already reads it and applies the release signing config when it exists.
4. Bump `versionCode` and `versionName` in `android/app/build.gradle`, plus `package.json`, the iOS project and this file.
5. Build the release app bundle:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew bundleRelease
```

6. Upload the signed `.aab` to a new Play Console app entry for `de.dhbw.raplaplan`.

## iOS Release Steps

1. Open `ios/App/App.xcworkspace` in Xcode.
2. Select the appropriate Apple Developer Team locally in Xcode.
3. Confirm bundle ID `de.dhbw.raplaplan`.
4. Set a unique App Store Connect app record with that bundle ID.
5. Product > Archive.
6. Distribute App > App Store Connect.

