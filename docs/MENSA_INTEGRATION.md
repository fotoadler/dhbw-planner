# Mensa- und Campusgastronomie

## Warum Standortprofile

Die DHBW hat keinen gemeinsamen Gastronomiebetreiber. Je nach Standort liefern ein Studierendenwerk, ein Kooperationsrestaurant oder gar niemand die Daten, und dieselbe öffentliche DHBW-API meldet je Betreiber unterschiedlich befüllte Felder — vertauschte Allergen- und Zusatzstoffspalten, Preisrollen, Schließtage als Gericht getarnt. Eine gemeinsame generische Darstellung müsste diese Unterschiede raten.

Deshalb beschreibt jeder Standort sein Angebot als Profil in [`src/mensa/sites/`](../src/mensa/sites/). Der Loader in [`src/mensa/loadDining.ts`](../src/mensa/loadDining.ts) normalisiert damit auf ein gemeinsames ViewModel ([`src/mensa/model.ts`](../src/mensa/model.ts)); die Oberfläche kennt keine Standortnamen.

## Quellen

| `source.kind` | Bedeutung |
| --- | --- |
| `dhbw-api` | Öffentliche DHBW-API; ein Fehler ist hier ein echter Fehler |
| `seezeit` | Zusätzlich der offizielle Seezeit-Plan; die API bleibt Rückfallebene |
| `stw-heidelberg` | Zusätzlich der eingebettete Plan des Studierendenwerks Heidelberg; die API liefert Bild und CO₂-Wert |
| `partners` | Kein Abruf; der Standort hat nur Kooperationsrestaurants |

## Profilfelder

| Feld | Wirkung |
| --- | --- |
| `presentation` | `single-facility`, `facility-tabs`, `partner-list` oder `preorder` |
| `categoryLabels` | Ersetzt die generischen API-Buckets durch die örtliche Bezeichnung |
| `markerPolicy` | `native`, `swapped`, `mixed-additives` oder `hidden` für Allergene und Zusatzstoffe |
| `pricePolicy` | `student-only` (Standard) oder `all`, wenn die weiteren Preisrollen stimmen |
| `deduplicate` | Entfernt identische API-Zeilen innerhalb eines Tages |
| `closedMealPattern` | Erkennt einen als Gericht gelieferten Schließhinweis |
| `partialWithoutMain` | Ein Tag ohne Hauptgericht gilt als unvollständiger, nicht als fehlender Plan |
| `partnersLabel` | Überschrift der eingeklappten Zusatzangebote |
| `venueScope` | `multi-site` blendet den Wechsel des Essensstandorts ein |
| `venuePicker` | `hidden` nimmt ein bündelndes Profil aus der Auswahlliste |

Standort-Sonderfälle gehören ausschließlich in diese Felder. Sobald im Loader oder in der Oberfläche ein Standortcode abgefragt wird, fehlt ein Profilfeld.

## Zeitlich begrenzte Angaben

Schließzeiten und Sommerpausen stehen als `specialPeriods` an der Einrichtung. Sie veralten, deshalb tragen sie `source` und `checkedAt`:

```ts
specialPeriods: [{
  from: '2026-06-29',
  to: '2026-09-18',
  label: 'Sommerpause bis 18. September',
  source: 'https://seezeit.com/essen/mensa-cafeteria-co/mensa-friedrichshafen/',
  checkedAt: '2026-08-10',
}],
```

Ohne Beleg wird eine Angabe nicht ergänzt. Ein leerer Plan ist kein Beweis für eine Schließung — Semesterferien und Praxisphasen sehen von außen genauso aus und werden als „kein Angebot veröffentlicht" gezeigt.

## Erweiterung

Ein neuer Standort wird als Datei in `src/mensa/sites/` angelegt und in `index.ts` registriert. `tests/diningSites.test.ts` prüft gegen [`src/dhbw/siteConfiguration.ts`](../src/dhbw/siteConfiguration.ts), dass jeder DHBW-Standort genau ein Essensprofil hat — ein vergessener Standort fällt damit auf.

## Bekannte Lücken

- **Bad Mergentheim:** Das Studierendenwerk Heidelberg führt für jedes Kooperationsrestaurant eine eigene Speiseplan-Adresse, liefert dort aber acht Mal dieselbe Datei mit „Derzeit kein Speiseplan vorhanden!". Verlinkt sind deshalb nur restauranteigene Seiten.
- **Mosbach/Fideljo:** Der Partnerplan ist derzeit ohne Speiseplan; der Eintrag nennt Adresse und Zeiten.
- Für Karlsruhe, Heidenheim, Lörrach und Villingen-Schwenningen sind die Schließzeiten noch ohne Beleg hinterlegt und sollten vor Ort geprüft werden.
