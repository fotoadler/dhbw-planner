# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert.

## Unreleased

### Funktionen und Darstellung

- Geführte Stundenplanauswahl über DHBW-Standort, Studiengang und Kurs ergänzt; der manuelle Rapla-Modus bleibt als Alternative erhalten.
- Mensa-Speisepläne werden im geführten Modus standardmäßig passend zum Standort geladen und können in den Einstellungen manuell auf eine andere Mensa umgestellt werden.
- Vorlesungsmodule können in den Einstellungen gesucht und einzeln ausgeblendet werden; der Filter gilt für API- und Rapla-Pläne sowie deren Benachrichtigungen.
- Der geführte API-Modus lädt mit `archived=true` auch vergangene Termine und ermöglicht die Navigation zu historischen Stundenplanwochen, soweit diese von der API bereitgestellt werden.
- Dozentenangaben werden aus API-Feldern und eingebetteten Terminangaben aufbereitet. Ein lokales Verzeichnis ergänzt bekannte Zuordnungen, wenn die Quelle vorübergehend keine Dozenten liefert.
- Wochenansicht, parallele Termine, Titelumbrüche und die Navigation zwischen Wochen wurden für schmalere und breitere Geräte verbessert.

### Entwicklung und Dokumentation

- Die öffentliche API-Nutzung, ihre Grenzen und die lokale Datenverarbeitung sind in `docs/DHBW_API.md` und `docs/PRIVACY.md` dokumentiert.
- Der öffentliche `main`-Branch ist gegen Force-Pushes und Löschung geschützt. Pull Requests beziehungsweise Änderungen am Hauptbranch müssen den GitHub-Actions-Check `web-quality` mit Tests und Produktions-Build bestehen.

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
