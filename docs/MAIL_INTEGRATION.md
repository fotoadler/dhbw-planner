# Uni-Mail-Integration

## Aktueller Prototyp

Für den gespeicherten Standort `RV` wird ein eigener Mail-Tab eingeblendet. Beim Öffnen des Tabs wird die originale Ravensburger OWA-Adresse direkt geladen:

`https://webmail.dhbw-ravensburg.de/owa/`

Auf iOS und Android öffnet das lokale Plugin `@dhbw/capacitor-embedded-mail` die Seite als native WebView oberhalb der App-Tabbar. Dadurch bleiben die Kalender-/Dualis-/Mail-Tabs unten sichtbar und OWA selbst hat keine URL-Leiste oder externe Browser-Navigation. Der Login findet direkt auf der DHBW-Seite statt; die Planner-App erhält weder das Passwort noch OWA-Cookies. Die WebView-Sitzung wird nicht bei jedem Öffnen gelöscht, sodass der nächste Klick auf „Mail“ direkt den Posteingang öffnen kann.

Im normalen Web-Build wird OWA in einem neuen Browser-Tab geöffnet, weil die Seite nicht zuverlässig in ein iframe eingebettet werden kann.

## Push-Benachrichtigungen

Push ist noch nicht aktiv. OWA in einer WebView kann keine verlässliche Hintergrundzustellung an die App garantieren. Dafür braucht es einen serverseitigen Exchange-Sync-Dienst, der neue Nachrichten erkennt und anschließend über Apple Push Notification Service bzw. Firebase Cloud Messaging an die App meldet.

Ein solcher Dienst darf keine Zugangsdaten unverschlüsselt speichern. Vor einer Umsetzung müssen daher Authentifizierung, Einwilligung, Token-Schutz, Löschung und die Freigabe durch die zuständige DHBW-IT geklärt werden.

## Standortabhängigkeit

Die Provider-Zuordnung liegt in `src/mail/providers.ts` und ist absichtlich nicht global im App-Root verteilt. Aktuell ist nur Ravensburg hinterlegt. Andere DHBW-Standorte verwenden unterschiedliche Mail-Plattformen; sie können später jeweils mit eigener Webmail-Adresse und eigenem Login-Verfahren ergänzt werden.

Für einen weiteren Standort werden dort ein eigener `MailProvider` und ein Eintrag in `MAIL_PROVIDERS` ergänzt. Die App blendet den Mail-Tab anschließend automatisch für diesen Standort ein. Das native Plugin kennt keine DHBW-Standorte und lädt lediglich die vom Provider gelieferte Webmail-Adresse.
