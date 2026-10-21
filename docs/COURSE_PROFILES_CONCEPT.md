# Kursprofile

Kursprofile ermöglichen den Wechsel zwischen mehreren Stundenplänen. Ein Hauptprofil steuert Erinnerungen und die weiteren App-Funktionen.

- Einzelnes Symbol im Kalenderkopf links neben Teilen und Einstellungen. Das Pop-up enthält Standort- und Kurskürzel sowie „+ Profil erstellen“. Ein kleiner Stern legt das Hauptprofil fest, daneben lassen sich Ansichtprofile löschen. Das Hauptprofil kann nach Zuordnung eines anderen Hauptprofils gelöscht werden. Keine dauerhafte Kursleiste oder Namenseingabe.
- Vorhandenen SetupWizard zum Hinzufügen wiederverwenden; Abbrechen kehrt zum aktuellen Kalender zurück.
- Im Pop-up direkt zwischen Kursen wechseln. Ein vorhandener Kurs wird beim erneuten Hinzufügen geöffnet.
- Bestehende Auswahl einschließlich Modulfiltern automatisch als Hauptkurs übernehmen.
- Erinnerungen, Live Activity, automatischer Kalenderabgleich, Dualis und Mail folgen dem ausdrücklich gewählten Hauptprofil.
- Weitere Stundenpläne werden ohne native Synchronisierung geladen, getrennt nach Quelle gecacht und aktualisiert. Beim App-Start und erneuten Öffnen aus dem Hintergrund wird wieder das Hauptprofil angezeigt. Datum und Kalenderansicht bleiben beim Wechsel erhalten.
- Auf Mobil eine vollständige Kalenderansicht pro Kurs. Keine horizontal abgeschnittenen Vergleichsspalten. Eine gemeinsame Zeitachse für mehrere Kurse auf iPad ist eine mögliche spätere Erweiterung und hier noch nicht implementiert.

Die Implementierung betrifft `courseProfiles.ts`, die Preferences, `useViewedSchedule`, `useSchedule`, `CourseProfiles`, App-Integration sowie kleinere Ergänzungen in SetupWizard, SettingsView und CSS. Zusätzliche Kursprofile erteilen keine Community-Berechtigungen und enthalten keine Dualis-Zugangsdaten.
