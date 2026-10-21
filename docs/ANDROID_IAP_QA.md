# Android-Kaufprüfung – 21.10.2026

Gerät: Samsung Galaxy Tab A7 Lite (SM-T220), Android 14. Interne Play-Version 1.5.4 (18), mit Google-App-Signatur, Installationsquelle `com.android.vending`. Kein Produktionsupdate. Ausschließlich Lizenztest-Zahlungsmittel; Google kennzeichnet die Bestellung ausdrücklich als Test ohne Berechnung.

| Fall | Ergebnis auf dem Gerät |
| --- | --- |
| Vier Beträge | 1/3/5/10 EUR im Erst- und Wiederholungsdialog geladen |
| Sofortige Ablehnung | Keine Freischaltung/Erfolgsansicht; erneuter Versuch möglich |
| Verzögerte Ablehnung | Pending ohne Erfolgsansicht; Google bestätigt Abbruch; nach Neustart keine Freischaltung |
| Erstkauf `support_gold_1` | Verarbeitet; Dankesansicht; Widgets/Gold freigeschaltet |
| Wiederholung `support_1` | Verarbeitet; Dankesansicht; erneuter Aufruf desselben Kaufes möglich |
| Manueller Abbruch | Kein Erfolg; Buttons wieder verfügbar; Fehlermeldung noch zu allgemein |
| Explizite Wiederherstellung | Store-Abgleich bestätigt Freischaltung auf bestehender Installation |
| Verzögerte Genehmigung `support_3` | Pending ohne neue Erfolgsansicht; Google danach „Verarbeitet“; expliziter Store-Abgleich verarbeitet den Kauf und gibt weitere Käufe wieder frei |
| Genehmigung mit späterer Rückbuchung | Noch nicht praktisch geprüft |


- Ausstehende Käufe müssen auch nach Schließen/Öffnen des Dialogs weitere Checkouts sperren: persistenter Pending-Status wird jetzt in Dialog und Kauf-Funktion geprüft.
- Verzögerte Zahlungen brauchen im Vordergrund einen erneuten Store-Abgleich: während Pending wird alle 15 Sekunden abgefragt; bei Abschluss, Hintergrundwechsel und Unmount endet die Abfrage.
- Das native Billing-Plugin liefert bei manuellem Abbruch und anderen Fehlern denselben allgemeinen Fehler. Deshalb ist die Anzeige konservativ, aber noch nicht spezifisch genug.
- Bereits verbrauchte Google-Verbrauchsprodukte liefern keine vollständige Rückbuchungshistorie über `queryPurchases`. Eine lückenlose serverseitige Rückbuchungsprüfung ist ohne Backend/Voided-Purchases-Abgleich nicht implementiert. Wiederherstellbare Erstkäufe werden beim nächsten erfolgreichen Store-Abgleich abgeglichen; das ist keine sofortige Push-Sperre.


## Widget- und Symbolprüfung auf dem Samsung

- Version 1.5.4 (21) mit Google-App-Signatur installiert und anschließend über Google Play aktualisiert, Einrichtung und Gold-Symbol erhalten. Ausschließlich interner Test.
- Gold-Symbol im Launcher sichtbar; Antippen startet die App.
- Kleines Widget: Statusbeschreibung wird vollständig in zwei Zeilen umgebrochen.
- Mittleres Widget: zeigt auch bereits vergangene Vorlesungen des heutigen Tages. Antippen öffnet den heutigen Tag.
- Großes Widget: unten die nächsten drei geladenen Vorlesungstage (22., 23., 26. Oktober); das vorlesungsfreie Wochenende wird ausgelassen. Antippen des 26. Oktober öffnet genau dessen Tagesansicht.
- Kaltstart über ein Widget wurde auf Version 18 geprüft. Neuinstallation/Gerätewechsel bleiben ungeprüft.

