# DHBW Planner Store Release

## App Identity

- App name: DHBW Planner
- iOS bundle ID: `de.dhbw.raplaplan`
- Android application ID: `de.dhbw.raplaplan`
- Current app version: `1.1` (`package.json`: `1.1.0`)
- Current iOS build: `5`
- Current Android versionCode: `2`

This is a new app identity.

## Current Local Status

- Web build works: `npm run build`
- Tests pass: `npm test`
- Capacitor sync works: `npx cap sync`
- Android debug build works with Java 21
- iOS simulator build works
- Custom app icon and splash assets are generated in `assets/` and copied into native projects

## Store Listing Draft

Short description:

DHBW Planner zeigt deinen DHBW-Stundenplan kompakt als Tages- und Wochenansicht mit Kalenderexport und lokalen Erinnerungen — geführt über Standort, Studiengang und Kurs oder alternativ über deinen Rapla-Link.

Full description:

DHBW Planner ist eine schlanke App für Studierende der DHBW. Im geführten Modus wählst du Standort, Studiengang und Kurs direkt in der App aus; ein Rapla-Link kann weiterhin als manueller Modus verwendet werden. Der Stundenplan wird lokal auf deinem Gerät gespeichert und in einer schnellen Tages- und Wochenansicht angezeigt. Vergangene Wochen sind verfügbar, soweit die jeweilige Quelle die Termine bereitstellt. Optional können Modulnoten und Prüfungsleistungen direkt aus Dualis angezeigt werden.

Funktionen:

- Tagesansicht mit Wochenleiste
- Wochenansicht mit vergangenen und kommenden Terminen
- Geführte DHBW-Kursauswahl ohne Rapla-Link
- Rapla-Link als alternative manuelle Datenquelle
- Automatische Mensa passend zum DHBW-Standort mit manueller Auswahlmöglichkeit
- Suchbare Modulfilter zum Ausblenden einzelner Vorlesungen
- Offline-Anzeige des zuletzt geladenen Stundenplans
- Export als Kalenderdatei
- Lokale Erinnerungen vor Uni-Terminen
- Pull-to-refresh für Aktualisierungen
- Dualis-Ansicht für Modulnoten und Prüfungen

Privacy summary:

Die App speichert Rapla-Link beziehungsweise API-Kursauswahl, Stundenplan- und Mensa-Cache, ausgeblendete Module, ein lokales Dozenten-Verzeichnis und optionale Dualis-Einstellungen lokal auf dem Gerät. Dualis-Passwörter werden nicht dauerhaft gespeichert. Es wird kein Tracking eingebaut. Netzwerkzugriffe erfolgen direkt zum Abrufen von Stundenplan-, Mensa- und Dualis-Daten. Kalenderexport und lokale Benachrichtigungen werden nur auf dem Gerät verarbeitet.

Support text:

Bei Problemen prüfe zuerst, ob die gewählte Kursquelle erreichbar ist. Im manuellen Modus muss der Rapla-Link in den Einstellungen korrekt hinterlegt und Rapla erreichbar sein; im geführten Modus kann die Kursauswahl erneut durchgeführt werden.

## Android Release Steps

1. Create an upload keystore outside the repository.
2. Copy `android/release-signing.example.properties` to `android/release-signing.properties`.
3. Fill in the keystore path and passwords.
4. Add a release signing config in `android/app/build.gradle`, or build/sign through Android Studio.
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

## Still Needed From You

- Confirm final app name: `DHBW Planner`.
- Provide/confirm support URL and privacy policy URL.
- Create the new App Store Connect app record.
- Create the new Play Console app record.
- Decide whether I should generate a new Android upload keystore for this app.
