# Study options

Gemeinsamer Auswahlablauf für Onboarding und Einstellungen, jeweils als Entwurf pro Kursprofil.

- `index.ts`: öffentliche Komponenten und Erkennungshook für die App.
- `components/`: Darstellung, Kategorien, Auswahlzeilen und Setup-Schritt.
- `hooks/useModuleSelection.ts`: Laden, Entwurf, Gruppenwechsel, Übernehmen und Verwerfen.
- `hooks/useStudyOptions.ts`: Erkennung bei Plan-/Profilwechsel und Rückkehr zur App.
- `model/moduleChoices.ts`: reine Zusammenstellung von Wahlangeboten und gemeinsamen Modulen.
- `model/presentation.ts`: kurze Anzeigetitel und Gruppenkennungen; Originaltitel bleiben unverändert.
- `model/offerVariants.ts`: eindeutige Raumvarianten bündeln und nummerierte Alternativen desselben Labors erkennen.
- `model/types.ts`: gemeinsame Komponenten-Schnittstelle.
- `styles.css`: ausschließlich Styles dieser Funktion; nach den App-Grundstyles geladen.

Providergrenzen:

- `src/dhbwApi/studyOptions.ts`: aktueller Katalog und Beziehungen zwischen Haupt-, Sammel- und Gruppenplänen.
- `src/dhbwApi/studyPlan.ts`: Laden, ETags, Quellen-Caches und Zusammenführen der Termine.
- `src/schedule/studyOptions.ts`: konsistente Titel-/Quellklassifikation für Auswahl und Kalenderfilter.
- `src/schedule/studyGroups.ts`: Gruppenkennungen und Familien unabhängig von Schreibweise oder Jahrgang.
- `src/schedule/studyOptionProviders.ts`: verifizierte, kursgebundene Hochschulkonventionen; Belege und Grenzen in `docs/STUDY_OPTION_DETECTION_AUDIT.md`.
- `src/schedule/modules.ts`: Modulschlüssel, Modullisten und tatsächlicher Kalenderfilter.
- `src/store/preferences.ts`: gespeicherte Auswahl und Einrichtungsstatus im jeweiligen Kursprofil.

UI und Modell verändern keinen Kalender oder Benachrichtigungen direkt. Gemeinsame Termine bleiben einschließlich Historie enthalten; nur bestätigte persönliche Wahlangebote werden positiv gefiltert. Reine Zusatzquellen oder zeitliche Überschneidungen begründen keine Wahlpflicht. Unbekannte Hochschulkonventionen benötigen einen verifizierten Provideradapter.
