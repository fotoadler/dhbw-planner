# Store-Versionen und Builds

## Aktueller Stand

Version **1.5.5** ist im [App Store](https://apps.apple.com/de/app/dhbw-planner/id6791134218) und bei [Google Play](https://play.google.com/store/apps/details?id=de.dhbw.raplaplan) veröffentlicht. Stand: 28. Oktober 2026.

| Plattform | Version | Build | Mindestversion |
| --- | --- | --- | --- |
| iOS | 1.5.5 | 19 | iOS 15 |
| Android | 1.5.5 | 23 | Android 7 / API 24 |

App-Name: **DHBW Planner**. Bundle-ID und Android-Application-ID: `de.dhbw.raplaplan`.

Versionshinweis in beiden Stores:

> Fehlerbehebungen.

Die Änderungen je Version stehen im [Changelog](CHANGELOG.md). Produktarten, Wiederherstellung und Unterstützungshinweise sind in [docs/SUPPORT.md](docs/SUPPORT.md) beschrieben.

### Quellstand und Store-Grafiken

- Quellstand von 1.5.5: `5e33d4b5`.
- Store-Aufnahmen und Banner: `63652612`, unter [app-store-screenshots/](app-store-screenshots/). Alle Aufnahmen verwenden Beispieldaten.
- Android-AAB SHA-256: `1a69967bb65e1add8aad23782c5202e049bad7d164a28943881c695d40f388d2`.
- iOS-App und Widget-Erweiterung deklarieren Deutsch als Sprache.

## Frühere Builds

| Version | iOS-Build | Android-versionCode |
| --- | --- | --- |
| 1.5.4 | 18 | 22 |
| 1.5.3 | 16 | 15 |
| 1.5.2 | 15 | 14 |
| 1.5.1 | 14 | 13 |
| 1.5.0 | 13 | 11 |

## Release vorbereiten

1. `npm test` und `npm run build` ausführen, anschließend mit `npx cap sync` die nativen Projekte synchronisieren.
2. Versionsnummer in `package.json`, `package-lock.json` und beiden Plattformprojekten abgleichen. Je Store eine unbenutzte Buildnummer verwenden.
3. Änderungen und Buildnummern in `CHANGELOG.md` und dieser Datei aktualisieren. Store-Aufnahmen bei sichtbaren UI-Änderungen erneuern; nur Beispieldaten verwenden.
4. Native Funktionen auf beiden Plattformen prüfen. Für Käufe Store-Testkonten verwenden; insbesondere Erstkauf, Wiederholung, Abbruch, ausstehende Zahlung und Wiederherstellung berücksichtigen. Prüfumfang: [Android-Käufe](docs/ANDROID_IAP_QA.md), [Widgets](src/widgets/README.md).
5. Signierte Pakete erstellen und Versionsnummern sowie enthaltene Web-Assets prüfen. Signierschlüssel und Zugangsdaten gehören nicht ins Repository.
6. Pakete in die bestehenden Store-Einträge hochladen. Verarbeitung, Review-Einreichung und Veröffentlichung jeweils separat prüfen. Die gewünschte automatische oder manuelle Veröffentlichung pro Release einstellen.

### Android

Die bestehende Upload-Signatur weiterverwenden. `android/app/build.gradle` liest die ignorierte Datei `android/release-signing.properties`; die Vorlage liegt daneben. Einen vorhandenen Schlüssel bei Updates nicht ersetzen.

Im Verzeichnis `android/`:

```sh
JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home ./gradlew bundleRelease
```

Das signierte AAB in Google Play hochladen und Buildnummer, Versionshinweise sowie Gerätekompatibilität kontrollieren. Legacy-Bundle 9 kann für ältere Geräte enthalten bleiben. Ohne Minifizierung wird keine R8-/ProGuard-Mappingdatei erzeugt.

### iOS

`ios/App/App.xcworkspace` in Xcode öffnen, Entwicklerteam und Bundle-ID prüfen und über **Product → Archive** archivieren. Anschließend über **Distribute App → App Store Connect** hochladen. Nach der Verarbeitung das Build der Version zuordnen, Exportangaben prüfen und zur App-Prüfung einreichen.

### Store-Texte und Datenschutz

Beschreibungen müssen die verfügbaren Funktionen und die optionalen In-App-Käufe korrekt benennen. Kalender, Dualis und Mail bleiben kostenlos; Widgets und Gold-Symbol sind die Extras für Unterstützer. Preise werden vom jeweiligen Store lokalisiert.

Die öffentliche Datenschutzerklärung liegt unter [docs/PRIVACY.md](docs/PRIVACY.md). Änderungen an Datenverarbeitung, Berechtigungen oder eingebundenen Diensten müssen dort und in den Store-Angaben berücksichtigt werden.
