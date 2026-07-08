# DHBW Planner Store Release

## App Identity

- App name: DHBW Planner
- iOS bundle ID: `de.dhbw.raplaplan`
- Android application ID: `de.dhbw.raplaplan`
- Initial version: `1.0`
- Initial build/versionCode: `1`

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

DHBW Planner zeigt deinen Rapla-Stundenplan kompakt als Tagesansicht mit Kursdetails, Kalenderexport und lokalen Erinnerungen.

Full description:

DHBW Planner ist eine schlanke App für Studierende der DHBW. Die App liest deinen persönlichen Rapla-Link ein, speichert den Stundenplan lokal auf deinem Gerät und zeigt Termine in einer schnellen Tages- und Wochenansicht. Optional können Modulnoten und Prüfungsleistungen direkt aus Dualis angezeigt werden.

Funktionen:

- Tagesansicht mit Wochenleiste
- Kursübersicht mit vergangenen und kommenden Terminen
- Offline-Anzeige des zuletzt geladenen Stundenplans
- Export als Kalenderdatei
- Lokale Erinnerungen vor Uni-Terminen
- Pull-to-refresh für Aktualisierungen
- Dualis-Ansicht für Modulnoten und Prüfungen

Privacy summary:

Die App speichert den Rapla-Link, den geladenen Stundenplan und optionale Dualis-Einstellungen lokal auf dem Gerät. Dualis-Passwörter werden nicht dauerhaft gespeichert. Es wird kein Tracking eingebaut. Netzwerkzugriffe erfolgen direkt zum Abrufen von Stundenplan- und Dualis-Daten. Kalenderexport und lokale Benachrichtigungen werden nur auf dem Gerät verarbeitet.

Support text:

Bei Problemen prüfe zuerst, ob dein Rapla-Link in den Einstellungen korrekt hinterlegt ist und ob Rapla erreichbar ist.

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
