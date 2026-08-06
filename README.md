# DHBW Planner

DHBW Planner ist eine schlanke, plattformübergreifende App für Studierende der DHBW. Stundenpläne können entweder geführt über Standort, Studiengang und Kurs aus der öffentlichen DHBW-API ausgewählt oder weiterhin über einen persönlichen Rapla-Link eingebunden werden. Die App bereitet beide Quellen als Tages- und Wochenansicht auf, ergänzt lokale Erinnerungen und bietet zusätzlich eine Dualis-Ansicht für Noten und Prüfungen.

Die App arbeitet ohne eigenes Backend. Rapla- und Dualis-Daten werden direkt vom Gerät aus abgerufen; gespeicherte Einstellungen und der Stundenplan-Cache liegen lokal auf dem Gerät.

## Status

DHBW Planner ist keine offizielle App der DHBW.

## Features

- Geführte Kursauswahl über Standort, Studiengang und Kurs — ohne Rapla-Link
- Rapla-2.0-Stundenplan als manueller Fallback mit Tagesansicht, Wochenansicht, Kursdetails, Räumen und Dozentennamen
- Offline-Anzeige des zuletzt geladenen Stundenplans
- iCal-/ICS-Export über das native Share-Sheet
- Lokale Benachrichtigungen für Morgenübersichten, Live-Hinweise und Vorab-Erinnerungen
- Dualis-Login für Modulnoten, Credits, Semester und Prüfungsleistungen
- Eine Codebasis für Web, iOS und Android mit React, Vite und Capacitor

## Voraussetzungen

- Node.js 20 oder neuer
- npm
- Für iOS: macOS mit Xcode
- Für Android: Android Studio und ein passendes JDK, lokal getestet mit Java 21

## Entwicklung

```bash
npm install
npm test
npm run build
```

Web-Entwicklung:

```bash
npm run dev
```

Native Projekte synchronisieren:

```bash
npm run sync
```

iOS öffnen:

```bash
npx cap open ios
```

Android öffnen:

```bash
npx cap open android
```

## Rapla-Link

In der App wird der normale persönliche Rapla-Link eingetragen, zum Beispiel:

```text
https://rapla.dhbw.de/rapla/internal_calendar?user=max.muster@dhbw.example&file=DH-WINF24A+4.+Semester
```

Der Parser übernimmt `user` und `file`, normalisiert `internal_calendar` auf `calendar` und lädt die Kalenderwochen direkt vom Rapla-System.

Zusätzlich werden öffentliche Rapla-Freigabelinks mit den Parametern `key` und `salt` unterstützt. Aus Sicherheitsgründen akzeptiert die App nur Rapla-Links von `rapla.dhbw.de` mit dem Pfad `/rapla/calendar` oder `/rapla/internal_calendar`.

## Geführter Modus und DHBW-API

Der geführte Modus verwendet den öffentlichen Kurskatalog und den Kursplan der [DHBW-API](https://api.dhbw.app/api). Die Auswahl speichert nur Standort, Studiengang und Kurskennung; der Stundenplan wird anschließend direkt vom Gerät geladen. Ein eigenes Backend ist dafür nicht erforderlich.

Die App fragt den Kursplan zunächst vollständig für den ausgewählten Kurs ab und verwendet bei späteren Aktualisierungen den HTTP-`ETag`. Dadurch werden unveränderte Pläne nicht erneut übertragen. Die Delta-/Sync-Endpunkte werden bewusst nicht benötigt; der Rapla-Link bleibt als unabhängige Alternative erhalten.

Der Mensa-Plan wird im geführten Modus automatisch anhand des gewählten Standorts über den API-Endpunkt `/mensa/{site}` geladen. In den Einstellungen kann jederzeit eine andere Mensa manuell ausgewählt werden — beispielsweise, wenn man an einem anderen Standort zu Mittag isst.

Die Nutzung der öffentlichen DHBW-API wurde dem Projekt von Max Hardtke, dem Betreiber von [dhbw.app](https://dhbw.app/), ausdrücklich gestattet. Die technische Dokumentation und die verwendeten Endpunkte stehen in [docs/DHBW_API.md](docs/DHBW_API.md); private Kontaktdaten und der Mailverkehr werden nicht im Repository veröffentlicht.

Geladene Vorlesungsmodule können in den Einstellungen einzeln ausgeblendet werden. Der Filter gilt unabhängig davon, ob der Stundenplan über die DHBW-API oder über einen Rapla-Link geladen wurde.

## Datenschutz

Kurzfassung:

- Kein Tracking
- Kein eigenes Backend
- Rapla-Link bzw. API-Kursauswahl, Stundenplan-Cache und optionale Dualis-Einstellungen werden lokal gespeichert
- Dualis-Passwörter werden nicht dauerhaft gespeichert
- Netzwerkzugriffe gehen direkt an die konfigurierten DHBW-Systeme

Details stehen in [docs/PRIVACY.md](docs/PRIVACY.md).

## App Review

Für die Apple App Review gibt es einen vollständig lokalen, offen dokumentierten Demomodus. Er verwendet ausschließlich Beispieldaten und ruft weder Rapla noch Dualis auf. Die konkreten Eingaben und die Begründung für das öffentliche Repository stehen in [docs/APP_REVIEW_DEMO.md](docs/APP_REVIEW_DEMO.md).

## Projektstruktur

```text
src/
  dualis/                    Dualis-Client, Parser und Typen
  dhbwApi/                   Öffentlicher DHBW-Kurskatalog und Kursplan-Adapter
  ical/                      ICS-Export
  lib/                       Zeitfunktionen für Europe/Berlin
  notifications/             Planung und Registrierung lokaler Benachrichtigungen
  rapla/                     Rapla-Client und Rapla-2.0-Parser
  store/                     Persistente Einstellungen und Cache
  ui/                        React-Komponenten
tests/                       Parser-, Planner-, Dualis- und ICS-Tests
plugins/
  capacitor-course-live-activity/
                              Lokales Capacitor-Plugin für Live-Aktivitäten
```

## Veröffentlichung

Das Repository ist für eine öffentliche Veröffentlichung vorbereitet:

- Lizenz: GNU General Public License v3.0 or later
- Issue- und Security-Hinweise: [SECURITY.md](SECURITY.md)
- Beitragsleitfaden: [CONTRIBUTING.md](CONTRIBUTING.md)
- Release-/Store-Checkliste: [STORE_RELEASE.md](STORE_RELEASE.md)

## Mitwirken

Feature-Vorschläge, Bugs und Pull Requests sind willkommen. Vor einem Pull Request bitte [CONTRIBUTING.md](CONTRIBUTING.md) lesen und `npm test` sowie `npm run build` ausführen.

## Lizenz

DHBW Planner ist freie Software unter der GNU General Public License v3.0 oder neuer. Siehe [LICENSE](LICENSE).
