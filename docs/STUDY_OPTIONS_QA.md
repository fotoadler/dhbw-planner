# Kurswahl: Struktur und visuelle Prüfung

Stand: 17.10.2026. Browseraufnahmen der ursprünglichen fünf Varianten vom 16.10.2026; ergänzende Erkennungsprüfung vom 17.10.2026. Geprüft in der echten lokalen Web-App mit öffentlichen DHBW-Kursdaten. Keine reine Konzeptdemo und kein neuer nativer Gerätebuild.

## Screenshots

[Galerie mit Handy, Desktop und dunklem Design](screenshots/study-options/index.html)

| Variante | Beispielkurs | Prüfung |
| --- | --- | --- |
| Stuttgart | STG-SO25A | Seminare, Wahlmodule, Studienrichtungen und benannte Gruppen im zugehörigen Zusatzplan erkannt |
| Villingen-Schwenningen | VS-WCC25 | Zusätzliche Gruppenpläne; Wechsel 1 → 2; Speichern und Wiederöffnen der gewählten Gruppe |
| Mosbach | MOS-TEIT25 | Exklusive Laborgruppe 1/2 und eingebettete Gruppenmodule |
| Friedrichshafen | FN-TWI24-1 | Wahlmodule im Grundplan; Auswahlzähler, lange Titel und Suche |
| Mannheim | MA-TCT24 | Eigene Gruppenauswahl je Labor; doppelte reine Raumhinweise zu einer Auswahl gebündelt |

Aufnahmen: 390 × 844 px hell/dunkel und 1280 × 900 px hell. Alle fünf Varianten visuell kontrolliert. Kein horizontaler Überlauf, lange Titel umbrechen, Kopf bleibt sichtbar, Weiter-Button bleibt am unteren Rand und ist mindestens 48 px hoch. Historische Angebote werden zeitlich nicht ausgesondert; gemeinsame Termine bleiben enthalten. Die alten Mannheimer Werkstoffkunde-Gruppen stammen aus dem archivierten Plan.

## Verantwortlichkeiten

- `src/features/study-options/components/`: kleine Darstellungskomponenten für Auswahlzeile, gemeinsame Auswahl und Onboarding.
- `src/features/study-options/hooks/`: Entwurf, Ladezustand, Übernehmen/Verwerfen und Prüfung offener Konfiguration je Profil.
- `src/features/study-options/model/`: reines Auswahlmodell, sichere Titelvarianten, nummerierte Gruppenalternativen und Anzeigetexte.
- `src/features/study-options/styles.css`: eigene Feature-Styles, nach den allgemeinen App-Styles geladen.
- `src/dhbwApi/studyOptions.ts`: DHBW-Katalog und bestätigte Beziehungen der Quellen.
- `src/dhbwApi/studyPlan.ts`: Laden, ETags, Quellen-Caches, Zusammenführen der Pläne.
- `src/schedule/studyOptions.ts`: identische Klassifikation für Auswahl und Terminfilter.
- `src/store/courseProfiles.ts`: Übernahme auch bei erneuter Konfiguration eines bereits gespeicherten Profils.

Die früheren Konzeptprototypen liegen getrennt unter `prototypes/electives/`. Screenshots und Galerie werden nicht in das produktive App-Bundle importiert.

## Erweiterte Erkennung vom 17. Oktober

Die anschließende Prüfung über zehn Standorte, 20 API-Regressionstitel und bekannte Grenzen stehen in [STUDY_OPTION_DETECTION_AUDIT.md](STUDY_OPTION_DETECTION_AUDIT.md). Ergänzende Aufnahmen: [MA-TCT24 im Onboarding](screenshots/study-options/audit-mannheim-mobile.jpg) und [FN-TIM24 als Bestandsprofil](screenshots/study-options/audit-fn-tim24-bestand.png). Native Laufzeitprüfungen sind im aktuellen Release-Protokoll separat nachzuweisen.
