# Watch-Apps

## Zielbild

Die Watch-Oberflächen bleiben bewusst auf den nächsten relevanten Stundenplan-
Kontext reduziert:

- aktuell laufende Veranstaltung oder nächster Termin
- Titel, Uhrzeit, Raum und – wenn vorhanden – Dozent
- Countdown bis zum Ende der laufenden Veranstaltung
- kompakte Tagesliste
- „Danach“ sowie „Keine Vorlesung“, wenn nichts mehr ansteht

Die Erinnerungen 15 Minuten vor Beginn und zum Start bleiben in der bestehenden
App-Notification-Logik. watchOS bzw. Wear OS kann diese Telefonbenachrichtigungen
nach den Systemeinstellungen auf die Uhr spiegeln; es gibt keine zweite,
duplizierte Terminplanung auf der Uhr.

## Gemeinsamer Datenfluss

`src/watch/model.ts` projiziert die bestehenden `ScheduleEntry`-Daten in einen
kleinen, versionsierten Snapshot. Übertragen werden nur die für die Uhr nötigen
Felddaten – insbesondere keine Rapla-Zugangsdaten, Tokens oder API-Details.

```text
Rapla/DHBW API → useSchedule → WatchScheduleSnapshot
                         ├─ Capacitor WatchSync
                         │  ├─ WatchConnectivity → Apple Watch
                         │  └─ Wear Data Layer → Wear OS
                         └─ Web/Mobile-App bleibt die Quelle der Wahrheit
```

Die Synchronisierung ist best-effort: Der letzte gültige Snapshot bleibt auf der
Uhr erhalten, wenn die App gerade offline oder die Uhr nicht erreichbar ist.

## Apple Watch

Das Xcode-Projekt enthält jetzt die Targets `DHBWPlannerWatch` und
`DHBWPlannerWatchWidget`. Die Watch-App nutzt SwiftUI und WatchConnectivity; die
Komplikation nutzt WidgetKit und die App Group
`group.de.dhbw.raplaplan`. Eingebettet wird die Watch-App in das iOS-App-Produkt,
damit sie gemeinsam mit der iPhone-App ausgeliefert werden kann.

Die Apple-Plattform unterstützt die automatische Installation kompatibler
Watch-Apps beim Installieren der iPhone-App, sofern die entsprechende
Systemoption aktiviert ist. Die native Watch-App ist als Companion-App
konfiguriert und benötigt den iPhone-Teil zum initialen Abruf und Übertragen des
Stundenplans.

## Wear OS

`android/wear` ist ein eigenes Wear-OS-Modul mit einer schlanken Compose-
Oberfläche. Der Snapshot wird über den Wear Data Layer an die Uhr übertragen;
die Uhr speichert ihn lokal in `SharedPreferences` und kann danach die Tages-
und Nächster-Termin-Ansicht ohne laufende WebView anzeigen.

Das Modul ist als Companion-App (`standalone=false`) vorbereitet. Damit passt
es zur gewünschten Installation zusammen mit der Android-App. Die vollständige
Compose-Ansicht, ein read-only Wear-OS-Tile und eine Short-Text-Komplikation
verwenden denselben lokalen `WatchSnapshot`:

- Tile: aktueller bzw. nächster Termin, Startzeit und Raum
- Komplikation: Startzeit als Primärwert, kurzer Veranstaltungstitel als Titel

Für die Veröffentlichung müssen im Play-Console-App-Bundle zusätzlich die
Wear-OS-Verpackung, Signierung, Tile-Vorschau und die Geräteauswahl geprüft
werden.

## Native Einrichtung vor Release

1. In Xcode App Group und Watch-Bundle-IDs im Apple-Developer-Account anlegen
   und mit dem Team signieren.
2. `npx cap sync ios` und `npx cap sync android` ausführen; dadurch wird das
   lokale `capacitor-watch-sync`-Plugin in die nativen Projekte übernommen.
3. Für Android das `:wear`-Modul im Release-App-Bundle testen und auf einem
   echten Wear-OS-Gerät prüfen, dass die Capability `dhbw_planner_wear`
   erreichbar ist.
4. Auf echten Geräten prüfen: Snapshot-Update, Offline-Verhalten, App-Resume,
   Komplikations-Refresh und die OS-seitige Benachrichtigungsspiegelung.

## Recherchegrundlage

- [Apple: Apps auf der Apple Watch installieren](https://support.apple.com/guide/watch/get-apps-apd99e3c6a68/watchos)
- [Apple: unabhängige watchOS-Apps](https://developer.apple.com/documentation/watchos-apps/creating-independent-watchos-apps?changes=__6)
- [Apple: WatchConnectivity](https://developer.apple.com/documentation/WatchConnectivity/transferring-data-with-watch-connectivity)
- [Apple: WidgetKit-Komplikationen](https://developer.apple.com/documentation/WidgetKit/Creating-accessory-widgets-and-watch-complications)
- [Android: Wear-OS-Verpackung](https://developer.android.com/training/wearables/packaging)
- [Android: Wear Data Layer](https://developer.android.com/training/wearables/data/overview)
- [Android: Wear-OS-Benutzeroberflächen](https://developer.android.com/training/wearables/user-interfaces)
- [Android: Wear-OS-Tiles](https://developer.android.com/training/wearables/tiles/get_started)
- [Android: Wear-OS-Komplikationsdaten](https://developer.android.com/training/wearables/complications/exposing-data)
