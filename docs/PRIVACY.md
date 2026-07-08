# Datenschutz

DHBW Planner ist so gebaut, dass keine eigene Server-Infrastruktur nötig ist.

## Lokal gespeicherte Daten

Die App kann lokal speichern:

- Rapla-Link und daraus abgeleitete Rapla-Konfiguration
- zuletzt geladene Stundenplantermine
- Benachrichtigungseinstellungen
- optional den Dualis-Benutzernamen, wenn „Benutzername merken“ aktiviert ist

Dualis-Passwörter werden nicht dauerhaft gespeichert.

Die lokale Speicherung erfolgt über die Plattform-Speichermechanismen von Capacitor Preferences. Sie ist für App-Einstellungen und Cache-Daten gedacht, ersetzt aber keine zusätzliche Ende-zu-Ende-Verschlüsselung innerhalb der App.

## Netzwerkzugriffe

Die App greift direkt auf die vom Nutzer konfigurierten DHBW-Systeme zu:

- Rapla zum Abrufen des Stundenplans
- Dualis zum Abrufen von Modulnoten und Prüfungsleistungen

Es gibt kein eigenes Backend und keine Weiterleitung dieser Daten an einen Projektdienst.

## Tracking

DHBW Planner enthält kein Tracking, keine Analytics-SDKs und keine Werbe-SDKs.

## Kalenderexport und Benachrichtigungen

ICS-Export und lokale Benachrichtigungen werden auf dem Gerät erzeugt. Beim Teilen einer Kalenderdatei entscheidet der Nutzer selbst, mit welcher App die Datei weiterverarbeitet wird.
