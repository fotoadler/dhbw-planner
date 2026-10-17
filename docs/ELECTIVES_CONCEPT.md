# Wahlkurse und Gruppen

Stand: 17. Oktober 2026. Die Funktion ist in der produktiven React-App implementiert; die Store-Auslieferung wird separat in [STORE_RELEASE.md](../STORE_RELEASE.md) dokumentiert.

## Aktuelle Bedienung

Nach Standort, Studiengang und Kurs folgt bei erkannten Angeboten „Deine Kurswahl“. Persönliche Wahlmodule, Seminare, Übungen, Schwerpunkte und Gruppen beginnen abgewählt. Gemeinsame Termine und die Historie bleiben ohne Einzelwahl enthalten. „Weiter zum Kalender“ übernimmt den Entwurf; Abbrechen speichert ihn nicht. Die Auswahl ist keine Anmeldung an der Hochschule.

Nachträgliche Änderungen erfolgen je Kursprofil unter **Einstellungen → Vorlesungsmodule → Module auswählen**. Die Suche durchsucht Wahlangebote; gewöhnliche Module stehen unter „Übrige Module bearbeiten“. Der Kalenderkopf erhält keinen zusätzlichen Einstellungsbutton. Tag, Woche und Monat bleiben verfügbar.

Zusätzliche Sammelpläne werden nur über bestätigte Kursbeziehungen eingebunden. Nummerierte Gruppenpläne sind innerhalb ihrer Familie alternativ; eingebettete Gruppen desselben Labors verdrängen keine Auswahl in anderen Laboren. Explizite Raum- und Online-/Präsenzvarianten desselben Angebots teilen sich eine Auswahlzeile und behalten sämtliche Originalschlüssel.

## Bestandsprofile und Profilwechsel

`optionsConfiguredKey` speichert eine ausdrücklich übernommene Konfiguration. `optionsNoticeKey` merkt die Anzeige des Hinweises; ein alter `optionsNoticeSeen`-Wert ersetzt keinen Abschluss. Die Erkennung verwendet `choices-v4`, sodass bestehende Profile die überarbeitete Auswahl erneut prüfen können.

Prüfungen laufen beim Betrachten eines anderen Profils, nach Planaktualisierung und bei Rückkehr zur App. „Später“ verändert die Belegung nicht. Eine bewusst leere übernommene Wahl gilt als abgeschlossen. Neue Quellen oder Angebotsarten können erneut eine Prüfung auslösen; neue einzelne Seminartitel erzeugen kein Popup bei jedem Refresh. Hauptprofil und betrachtetes Profil bleiben getrennt: Ansichtskurse steuern keine Erinnerungen oder Kalenderexporte.

## Architektur und Grenzen

Die gemeinsame Oberfläche liegt unter `src/features/study-options/`, der Quellenadapter unter `src/dhbwApi/` und die Titel-/Providerklassifikation unter `src/schedule/`. Details: [Feature-README](../src/features/study-options/README.md), [Erkennungsprüfung](STUDY_OPTION_DETECTION_AUDIT.md) und [visuelle Prüfung](STUDY_OPTIONS_QA.md).

Allgemeine Kennungen funktionieren unabhängig vom Jahrgang. Fachspezifische Kürzel und unbeschriftete Altbestände benötigen belegte Providerregeln. Die API liefert keine persönliche Einschreibung, vollständige Belegordnung oder garantierte Beziehung aller Zusatzpläne. Aus Überschneidungen allein wird keine Wahlpflicht abgeleitet.

## Historische Entwürfe

Das [ursprüngliche Konzept](archive/ELECTIVES_CONCEPT_2026-10-16.md) enthält auch nicht umgesetzte Ideen. Die getrennte klickbare Konzeptvorschau liegt ausschließlich unter `prototypes/electives/` und ist über `/prototypes/electives.html` im Entwicklungsserver erreichbar. Sie wird nicht in das Store-Bundle importiert.
