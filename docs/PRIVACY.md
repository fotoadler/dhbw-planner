# Datenschutz

DHBW Planner ist so gebaut, dass keine eigene Server-Infrastruktur nötig ist.

## Lokal gespeicherte Daten

Die App kann lokal speichern:

- Rapla-Link und daraus abgeleitete Rapla-Konfiguration
- ausgewählter DHBW-Standort, Studiengang und Kurskennung im geführten Modus
- zuletzt geladene Stundenplantermine
- Benachrichtigungseinstellungen
- optional den Dualis-Benutzernamen, wenn „Benutzername merken“ aktiviert ist

Dualis-Passwörter werden nicht dauerhaft gespeichert.

Die lokale Speicherung erfolgt über die Plattform-Speichermechanismen von Capacitor Preferences. Sie ist für App-Einstellungen und Cache-Daten gedacht, ersetzt aber keine zusätzliche Ende-zu-Ende-Verschlüsselung innerhalb der App.

Auf Android sind automatische App-Backups für diese lokalen Daten deaktiviert. Bei Dualis werden Session-Cookies beim Login und Abmelden aus dem nativen Cookie-Speicher entfernt.

## Netzwerkzugriffe

Die App greift direkt auf die vom Nutzer konfigurierten DHBW-Systeme zu:

- Rapla zum Abrufen des Stundenplans
- die öffentliche DHBW-API für Standort-/Kurskatalog und geführte Stundenpläne
- die öffentliche DHBW-API für den automatisch gewählten oder manuell ausgewählten Mensa-Speiseplan
- Dualis zum Abrufen von Modulnoten und Prüfungsleistungen

Es gibt kein eigenes Backend und keine Weiterleitung dieser Daten an einen Projektdienst.

## Tracking

DHBW Planner enthält kein Tracking, keine Analytics-SDKs und keine Werbe-SDKs.

## Kalenderexport und Benachrichtigungen

ICS-Export und lokale Benachrichtigungen werden auf dem Gerät erzeugt. Beim Teilen einer Kalenderdatei entscheidet der Nutzer selbst, mit welcher App die Datei weiterverarbeitet wird.
