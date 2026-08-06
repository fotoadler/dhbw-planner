# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert.

## Unreleased

### Sicherheit und Robustheit

- Dualis-Session-Cookies werden beim Login und Logout aus dem nativen Cookie-Speicher entfernt; Dualis-Passwörter bleiben weiterhin nur im Speicher.
- Android-App-Backups sind deaktiviert, damit lokale Stundenplan-, Rapla- und Sessiondaten nicht automatisch gesichert werden.
- Rapla-Links werden auf den unterstützten Host und Pfad begrenzt. Persönliche `user`/`file`-Links sowie öffentliche `key`/`salt`-Freigabelinks werden unterstützt.
- Rapla-Antworten werden strukturell geprüft. Fehler- oder Loginseiten mit HTTP 200 werden nicht mehr als leere Kalenderwoche übernommen.
- Parallele Refreshes und doppelte Nachlade-Requests werden entkoppelt; nur der aktuellste Refresh darf den sichtbaren Zustand und Cache aktualisieren.
- Teilfehler beim Mehrwochenabruf führen nicht mehr zum Verwerfen aller erfolgreichen Wochen.
- Nachgeladene Einzelwochen werden zusammen mit Benachrichtigungen und Live Activity persistiert und synchronisiert.
- Preferences und Cache werden zur Laufzeit validiert. Die neuen Storage-Schemata sind versioniert und lesen bestehende `v1`-Daten kompatibel weiter.

## 1.0.0

- Erste öffentliche Vorbereitung von DHBW Planner
- Rapla-2.0-Stundenplanparser
- Tages- und Wochenansicht
- ICS-Export
- Lokale Benachrichtigungen
- Dualis-Ansicht für Modulnoten und Prüfungen
- iOS- und Android-Projekte über Capacitor
