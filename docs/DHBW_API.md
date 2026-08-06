# DHBW-API

## Nutzungserlaubnis

Die Nutzung der öffentlichen API von [dhbw.app](https://dhbw.app/) wurde dem Projekt von Max Hardtke, dem Betreiber von dhbw.app, ausdrücklich gestattet. Diese Erlaubnis wurde im direkten Austausch erteilt. Private Kontaktdaten und der zugrunde liegende Mailverkehr werden aus Datenschutzgründen nicht im öffentlichen Repository dokumentiert.

Die Erlaubnis ist keine Aussage darüber, dass die App ein offizielles DHBW-Produkt ist. Die App bleibt ein unabhängiges Open-Source-Projekt; der Rapla-Link bleibt als alternative Datenquelle erhalten.

## Öffentliche Dokumentation

- [Swagger/OpenAPI-Dokumentation](https://api.dhbw.app/api)
- [Öffentliche Nutzungsstatistik](https://dhbw.app/stats)

## In der App verwendete Endpunkte

Der geführte Modus ruft die API direkt vom Gerät des Nutzers auf. Es gibt kein eigenes Zwischen-Backend und keine API-Zugangsdaten in der App.

- `GET /sites` — verfügbare DHBW-Standorte
- `GET /courses/{site}/parsed` — Studiengänge und Kurse eines Standorts
- `GET /rapla/lectures/{course}/events?archived=true` — Termine des gewählten Kurses einschließlich vergangener Termine
- `GET /mensa/{site}` — Mensa-Daten passend zum ausgewählten Standort

Für Stundenplan-Aktualisierungen verwendet die App den HTTP-`ETag`. Bei unveränderten Daten wird dadurch keine vollständige Antwort erneut verarbeitet. Die Delta-Endpunkte werden derzeit nicht verwendet; die laut API-Betreiber bestehenden Delta-Probleme für Ravensburg und Friedrichshafen bleiben damit ohne Auswirkung auf den geführten Modus.

Die App speichert die Kursauswahl, den lokalen Stundenplan-Cache und die vom Nutzer ausgeblendeten Module lokal auf dem Gerät. Der API-Kursplan wird nicht in ein eigenes Backend kopiert.
