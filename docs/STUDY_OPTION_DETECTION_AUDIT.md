# Erkennungsprüfung – 17. Oktober 2026

## Umfang und Quelle

Öffentliche API-Kataloge `/courses/{site}/parsed` und vollständige archivierte Pläne
`/rapla/{site}/lectures?archived=true` wurden neu abgerufen und mit der aktuellen
Titelklassifikation abgeglichen. Insgesamt **628.538 Termine** und **1.997 Katalogeinträge**.
Das ist eine Suche über den Gesamtbestand, keine manuelle Bestätigung jedes Termins.

| Standort | Termine | Katalogeinträge |
| --- | ---: | ---: |
| FN | 58.990 | 104 |
| HDH | 20.536 | 135 |
| HN | 28.609 | 22 |
| KA | 96.097 | 192 |
| MA | 96.437 | 438 |
| MGH | 20.007 | 63 |
| MOS | 73.677 | 295 |
| RV | 57.450 | 155 |
| STG | 136.351 | 489 |
| VS | 40.384 | 104 |

## Nachgewiesene Lücken und Änderungen

| API-Beispiel | Bisherige Lücke | Behandlung |
| --- | --- | --- |
| FN-TIM24: `Lab GR 1 (A-K) Datenbanksysteme TIM+TIS` | GR statt Gruppe/Grp | Gruppen, auch GR/Gr./Grp., mehrstellige Zahlen |
| VS-WIN24B: `Wirtschaftsenglisch I a Gruppe II` | Römische Kennungen | Gruppen I/II sowie weitere Großbuchstabenkennungen |
| MA-WIB25A: `Communicating in Businesses Gruppe S3 (Velásquez)` | Buchstabe plus Zahl | Gruppen S1/S2/S3, A1/A2 usw. |
| FN-TWI25-1: `Englisch (Gruppe Kas - Z)` | Namensbereiche | Explizite alphabetische Bereiche nach Gruppenmarker |
| FN-TEA24A: `Freies Labor X Gruppen - industr. Bussysteme` | Kennung vor Gruppenmarker | X/Y-Gruppen, auch `X Grp.` |
| MA-TCT23: `WF Diagnostik` | WF nicht berücksichtigt | Wahlmodule, auch WF am Titelende |
| MA-TCT22: `Diagnostik (WPF)` | WPF nicht berücksichtigt | Wahlmodule |
| HDH-TWIW2023TRW: `Data Science WF (Prof. C)` | WF am Titelende | Wahlmodule |
| MOS-TMT20A: `Wahlfächer: Bionik` | Umlaut/Plural | Wahlfach/Wahlfächer/Wahlfaecher |
| FN-TFE23-2: `Ausgewählte Themen der EIT (Wahlangebot 2)` | Wahlangebot | Wahlmodule |
| HDH-TMB2024A---GRUPPE-1 | Zusätzliche Bindestriche im Quellenamen | Gruppenfamilie über normalisierten Basiskurs; vierstellige Jahrgänge |
| MA-TCT24: `Biochemie (TAC)` / `Mikrobiologie (CBIW)` | Studienrichtung nur als Kürzel | Verifizierter Provideradapter, jahresunabhängig |
| MOS-WWI23A: `Materialwirtschaft Schwerpunkt Handel` | Ausgeschriebener Schwerpunkt | Verifizierter Provideradapter für Handel/Industrie/KI sowie HD/IN |
| VS-WWI25C: `… Vertiefung Finanzdienstleister` / `… Vertiefung Verwaltungsinformatik` | Langnamen und FD/VI/IT gemischt | Verifizierter Provideradapter |

Die Studienrichtungen [CBIW/TAC](https://www.mannheim.dhbw.de/studium/studienangebot/bachelor-studienangebot)
und die [Mosbacher Schwerpunkte](https://www.mosbach.dhbw.de/studium/studienangebot-bachelor/wirtschaftsinformatik/schwerpunkte/)
sind zusätzlich durch die Hochschule bestätigt. Die konkreten Titel stammen aus der API.

## Architektur und Bestandsprofile

- `src/schedule/studyOptions.ts`: allgemeine Marker und durch mehrere Kürzel im selben Plan gestützte Vertiefungen.
- `src/schedule/studyGroups.ts`: gemeinsame Gruppenkennung für Anzeige und Wechselverhalten.
- `src/schedule/studyOptionProviders.ts`: gezielte, dokumentierte Hochschulkonventionen. Unbekannte Kürzel werden nicht global zu Wahlfächern.
- `src/dhbwApi/studyOptions.ts`: Quellenzuordnung ohne feste Jahrgangsliste; `choices-v4` fordert eine erneute Prüfung vorhandener Wahlkonfigurationen an.
- Onboarding, Einstellungen und Kalenderfilter verwenden dieselbe Klassifikation samt Kurskontext.
- Gruppenfamilien berücksichtigen den ganzen Aktivitätstitel: `Lab … Datenbanksysteme` verdrängt keine Auswahl für `Lab … Physik`.
- Ausdrückliche Online-/Präsenzvarianten werden in einer Auswahlzeile gebündelt; alle Originalschlüssel bleiben gespeichert.

## Grenzen – ausdrücklich keine Vollständigkeitsgarantie

- Die API hat kein verbindliches Pflicht-/Wahlfachfeld und keine stabile Wahlgruppen-ID. Ohne Kennzeichnung lässt sich die persönliche Belegung nicht sicher rekonstruieren.
- `Vertiefung wissenschaftliches Arbeiten`, `WP III` (Wirtschaftsprüfung), thematische Schwerpunkte, gewöhnliche Übungen und bloße Überschneidungen begründen keine Auswahlpflicht.
- Gemeinsame Angaben wie `alle Gruppen`, `Gr. 1+2` oder `Gruppe I+II` bleiben enthalten. Ob eine zusammengesetzte Kennung nur eine Teilmenge einer größeren Gruppe meint, erfordert zusätzliche Providerdaten.
- Gruppen mit bloßen Dozentennamen oder uneindeutigen Organisationsangaben können weiterhin manuell unter „Übrige Module bearbeiten“ angepasst werden.
- Unbeschriftete Schwerpunktveranstaltungen und zusätzliche Pläne ohne bestätigte Beziehung werden nicht anhand von Ähnlichkeit automatisch hinzugefügt. Das betrifft etwa manche studiengangsspezifischen Kürzelquellen; deren Inhalte sind teilweise schon im Hauptkurs enthalten.
- Die alten unbeschrifteten VS-M10-Angebote bleiben auf die belegten Handbücher 2024/2025 beschränkt. Eine neue Modulnummernlogik wird nicht blind auf neue Jahrgänge übertragen; ausdrückliche WPS-/WPF-/WF-/Gruppenmarker funktionieren unabhängig davon.

## Nachweis

- `tests/fixtures/study-choice-api.json`: 20 konkrete Originaltitel aus dem API-Abruf.
- `tests/studyChoiceDetection.test.ts`: reale Positivfälle, Gegenbeispiele, Profilgrenzen, neue Jahrgänge und Varianten.
- `tests/studyPlanSetup.test.ts`: neu erkannte GR-, WF- und Vertiefungsangebote halten im Einrichtungsablauf vor dem Speichern an und starten abgewählt.
- Browser: vorhandenes FN-TIM24-Profil zeigt den nachträglichen Konfigurationshinweis und GR-/WF-Angebote; MA-TCT24 zeigt Studienrichtungsmodule, Wahlmodule und Gruppen im Onboarding.
- Mobile Browseransicht 390 × 844 visuell geprüft; kein horizontaler Überlauf.
- Abschließende Prüfung: 49 Testdateien / 486 Tests erfolgreich, TypeScript/Vite-Build erfolgreich, `git diff --check` ohne Fehler.
- Screenshots: `docs/screenshots/study-options/audit-mannheim-mobile.jpg` und `audit-fn-tim24-bestand.png`.

Keine Veröffentlichung oder Änderung der öffentlichen API.
