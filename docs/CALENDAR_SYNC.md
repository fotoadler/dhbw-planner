# Gerätekalender-Synchronisierung

Die installierte App synchronisiert nach ausdrücklicher Aktivierung einen eigenen Kalender „DHBW Planner“. Es wird keine Abo-URL benötigt. Der Teilen-Button öffnet einen erklärenden Dialog in der Kalenderansicht. Erst dessen Bestätigung fordert über dasselbe Capacitor-Plugin die native Android- beziehungsweise iOS-Kalenderberechtigung an. Nach Freigabe erfolgt der erste Abgleich mit den vorhandenen Daten. Bei bestehender Aktivierung zeigt der Button die Verwaltung zum Aktualisieren und Pausieren; die Einführung entfällt. Die Einstellungen enthalten keine separate Aktivierung mehr. Jeder erfolgreiche Stundenplanabruf synchronisiert erneut. Im Browser und im Demomodus ist die Aktivierung gesperrt. Der bisherige ICS-Export entfällt. Alte ICS-Importe werden nicht verändert und müssen bei Bedarf manuell entfernt werden.

## Abgleich

- Zeitraum: Berliner Mitternacht sieben Tage zurück bis 90 Tage voraus. Diese Obergrenze liegt auch sonntags innerhalb des vollständig geladenen Rapla-Fensters.
- Gefilterte Module werden berücksichtigt. Titel, Zeiten, Räume, Dozenten und Kursangaben werden übertragen.
- Android verwendet einen lokalen Kalender mit fester App-Kennung. iOS speichert die Kennung des angelegten EventKit-Kalenders und bevorzugt eine lokale Quelle; alternativ wird die Quelle des Standardkalenders verwendet.
- Nur Termine mit gültiger App-Markierung im eigenen Kalender werden geändert oder gelöscht. Andere Kalender und manuelle Einträge bleiben bestehen.
- Identität: SHA-256 aus Beginn, Titel und Kurs. Raum-/Dozenten-/Endzeitänderungen aktualisieren denselben Termin; ein verschobener oder umbenannter Termin ersetzt den bisherigen beim vollständigen Abgleich.
- Native Schreibvorgänge laufen seriell. Überholte, noch nicht gestartete Snapshots werden übersprungen. Zuerst werden alle aktuellen Termine gespeichert, danach darf gelöscht werden.
- Löschungen erfolgen ausschließlich nach vollständigen erfolgreichen Abrufen. Einstellungen, Cache- und einzelne Wochenabrufe dürfen ergänzen, aber nicht löschen. Kalenderfehler ändern den Online-Status des Stundenplans nicht.
- Ganztagsdaten werden als UTC-Datumswerte übertragen: Android erwartet diese Darstellung; iOS stellt Berliner Tagesgrenzen wieder her und setzt das Ganztagsmerkmal nach den Datumswerten. Sommerzeit kann einen Kalendertag auf 23 oder 25 Stunden begrenzen.
- Deaktivierung pausiert den Abgleich und lässt vorhandene Termine bestehen. Historische Termine außerhalb des Fensters bleiben erhalten. Eine Aktualisierung bei geschlossener App wird nicht garantiert.

## Lokale Prüfung am 11. Oktober 2026

Web-Regressionstests prüfen Aktivierung, abgelehnte Berechtigungen, Web-/Demosperre, Einstellungenmigration, Bereichsgrenzen, Sommerzeit, Identitäten, Deduplizierung, veraltete Snapshots und Fehlerisolierung. Ein App-Test prüft den neuen Kalender-Button und den entfallenen ICS-Export.

Im Android-16-Emulator (API 36.1) wurde der native Capacitor-Aufruf in der gebauten App geprüft: Kalender anlegen, Termine anlegen und ändern, wiederholter Abgleich ohne Duplikate, Ganztagstermin, Teilabruf ohne Löschung, vollständige und leere Snapshots mit Löschung sowie Erhalt eines manuell angelegten Termins im App-Kalender. Auch die echte Android-Berechtigungsabfrage wurde bestätigt.

Auf einem frischen iOS-26.5-Simulator wurden dieselben Abgleichsfälle in einem isolierten EventKit-Testprogramm mit dem kompilierten Kalender-Plugin geprüft. Der Ganztagstermin am 29. März 2026 blieb auf den korrekten Berliner Datumstag begrenzt. Der Kalenderzugriff wurde dort über `simctl privacy` freigegeben; der iOS-Berechtigungsdialog selbst ist damit noch nicht geprüft.

Android-Debug- und iOS-Simulator-Build wurden geprüft. Mit Xcode 27 benötigen bestehende Pods eine höhere Build-Mindestversion; der Simulator-Build verwendet daher den lokalen Parameter `IPHONEOS_DEPLOYMENT_TARGET=16.2`. Die Mindestversionen des Projekts werden dadurch nicht geändert.

## Vor Veröffentlichung auf echten Geräten

1. Auf Android und iOS aktivieren, Kalenderzugriff zunächst ablehnen und anschließend zulassen. Der verweigerte Zugriff muss verständlich gemeldet werden.
2. Den Kalender „DHBW Planner“ in der Kalender-App einschalten. Uhrzeiten, Ganztagstermine, mehrere Tage und Sommerzeitgrenzen prüfen.
3. Einen vollständigen erneuten Abruf ausführen: keine Duplikate. Einen bekannten Raum-/Zeitwechsel und einen entfernten Termin mit der Quelle vergleichen.
4. Offline-Abruf und Teilfehler prüfen: keine vorhandenen Termine verschwinden. Manuelle Einträge im App-Kalender und Einträge anderer Kalender bleiben erhalten.
5. Abgleich deaktivieren: keine weiteren Aktualisierungen, bisherige Termine bleiben. Zugriff im Betriebssystem entziehen: der Stundenplan bleibt nutzbar.
6. iCloud-/Google-/Exchange-Konten und verfügbare lokale Kalender prüfen. Simulatorergebnisse ersetzen keine Geräte- oder Kontoprüfung.

## Integration bei Capacitor-Builds

Die native Implementierung liegt als lokales Paket unter `plugins/capacitor-calendar-sync`, wird in `package.json` referenziert und über die Capacitor-Metadaten automatisch registriert. Android-Berechtigungen stammen aus dem Plugin-Manifest; die iOS-Nutzungstexte stehen in der versionierten App-`Info.plist`. Native Quelltexte und Podspec werden nicht in generierte Build- oder Web-Asset-Dateien geschrieben. Ein erneutes `npx cap sync` erzeugt die Projektverweise und Registrierung aus diesen Quellen. Am 11. Oktober 2026 wurden zwei aufeinanderfolgende Sync-Läufe geprüft: Plugin-Quellen und iOS-Berechtigungstexte blieben unverändert; beide Plattformen enthielten weiterhin die Plugin-Registrierung.
