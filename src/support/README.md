# Freiwillige Unterstützung

Dieser optionale Bereich ist unabhängig von Kalender, Dualis, Mail und Kursdaten. Für normale Beiträge an der App muss hier nichts geändert werden. Im Browser laufen keine echten oder simulierten Käufe.

- `index.ts`: öffentliche Anbindung für `App` und `SettingsView`.
- `products.ts`: Produkt-IDs und Texte. `support_gold_*` ist der dauerhaft wiederherstellbare Erstkauf; danach werden wiederholbare `support_*`-Trinkgelder angeboten. Alle Beträge schalten dieselben Widgets und das Gold-Symbol frei.
- `purchases.ts`: Store-Abfragen, bestätigte Käufe, Wiederherstellung und Abschluss/Verbrauch. Store-Zugriffe sind serialisiert.
- `state.ts` / `useSupport.ts`: lokaler Berechtigungs-Cache, Übernahme früherer Unterstützungen, dezente Hinweise und React-Anbindung.
- `ui/` / `support.css`: Kaufdialog, Spinner, Danke/Konfetti und kompakte Einstellungen. `SupportBenefits` öffnet die wischbare Widget-Galerie oder den Rot/Gold-Vergleich. Die Symbolauswahl liegt ausschließlich im Pop-up.
- `previewNavigation.ts`: Android-Zurück schließt zuerst die offene Vorschau.
- `assets/`: Gold-Symbol als editierbare SVG-Quelle und PNG.
- `icon.ts`: kleine native Brücke zum Wechsel des Launcher-Symbols.
- Tests: `tests/support/`. Ausführen mit `npm test -- tests/support`.

Native Teile müssen in den Plattformprojekten liegen: `ios/App/App/SupporterIconPlugin.swift`, Androids `SupporterIconPlugin.java`, Launcher-Aliase und die jeweiligen Icon-Kataloge. Sie ändern weder Fachlogik noch Zugriff auf Kurs-/Anmeldedaten.

Store-Einrichtung, Produktarten und Testschritte: [docs/SUPPORT.md](../../docs/SUPPORT.md).

Die Widgets sind separat unter `src/widgets/` gekapselt. Dieser Bereich liefert lediglich den Unterstützerstatus; Kalenderdarstellung und Datenabrufe bleiben unabhängig.

Die Widget-Bilder unter `assets/widget-*.png` sind native Beispielansichten ohne Nutzerdaten. Bei einer Designänderung neu rendern. Lokale UI-Prüfung: `tests/previews/support.html`.

