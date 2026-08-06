# Security Policy

## Supported Versions

Aktuell wird die neueste Version im `main`-Branch unterstützt.

## Reporting a Vulnerability

Bitte melde Sicherheitsprobleme nicht als öffentliches Issue. Nutze GitHubs private vulnerability reporting Funktion, falls verfügbar, oder kontaktiere den Repository-Inhaber direkt über das GitHub-Profil.

Gib bitte an:

- betroffene Funktion
- Schritte zur Reproduktion
- mögliche Auswirkungen
- ob personenbezogene Daten oder Zugangsdaten betroffen sein könnten

## Sensitive Data

Die App soll keine Zugangsdaten dauerhaft speichern. Rapla-Link, Stundenplan-Cache und optionale Dualis-Einstellungen liegen lokal auf dem Gerät. Bitte öffne sofort eine private Sicherheitsmeldung, falls du ein Verhalten findest, bei dem Credentials geloggt, exportiert oder dauerhaft gespeichert werden.

## Lokale Speicherung und Sitzungen

- Android-App-Backups sind deaktiviert, weil Preferences- und Cache-Daten personenbezogene Stundenplan- oder Rapla-Informationen enthalten können.
- Dualis-Passwörter werden nicht gespeichert. Session-Cookies werden für die laufenden Dualis-Requests verwendet und beim Login/Logout aus dem nativen Cookie-Speicher entfernt.
- Die lokale Preferences-Speicherung ist nicht als zusätzliche Ende-zu-Ende-Verschlüsselung zu verstehen. Geräteverschlüsselung und Geräteschutz bleiben wichtig.

## Rapla-Links

Rapla-Links werden vor der Verwendung auf den unterstützten DHBW-Rapla-Host und die bekannten Kalenderpfade geprüft. Die App verwendet keine beliebige Host-Adresse aus einem Link als Netzwerkziel.
