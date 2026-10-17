> Historischer Konzeptstand vom 16. Oktober 2026. Kein aktuelles Funktionsversprechen.

# Wahlkurse & Gruppen

Konzept vom 16.10.2026, inzwischen lokal in der bestehenden App umgesetzt: Einstellungen → Vorlesungsmodule → Module auswählen. Tag/Woche/Monat und der bestehende Kalenderkopf bleiben erhalten. Die frühere getrennte Vorschau bleibt als Konzeptstand verfügbar. Die Vorschau verwendet bestehende Farben, Typografie, EntryCard, WeekStrip und WeekView. API-Snapshot mit echten Titeln und Terminen; die Auswahloberfläche zeigt eine begrenzte Beispielauswahl. Insbesondere die Mannheimer Laborgruppen stammen aus dem Archiv 2025. Keine Buchung oder Anmeldung an der Hochschule.

## Geprüfter Stand nach Nutzerfeedback

einer Nutzerin freigegebener Rapla-Plan enthält VS-SXX25G und VS-SXX25 alle Kurse. Die öffentliche API stellt diese Quellen getrennt bereit (187 bzw. 348 Termine am 16.10.2026). Der Sammelplan enthält WPS, Übungen und Studienschwerpunkte. Die Titel unterscheiden sich schon zwischen Jahrgang 25 und 26; die Erkennung hängt deshalb nicht an Modulnummern.

- Nach Auswahl eines API-Kurses werden passende Sammelpläne automatisch geladen. Der Entwurf wird erst mit „Weiter zum Kalender“ zum gespeicherten Profil. Wahlangebote beginnen abgewählt.
- Die Einrichtung zeigt ausschließlich persönliche Wahlpflichtseminare, Übungen, Studienschwerpunkte, Wahlmodule und Gruppen in aufklappbaren Bereichen. Historische und zukünftige Angebote werden gleich behandelt; es gibt keinen separaten Bereich für vergangene Module. Eine gemeinsame Suche öffnet passende Bereiche.
- Gemeinsame Termine aus dem Grund- und Sammelplan werden ohne Einzelwahl übernommen, einschließlich historischer Vorlesungen, Begrüßungen und Prüfungen. Ein Sammelplan bleibt deshalb auch bei leerer persönlicher Wahl eingebunden, sofern er gemeinsame Termine enthält. Vorhandene explizite Modulbefreiungen bleiben erhalten. Zusätzliche Quelle allein bedeutet nicht, dass jede enthaltene Veranstaltung ein Wahlfach ist.
- Die Klassifikation kennt die in VS24/25 verwendeten Varianten „Übungen“, „Ü“ und parallele Literaturrecherche. Die bekannte M10-Bezeichnung ohne WPS wird nur in diesen Sammelplänen als Seminar eingeordnet. Allgemeine Vorlesungen werden nicht pauschal nach Modulnummer zu Wahlfächern.
- `optionsConfiguredKey` speichert den ausdrücklich übernommenen Stand aus Quellen und Angebotsarten. `optionsNoticeKey` merkt nur, dass der Hinweis dazu bereits angezeigt wurde. Ein alter `optionsNoticeSeen`-Wert ersetzt keine abgeschlossene Einrichtung.
- Jedes betrachtete Profil wird geprüft, auch ein zusätzlicher Ansichtkurs. Die Prüfung erfolgt bei Kurswechsel, erfolgreicher Planaktualisierung und Rückkehr zur App; der Kurskatalog wird maximal eine Minute wiederverwendet. Neue Quellen oder neue Angebotsarten können erneut eine Prüfung anstoßen. Neue einzelne Seminartitel werden in den Einstellungen angeboten, lösen aber kein wiederkehrendes Popup aus.
- „Später“ verändert keine Belegung. Der noch offene Stand bleibt in der Modulauswahl erkennbar. Eine bewusst leer übernommene Auswahl gilt ebenfalls als eingerichtet; die API kennt keine persönliche Einschreibung oder verbindlichen Auswahlpflichten.
- Sammelpläne und Gruppen werden über dieselben campusübergreifenden Namenskonventionen und passenden Jahrgang erkannt. Unbekannte Benennung oder fehlende Providerbeziehungen bleiben eine Adaptergrenze. Es gibt keine Garantie für beliebige zukünftige Hochschulen.
- Manche Schwerpunkte werden bereits in Rapla nur als „Studienschwerpunkt“ oder „Siehe Raumplan“ mit mehreren Räumen veröffentlicht. Die App kann daraus keine einzelnen belegbaren Schwerpunkte oder persönliche Raumzuordnung erzeugen.

Die folgenden Abschnitte dokumentieren auch weitergehende Konzeptideen; sie sind keine Behauptung, dass jeder dort beschriebene Komfort bereits implementiert ist.

## Bedienung

- Nach der vorhandenen Kurswahl erscheint nur bei passenden Angeboten ein kurzer zusätzlicher Schritt. Sonst direkt zum Kalender.
- Gemeinsamer Einstieg: **Wahlkurse & Gruppen**. Die Seite fragt konkret nach Seminaren, Wahlmodulen, Studienrichtung oder Gruppe. Keine technischen Quellenbegriffe im normalen Ablauf.
- Checkboxen für unabhängig wählbare Angebote; Radioauswahl nur für bestätigte Alternativen derselben Gruppe. Keine Belegpflicht oder zulässige Modulanzahl aus Terminüberschneidungen erraten.
- Suche, Terminanzahl, Auswahl übernehmen. Vorschau optional, mit tatsächlichen Terminen an einem passenden Tag und Hinweis auf Überschneidungen. Keine zusätzliche obligatorische Bestätigungsseite.
- Gemeinsame Termine bleiben erhalten. Gewählte Zusatzangebote werden ergänzt; echte Wahlalternativen im Grundplan werden nur nach ausdrücklicher Konfiguration gefiltert. „Ohne Auswahl weiter“ behält den bisherigen Stundenplan unverändert.
- Später erreichbar unter **Einstellungen → Stundenplan → Wahlkurse & Gruppen**, pro Kursprofil. Der Kalenderkopf bekommt keine zusätzliche Zeile. Die Vorschau-Steuerung liegt im kleinen Menü „Beispiele“ unten; sie gehört nicht zur Produktoberfläche.
- Änderungen erst beim Übernehmen speichern. Abbrechen verwirft den Entwurf. Nach dem Übernehmen kurz „Rückgängig“ anbieten. Auch alle bisherigen Wahlmodule müssen wieder abwählbar sein.

## Bereits installierte App

Nach erfolgreicher Aktualisierung und nur bei bestätigten passenden Angeboten einmal ein kleines Sheet über dem Kalender:

> **Deine Wahlkurse ergänzen?**
> Für SXX25A gibt es Wahlangebote. Wähle aus, was zu deinem Stundenplan gehört.
> **Jetzt auswählen** · Später
> Jederzeit unter Einstellungen → Wahlkurse & Gruppen.

Bei Gruppen entsprechend „Deine Gruppe ergänzen?“. Kein allgemeines Werbe-Popup für alle Nutzer.

- Versionierten Status je Profil und Funktion speichern: `unseen | offered | dismissed | configured`, inklusive Katalogrevision und zugehörigem Hauptkurs. Beim sichtbaren Anzeigen als angeboten markieren; ein Absturz oder „Später“ darf kein Popup bei jedem Start verursachen.
- Nur einmal je Profil für die Einführung; weder jeder Refresh noch jede Katalogrevision setzt den Status zurück. Weitere neue Angebote später als kleiner Hinweis im bestehenden Einstellungs-/Filtereintrag. Expliziter Kurswechsel darf einen neuen relevanten Vorschlag ermöglichen.
- Bestehende Daten, ausgeblendete Module und Profile vollständig übernehmen. Ohne Bestätigung keine automatische Planänderung und keine Löschung bestehender Filter.
- Beim Tippen auf „Jetzt auswählen“ dieselbe Auswahl wie im Setup öffnen, mit vorhandenen Werten. Schließen/Später behält den bisherigen Plan. Auch nach Neustart kein erneutes Einführungs-Popup.
- Kein Popup während Login, Modal, Kalenderinteraktion oder bei fehlgeschlagenem/offline Katalogabruf; erst im ruhigen Kalenderzustand mit belastbarem Angebot. Abschluss und Abbruch mit Tastatur/Screenreader und nativem Zurück unterstützen.

## Hochschulübergreifende Erkennung

Universeller Kern, Datenquellenadapter je Hochschule. Kein globales „Kursname enthält WPS“ als automatische Zugehörigkeit.

1. **Normalisieren:** Hochschule, Campus, Studiengang, Jahrgang, Semester, Hauptkurs, stabile Quellen- und Veranstaltungs-IDs. Anbieterbezeichnungen auf `shared`, `elective`, `track`, `group`, `optional` abbilden. Rohdaten und Originaltitel behalten.
2. **Beziehungen ermitteln:** Bevorzugt strukturierte Providerdaten und offizielle Beleg-/Gruppenzuordnungen. Sonst geprüfte, versionierte Zuordnungen je Hochschule und Studiengang. Erst danach Kandidaten aus Kursnamen, Titelmustern und Zeitüberschneidungen sammeln.
3. **Sicherheit unterscheiden:** Bestätigte Beziehung → passenden Auswahlschritt anbieten. Plausibler Kandidat → unter „Weitere Angebote“ mit Bestätigung zeigen. Unbekannt → keine automatische Zuordnung oder Filterung. Die persönliche Einschreibung nie allein aus dem API-Katalog ableiten.
4. **Kandidaten eingrenzen:** gleicher Campus/Studiengang/Jahrgang und gültiger Zeitraum; bekannte Sammel- und Gruppenpläne berücksichtigen. Sonderzeichen wie `+`, Umlaute, Bindestriche korrekt kodieren. Ein leerer Plan ist keine Belegungsbestätigung.
5. **Angebote bilden:** Wiederkehrende Termine zu einem Angebot bündeln. Stabile Modul-/Serien-ID vor Titelheuristik; Gruppenkennung, Semester und Quelle im Schlüssel erhalten. „Autismus 1“ und „Autismus 2“ nicht automatisch verschmelzen. Raumwechsel und Zusatztexte nicht als neues Wahlfach anzeigen. Unsichere Fälle getrennt lassen.
6. **Auswahlregeln:** Nur ausdrückliche Katalogregeln begrenzen Anzahl, Gruppe oder Kombination. Überschneidungen weisen auf mögliche Alternativen hin, beweisen sie aber nicht. Gruppenauswahl für ein Labor gilt nicht automatisch für alle anderen Labore.
7. **Fallback:** „Weitere Angebote suchen“ und manuelle Zusatzquelle bleiben zugänglich, auch ohne Erkennung. Bei unbekannten Anbietern darf der Nutzer einen zusätzlichen Kurs/Link ergänzen und Veranstaltungen auswählen. Keine leere automatische Konfiguration erzwingen.

Ein DHBW-Adapter kann die verifizierten Beziehungen der sechs Beispiele abbilden. Eine spätere andere Hochschule liefert dieselben normalisierten Beziehungen; UI und Auswahlmodell bleiben gleich. Die jetzige öffentliche DHBW-API hat dafür keine vollständige standardisierte Beziehungs- oder persönliche Belegungsinformation. Deshalb sind diese Adapterzuordnungen nötig.

## Modell und Integration

`CourseProfile` bleibt die Einheit eines persönlichen Stundenplans. Weitere Profile bleiben separate Ansichtsprofile; eine Laborgruppe wird kein neues Hauptprofil.

```ts
type StudyPlanSelection = {
  schemaVersion: 1;
  baseSource: SourceRef;
  sources: SourceRef[];
  offers: { offerId: string; sourceId: string; selected: boolean }[];
  groups: { groupSetId: string; selectedGroupId: string | null }[];
  introduction: { state: 'unseen' | 'offered' | 'dismissed' | 'configured'; revision: string };
};
```

- `SourceRef` enthält Provider/Hochschule, Campus, Quellen-ID und Gültigkeit. Adapter liefert Angebote, Beziehungen, gemeinsame Pflichttermine, Herkunft und belastbare Auswahlregeln. Die UI kennt keine DHBW-Kursnamensregeln.
- Vorschläge bleiben Vorschläge; Nutzerentscheidungen stabil pro Angebots-ID speichern. Neue unbekannte Wahlmodule nicht stillschweigend hinzufügen. Gespeicherte Auswahl bei leerem/fehlerhaftem Katalog nicht verlieren.
- Cache/ETag und Aktualisierungsstatus pro Quelle; gemeinsames Rendern nach Filterung. Ein Teilausfall zeigt den letzten gesicherten Plan mit Status. Quellenfehler dürfen keine massenhafte Löschung im Gerätekalender auslösen.
- Deduplizierung zuerst über Provider-ID/Serien-ID. Ohne stabile ID konservativ Zeit, Titel, Raum und Dozenten vergleichen; Herkunft aller Quellen erhalten. Widersprüchliche Raum-/Zeitangaben als Konflikt behandeln, nicht still verwerfen. Die Vorschau zeigt eine vereinfachte exakte Inhalts-Deduplizierung.
- Bestehendes `hiddenModules` bleibt eine getrennte bewusste Ausblendung. Wahlangebotsauswahl und ausgeblendete gemeinsame Veranstaltungen nicht gegenseitig überschreiben.
- SetupWizard: nach Kursbestätigung Erkennung aufrufen. SettingsView: gemeinsamen Einstieg ergänzen. CourseProfile/Preferences versioniert erweitern. `useSchedule` und `useViewedSchedule` nutzen dieselbe Zusammenführung.
- Erinnerungen, Live Activity und Gerätekalender erhalten ausschließlich den konfigurierten Gesamtplan des Hauptprofils. Anzeigen/Bearbeiten eines anderen Profils wechselt das Hauptprofil nicht. Auswahländerung entfernt abgewählte Termine nur aus app-eigenen Kalenderobjekten.
- Kein Anbieter-Login im generischen Auswahlmodell speichern; private Lernplattformzugänge separat behandeln.

## Sechs durchklickbare Beispiele

Lokal mit `npm run dev`, Einstieg `/prototypes/electives.html`. Das kleine Menü „Beispiele“ unten dient nur zum Testen, nicht als Produkt-UI. „Neue Einrichtung“ beginnt bei der Kursbestätigung; „Schon eingerichtet“ demonstriert das einmalige Popup. „Beispiel zurücksetzen“ löscht ausschließlich den jeweiligen Vorschauzustand.

| Fall | Hauptkurs | Auswahl | Vorschau |
|---|---|---|---|
| WPS | VS-SXX25A | Seminare aus VS-SXX25-ALLE-KURSE | `/prototypes/electives.html?case=wps&mode=new` |
| Studienrichtung/Sammelplan | STG-SO25A | Beispiel KJA, Gruppe und gemeinsame KJA-Termine aus STG-SO25-A-H-SG+WAHLPFLICHT | `?case=richtung&mode=new` |
| Zusätzlicher Gruppenplan | VS-WCC25 | GRUPPE1 oder GRUPPE2 | `?case=gruppe&mode=new` |
| Zusätzlicher Laborplan | MOS-TEIT25 | MOS-TEIT25-G1 oder G2 | `?case=labor&mode=new` |
| Alternativen im Kurs | FN-TWI24-1 | WPM-T/W aus derselben Quelle | `?case=wahlmodul&mode=new` |
| Freitextgruppen/Nachholen | MA-TCT24 | Werkstoffkunde-Labor Gruppe 1–4, Nachholklausur separat | `?case=freitext&mode=new` |

Die Radioauswahl demonstriert die bestätigte Zugehörigkeit innerhalb des jeweiligen Beispiels; sie bestätigt keine Hochschulbuchung. Die Stuttgarter Vorschau beschränkt sich auf KJA. Andere Studienrichtungen würden erst nach eigener Auswahl deren Gruppen zeigen. Die WPM-Vorschau erzwingt keine Modulanzahl. Nicht alle Termine/Angebote des Katalogs sind Teil der Beispieldaten.

## Abnahme für eine spätere produktive Umsetzung

Erst klassische Kurse ohne Angebote, sechs Sonderfälle, vorhandene Filter, mehrere Profile, leere/ausgefallene Quellen, Quellendubletten und veränderte Semester testen. Popup nach „Später“ und Neustart einmalig; Auswahl bleibt pro Profil. Dann native Kalenderänderungen, Erinnerungen, Live Activity, Android-Zurück und iOS-Sheet separat auf Geräten prüfen. Dieser Stand ist eine lokale Konzeptvorschau; kein Produktions-Rollout.

## Lokaler Implementierungsstand

Die echte App lädt Zusatzquellen mit getrennten ETags/Caches und führt gleiche Inhalte konservativ zusammen. Bekannte Sammel-/Gruppenpläne werden vorgeschlagen; weitere Kurse lassen sich suchen. Neue Wahlangebote starten abgewählt. Eine ausgewählte, bekannte Gruppenquelle bringt ihre Gruppentermine direkt mit; beides wird erst nach „Auswahl übernehmen“ Teil des Plans. Die zusätzliche Positivauswahl verhindert, dass später neu auftauchende Zusatzmodule automatisch sichtbar werden. Bestehende Modulbefreiungen bleiben getrennt erhalten.

Einmaliger Hinweis für Bestandsnutzer mit passenden Angeboten; neue Kurse führen nach dem Laden direkt zur bestehenden Modulauswahl. Die Auswahl und der Hinweisstatus gehören zum Kursprofil. Keine neue Kalenderkopf-Schaltfläche. Offline/Teilabruf-Fehler erzeugen keinen vollständigen Sync-Snapshot. Native Geräteabnahme und Veröffentlichung sind nicht Bestandteil dieses lokalen Stands.

## Überarbeiteter Einstieg und Auswahl, 16.10.2026

Die Kurswahl speichert einen neuen API-Kurs jetzt erst nach einem eigenen Schritt „Wahlkurse & Gruppen“. Neue Wahlmodule und Gruppen sind dort abgewählt; gemeinsame Termine bleiben enthalten. Kurse ohne erkannte Wahlangebote überspringen den Schritt. Ein API-/Katalogfehler bietet Wiederholen statt ungeprüft alle Angebote zu übernehmen. Vor Abschluss des Entwurfs wird der neue Plan nicht an Gerätekalender oder Erinnerungen übergeben.

Bekannte Sammelpläne werden automatisch gelesen, ohne technische Quellenauswahl. Die missverständliche freie Kursquellensuche ist aus dieser Oberfläche entfernt. Es gibt eine Suche nach Wahlkursen/Modulen, eine kompakte Auswahlliste und einen eingeklappten Bereich für übrige Module/Befreiungen. Vergangene Wahlangebote sind getrennt erreichbar. Generische Prüfungs- und Informationsbezeichnungen sind keine ausreichende Grundlage für eine persönliche Abwahl und bleiben im Grundplan enthalten.

Neue Hauptkurs-Wahlmodule werden über eine Positivauswahl gespeichert, damit später neu hinzukommende Wahlangebote nicht automatisch erscheinen. Bestehende Installationen behalten ihre vorherige Auswahl bis zur ausdrücklichen Änderung.
