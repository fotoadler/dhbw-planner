# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert.

## Unreleased

### Sicherheit und Robustheit

- Dualis-Session-Cookies werden nur für laufende Requests im Speicher gehalten; die automatische Capacitor-Cookie-Persistenz ist deaktiviert. Nach nativen Responses sowie beim Login und Logout wird ein nativer Cookie-Speicher zusätzlich best-effort bereinigt.
- Android-App-Backups sind deaktiviert, damit lokale Stundenplan-, Rapla- und Sessiondaten nicht automatisch gesichert werden.
- Rapla-Links werden auf den unterstützten Host und Pfad begrenzt. Persönliche `user`/`file`-Links sowie öffentliche `key`/`salt`-Freigabelinks werden unterstützt.
- Rapla-Antworten werden strukturell geprüft. Fehler- oder Loginseiten mit HTTP 200 werden nicht mehr als leere Kalenderwoche übernommen.
- Parallele Refreshes und doppelte Nachlade-Requests werden entkoppelt; nur der aktuellste Refresh darf den sichtbaren Zustand und Cache aktualisieren.
- Teilfehler beim Mehrwochenabruf führen nicht mehr zum Verwerfen aller erfolgreichen Wochen.
- Überlappende Termine werden in der Wochenansicht als kompakte Parallelgruppe dargestellt; die Tagesansicht enthält weiterhin alle Details.
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
