# DHBW Planner

DHBW Planner ist eine schlanke, plattformübergreifende App für Studierende der DHBW. Sie lädt persönliche Rapla-Stundenpläne direkt vom DHBW-Rapla-System, bereitet sie als Tages- und Wochenansicht auf, ergänzt lokale Erinnerungen und bietet zusätzlich eine Dualis-Ansicht für Noten und Prüfungen.

Die App arbeitet ohne eigenes Backend. Rapla- und Dualis-Daten werden direkt vom Gerät aus abgerufen; gespeicherte Einstellungen und der Stundenplan-Cache liegen lokal auf dem Gerät.

## Status

DHBW Planner ist keine offizielle App der DHBW.

## Features

- Rapla-2.0-Stundenplan mit Tagesansicht, Wochenansicht, Kursdetails, Räumen und Dozentennamen
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

## Datenschutz

Kurzfassung:

- Kein Tracking
- Kein eigenes Backend
- Rapla-Link, Stundenplan-Cache und optionale Dualis-Einstellungen werden lokal gespeichert
- Dualis-Passwörter werden nicht dauerhaft gespeichert
- Netzwerkzugriffe gehen direkt an die konfigurierten DHBW-Systeme

Details stehen in [docs/PRIVACY.md](docs/PRIVACY.md).

## Projektstruktur

```text
src/
  dualis/                    Dualis-Client, Parser und Typen
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
