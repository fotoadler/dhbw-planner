# DHBW Planner

DHBW Planner ist eine schlanke, plattformübergreifende App für Studierende der DHBW. Stundenpläne können entweder geführt über Standort, Studiengang und Kurs aus der öffentlichen DHBW-API ausgewählt oder weiterhin über einen persönlichen Rapla-Link eingebunden werden. Die App bereitet beide Quellen als Tages-, Wochen- und Monatsansicht auf, ergänzt lokale Erinnerungen und bietet zusätzlich eine Dualis-Ansicht für Noten und Prüfungen.

Die App arbeitet ohne eigenes Backend. Rapla- und Dualis-Daten werden direkt vom Gerät aus abgerufen; gespeicherte Einstellungen und der Stundenplan-Cache liegen lokal auf dem Gerät.

## Status

Aktuelle Store-Version: **1.5.5** für [iOS](https://apps.apple.com/de/app/dhbw-planner/id6791134218) und [Android](https://play.google.com/store/apps/details?id=de.dhbw.raplaplan). Änderungen stehen im [Changelog](CHANGELOG.md), Buildnummern in [STORE_RELEASE.md](STORE_RELEASE.md).

DHBW Planner ist keine offizielle App der DHBW.

## Features

- Geführte Kursauswahl über Standort, Studiengang und Kurs — ohne Rapla-Link
- Rapla-2.0-Stundenplan als manueller Fallback mit Tagesansicht, Wochenansicht, Monatsansicht, Kursdetails, Räumen und — sofern die Quelle sie liefert — Dozentennamen
- Offline-Anzeige des zuletzt geladenen Stundenplans
- Optionale Synchronisierung mit dem Gerätekalender in der Android- und iOS-App
- Lokale Benachrichtigungen für Morgenübersichten, Live-Hinweise und Vorab-Erinnerungen
- Dualis-Login für Modulnoten, Credits, Semester und Prüfungsleistungen
- Uni-Mail als eingebettete Ansicht des standorteigenen Webmail-Logins; Standorte ohne bestätigten Zugang zeigen dort eine Hilfe statt eines geratenen Logins
- Helles und dunkles Design, dem Systemdesign folgend oder fest eingestellt
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

Zusätzlich werden öffentliche Rapla-Freigabelinks mit dem Parameter `key` (ältere Variante zusätzlich mit `salt`, neuere `key=v2:…` ohne `salt`) unterstützt. Aus Sicherheitsgründen akzeptiert die App nur Rapla-Links von `rapla.dhbw.de` mit dem Pfad `/rapla/calendar` oder `/rapla/internal_calendar`.

## Geführter Modus und DHBW-API

Der geführte Modus verwendet den öffentlichen Kurskatalog und den Kursplan der [DHBW-API](https://api.dhbw.app/api). Die Auswahl speichert Standort, Studiengang, Kurskennung und die persönliche Modul-/Gruppenauswahl je Profil; der Stundenplan wird anschließend direkt vom Gerät geladen. Ein eigenes Backend ist dafür nicht erforderlich.

Die App fragt den Kursplan zunächst vollständig für den ausgewählten Kurs ab und verwendet bei späteren Aktualisierungen den HTTP-`ETag`. Dadurch werden unveränderte Pläne nicht erneut übertragen. Die Delta-/Sync-Endpunkte werden bewusst nicht benötigt; der Rapla-Link bleibt als unabhängige Alternative erhalten.

Der verwendete Kursplan-Endpunkt liefert mit `archived=true` auch vergangene Termine. Dadurch können im geführten Modus historische Stundenplanwochen angezeigt werden, sofern die API diese Termine noch bereitstellt. Die API kann Dozentennamen je nach Datenquelle und Zugriffssituation leer liefern. Die App übernimmt Namen aus dem API-Feld beziehungsweise aus eingebetteten Angaben und ergänzt bekannte Namen aus einem lokalen Dozenten-Verzeichnis; eine vollständige Dozentenanzeige kann daher nicht garantiert werden.

Der Mensa-Plan wird im geführten Modus automatisch anhand des gewählten Standorts geladen. In den Einstellungen kann jederzeit eine andere Mensa manuell ausgewählt werden — beispielsweise, wenn man an einem anderen Standort zu Mittag isst. Weil die Standorte unterschiedliche Betreiber und Datenlagen haben, beschreibt jeder Standort sein Angebot als eigenes Profil; Aufbau und Erweiterung stehen in [docs/MENSA_INTEGRATION.md](docs/MENSA_INTEGRATION.md).

Die Nutzung der öffentlichen DHBW-API wurde dem Projekt von Max Hardtke, dem Betreiber von [dhbw.app](https://dhbw.app/), ausdrücklich gestattet. Die technische Dokumentation und die verwendeten Endpunkte stehen in [docs/DHBW_API.md](docs/DHBW_API.md); private Kontaktdaten und der Mailverkehr werden nicht im Repository veröffentlicht.

Bei erkannten Wahlangeboten folgt nach der Kurswahl ein zusätzlicher Schritt „Deine Kurswahl“. Persönliche Seminare, Schwerpunkte, Wahlmodule und Gruppen lassen sich dort auswählen; gemeinsame und historische Termine bleiben enthalten. Bestehende Profile erhalten bei offener Konfiguration einen Hinweis. Details und Erkennungsgrenzen stehen in [docs/ELECTIVES_CONCEPT.md](docs/ELECTIVES_CONCEPT.md).

Geladene Vorlesungsmodule können in den Einstellungen einzeln ausgeblendet werden. Der Filter gilt unabhängig davon, ob der Stundenplan über die DHBW-API oder über einen Rapla-Link geladen wurde.

In den Einstellungen kann außerdem festgelegt werden, ob der Kalender beim Öffnen standardmäßig die Tages-, Wochen- oder Monatsansicht zeigt. Die Monatsansicht zeigt vollständige Wochen von Montag bis Sonntag. Auf Smartphones markieren Punkte und Zähler die Termine, auf größeren Displays erscheinen zusätzlich Uhrzeiten und Titel. Ein Tipp auf einen Tag öffnet das Detailfenster mit allen Terminen des Tages und einem Button zur Tagesansicht; die Pfeile wechseln den Monat und „Heute“ führt zum aktuellen Monat zurück.

Am Samstag und Sonntag zeigt die Wochenansicht immer beide Wochenendtage. Unter der Woche bleiben Samstag beziehungsweise Sonntag sichtbar, sobald dort ein geladener Termin liegt – auch ein Ganztagshinweis oder ein Termin eines ausgeblendeten Moduls. Nur leere Wochenendtage werden ausgeblendet. Dieselbe Regel gilt für die Tagesleiste und Tagesnavigation. Der heutige Tag und die Sichtbarkeit aktualisieren sich in Berliner Ortszeit, auch nach Mitternacht oder beim Zurückkehren zur App.

## Datenschutz

In den installierten Android- und iOS-Apps lässt sich über den Teilen-Button die Synchronisierung mit dem Gerätekalender aktivieren. Ein Dialog erklärt zuerst den Abgleich; erst nach Bestätigung wird die native Kalenderberechtigung angefordert. Nach Freigabe des Kalenderzugriffs legt die App einen eigenen Kalender „DHBW Planner“ an. Nach erfolgreichen Stundenplanabrufen werden alle geladenen, nicht ausgeblendeten Termine einschließlich vergangener Semester abgeglichen. Nur app-eigene, markierte Termine werden bearbeitet; Löschungen erfolgen erst nach einem vollständigen erfolgreichen Abruf. Teilabrufe ergänzen Termine, ohne bestehende zu löschen. Ein Kurswechsel ersetzt die bisherigen app-eigenen Kurstermine nach erfolgreichem Abruf automatisch. Beim Deaktivieren pausiert der Abgleich, bereits übertragene Termine bleiben bestehen. Eine Aktualisierung bei geschlossener App ist nicht garantiert.

Der Teilen-Button öffnet zunächst die Erklärung und nach der Aktivierung die Verwaltung zum Aktualisieren oder Pausieren. Der frühere ICS-Export wurde entfernt, weil importierte Dateien keine automatische Aktualisierung ermöglichen. Im Browser steht die native Synchronisierung nicht zur Verfügung. Bereits früher importierte Termine gehören nicht zum neuen App-Kalender und werden nicht verändert; sie können vor der Aktivierung manuell entfernt werden, um Doppelanzeigen zu vermeiden.

Abgleichsregeln, lokale Prüfergebnisse und noch erforderliche Geräteprüfungen stehen in [docs/CALENDAR_SYNC.md](docs/CALENDAR_SYNC.md).

Kurzfassung:

- Kein Tracking
- Kein eigenes Backend
- Rapla-Link bzw. API-Kursauswahl, Stundenplan-Cache, Mensa-Cache, ausgeblendete Module, das lokale Dozenten-Verzeichnis und optionale Dualis-Einstellungen werden lokal gespeichert
- Dualis-Passwörter bleiben ohne „Angemeldet bleiben“ im Arbeitsspeicher; mit der freiwilligen Option werden die Zugangsdaten auf iOS/Android im nativen Secure Storage gespeichert
- Netzwerkzugriffe gehen an Rapla, Dualis, die öffentliche API unter `api.dhbw.app`, Mensa-Anbieter und das jeweilige Webmail-System

Details stehen in [docs/PRIVACY.md](docs/PRIVACY.md).

## DHBW-Standorte, Dualis und Uni-Mail

DUALIS wird zentral für die DHBW betrieben, die Login-Domains und Mailplattformen unterscheiden sich jedoch je nach Standort. Die App führt diese Regeln in einem modularen Standortprofil und verwendet für unbekannte oder nicht eindeutig dokumentierte Account-Domains die unveränderte vollständige E-Mail-Adresse. Die verifizierte Übersicht und die Erweiterungsanleitung stehen in [docs/DHBW_SITE_INTEGRATIONS.md](docs/DHBW_SITE_INTEGRATIONS.md).

## App Review

Für die Apple App Review gibt es einen vollständig lokalen, offen dokumentierten Demomodus. Er verwendet ausschließlich Beispieldaten und ruft weder Rapla noch Dualis auf. Die konkreten Eingaben und die Begründung für das öffentliche Repository stehen in [docs/APP_REVIEW_DEMO.md](docs/APP_REVIEW_DEMO.md).

## Projektstruktur

```text
src/
  demo/                      Lokaler Demomodus für die App Review
  calendar/                  Abgleich mit dem nativen Gerätekalender
  dhbw/                      Standortprofile für Dualis- und Mail-Integrationen
  dhbwApi/                   Öffentlicher DHBW-Kurskatalog und Kursplan-Adapter
  dualis/                    Dualis-Client, Parser und Typen
  features/study-options/    Gemeinsame Kurswahl für Einrichtung und Einstellungen
  lib/                       Zeit-, Theme- und Haptik-Helfer sowie Projektlinks
  liveActivity/              Live-Aktivitäten und deren Planung
  mail/                      Mail-Adapter und Brücke zur nativen Mailansicht
  mensa/                     Standortprofile und Normalisierung der Essensangebote
  notifications/             Planung und Registrierung lokaler Benachrichtigungen
  rapla/                     Rapla-Client und Rapla-2.0-Parser
  schedule/                  Stundenplanmodell und Modulfilter
  seezeit/                   Seezeit-Speisepläne für Ravensburg und Friedrichshafen
  store/                     Persistente Einstellungen und Cache
  ui/                        React-Komponenten
prototypes/                  Getrennte historische Konzeptvorschauen
docs/                        Funktionsdokumentation, Prüfberichte und Screenshots
tests/                       Parser-, Planner-, Dualis-, Kalender- und Layouttests
plugins/
  capacitor-calendar-sync/  EventKit / Android Calendar Provider
  capacitor-course-live-activity/
                             Live-Aktivitäten auf iOS
  capacitor-embedded-mail/   Native Mailansicht über der App
  capacitor-community-messaging/
                             Community-Nachrichten
  capacitor-secure-storage/  Verschlüsselte Ablage für Sitzungsgeheimnisse
```

## Veröffentlichung

Informationen zum Projekt:

- Lizenz: GNU General Public License v3.0 or later
- Issue- und Security-Hinweise: [SECURITY.md](SECURITY.md)
- Beitragsleitfaden: [CONTRIBUTING.md](CONTRIBUTING.md)
- Release-/Store-Checkliste: [STORE_RELEASE.md](STORE_RELEASE.md)

## Finanzierung und Unterstützung

Freiwillige In-App-Käufe helfen, einen Teil der jährlichen Betriebskosten zu decken. In der iOS- und Android-App kannst du die App mit 1, 3, 5 oder 10 € unterstützen. Preise und Währung richten sich nach deinem Store-Land.

Die Grundfunktionen der App bleiben kostenlos und werbefrei. Als Dankeschön erhalten alle Unterstützer unabhängig vom Betrag Widgets für iOS und Android sowie ein optionales goldenes App-Symbol. Auch bestehende lokal gespeicherte Unterstützungen werden berücksichtigt. Neue dauerhafte Käufe lassen sich mit demselben Store-Konto nach Neuinstallation oder Gerätewechsel wiederherstellen; für frühere Verbrauchskäufe gelten die [Grenzen der Store-Historie](docs/SUPPORT.md#dauerhafte-freischaltung-und-weitere-unterstützung). Weitere Unterstützungen bleiben beliebig oft möglich.

Die Widgets gibt es in klein (laufende/nächste Vorlesung), mittel (nächste Termine) und groß (Tagesübersicht). Ein Tippen öffnet die passende Tagesansicht des Hauptkurses. Sie beachten deine Modulfilter und unterscheiden „Heute keine Vorlesung“, „Für heute geschafft“ und fehlende Daten. Grundlage ist der zuletzt in der App geladene Stundenplan; der Datenstand wird bei ausreichendem Platz angezeigt. Widgets laden selbst keine neuen Stundenplandaten aus dem Netz. Auf dem iPhone lässt sich die Größe über langes Drücken auf das Widget ändern. Die Darstellung passt sich der Größe und der Systemschrift an; bei großer Schrift werden weniger Details angezeigt.

Die Umsetzung und Store-Einrichtung sind in [docs/SUPPORT.md](docs/SUPPORT.md) beschrieben.

Aktuelle Store-Aufnahmen mit Beispieldaten: [iPhone](app-store-screenshots/iphone/), [iPad](app-store-screenshots/ipad/), [Android](app-store-screenshots/android/) und [Banner](app-store-screenshots/banners/).

## Mitwirken

Feature-Vorschläge, Bugs und Pull Requests sind willkommen. Vor einem Pull Request bitte [CONTRIBUTING.md](CONTRIBUTING.md) lesen und `npm test` sowie `npm run build` ausführen.

## Lizenz

DHBW Planner ist freie Software unter der GNU General Public License v3.0 oder neuer. Siehe [LICENSE](LICENSE).
