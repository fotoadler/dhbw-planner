# App-Review-Demomodus

Die App enthält einen lokalen, dokumentierten Demomodus für die Apple App Review. Er ist **kein** Zugang zu Rapla oder Dualis und kein Sicherheitsmechanismus: Die untenstehenden Werte sind absichtlich öffentlich und schalten ausschließlich fest eingebaute Beispieldaten frei.

- Es werden keine persönlichen Daten, keine echten Noten und keine echten Dozentennamen angezeigt.
- Es wird kein Netzwerkzugriff zu Rapla oder Dualis ausgeführt.
- Die Demo wird nicht gespeichert und aktiviert keine Benachrichtigungen oder Live-Aktivitäten.
- Im Produkt ist der Zustand sichtbar als „App-Review-Demo · ausschließlich Beispieldaten“ markiert.

## Angaben für App Store Connect → Review Notes

```text
Zum Prüfen des Stundenplans fügen Sie beim ersten Start diesen Rapla-Link ein:
https://app-review.demo.invalid/rapla?user=app-review&file=demo

Zum Prüfen der Dualis-Ansicht verwenden Sie:
Benutzername: app-review
Passwort: DHBW-Review-Demo

Beide Eingaben aktivieren ausschließlich lokale Beispieldaten. Es erfolgt kein
Netzwerkzugriff und es werden keine Zugangsdaten gespeichert.
```

## Wartung

Die Erkennung liegt in `src/demo/reviewDemo.ts`; die Daten selbst in `src/demo/appStoreDemo.ts`. Änderungen an diesen beiden Dateien müssen in diesem Dokument und in den Review Notes übernommen werden.
