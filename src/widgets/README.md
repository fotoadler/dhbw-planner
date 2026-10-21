# Stundenplan-Widgets

Optionaler nativer Home-Bildschirm-Zugang für Unterstützer; unabhängig von der normalen Kalenderdarstellung und den Datenabrufen.

- `snapshot.ts`: reduziert den gefilterten Hauptkurs auf höchstens 14 Berliner Kalendertage. Unbekannte Wochen bleiben als unbekannt markiert; gesperrte Snapshots enthalten keine Termine.
- `useWidgets.ts`: serialisierte native Speicherübergabe und Tages-Deep-Links, einschließlich Kaltstart vor Abschluss der Initialisierung.
- `index.ts`: öffentliche Anbindung in `App.tsx`. Der Berechtigungsstatus kommt aus `src/support/`.

Native Darstellung und Aktualisierung müssen in den Plattformprojekten liegen:

- iOS: `ios/App/App/ScheduleWidgetsPlugin.swift` und `ios/App/CourseLiveActivityWidget/Schedule/`. Gemeinsame App Group `group.de.dhbw.raplaplan.widgets`; bestehende Live-Aktivität bleibt Bestandteil derselben Erweiterung.
- Android: `ScheduleWidgetsPlugin.java`, `ScheduleWidgetProvider.java`, drei Größen-Anbieter und `schedule_widget*`-Ressourcen. Android kann geplante Aktualisierungen verzögern.

Keine eigenen Netzwerkzugriffe, Konten oder Zahlungslogik im Widget-Modul. Ein Antippen öffnet `dhbwplanner://day?date=YYYY-MM-DD&profile=...`; bei fehlender Freischaltung `dhbwplanner://support`.

Tests: `npm test -- tests/widgets`; Androids `ScheduleWidgetRenderTest` prüft die echten RemoteViews in allen Größen und Leer-/Sperrzuständen. Native Builds und Render-Tests ersetzen keinen Home-Bildschirm- und Store-Test auf realen Geräten.

Die Gestaltung verwendet einfarbige helle/dunkle Flächen ohne Verläufe, die DHBW-Akzentfarbe und feste, einzeilige Uhrzeiten. Im großen Leerzustand ergänzen die nächsten sieben Tage und der nächste geladene Vorlesungstermin die Tagesmeldung; der Termin öffnet seine Tagesansicht. Die lokale Daten-/Freischaltungslogik ist davon unabhängig.


Auf iOS wird Dynamic Type berücksichtigt. Bei größerer Schrift wählt die Darstellung weniger Terminzeilen und anschließend eine kompakte Ansicht mit Uhrzeit und Titel; dekorative/sekundäre Angaben entfallen zuerst. Lange Namen können innerhalb der gewählten Textzeilen gekürzt werden. Die vollständige Zusammenfassung bleibt für VoiceOver verfügbar. Kleine Bildschirme reduzieren zusätzlich Terminzahl, Illustration und Wochenleiste, damit der nächste Termin und der Datenstand Platz haben.

Das Widget registriert alle drei `supportedFamilies` unter einem einzigen Kind `DHBWSchedule`. Den nativen Größenwechsel/Griff stellt iOS bereit; die App zeichnet keinen eigenen Ziehgriff. Die Darstellung richtet sich nach `widgetFamily` und den tatsächlichen Inhaltsabmessungen. Der native Schriftgrößen-Audit liegt in `tests/widgets/ios/`.

Im manuellen Rapla-Modus bleibt `course` leer: Profil-/Dateinamen sind kein verlässlicher Kursname. Beide nativen Widgets lassen diese Zeile vollständig weg. Leere Räume entfallen ebenfalls. Unbekannte Wochen bleiben als nicht geladen markiert; Tag und Profil im Deep-Link benötigen keinen Kursnamen.
