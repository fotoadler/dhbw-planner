# Uni-Mail-Integration

## Standortabhängige Integration

Mailplattform und Webmail-Adresse werden nicht mehr global angenommen, sondern aus dem ausgewählten Standortprofil geladen. Die vollständige Recherche und die Dualis-Regeln stehen in [DHBW_SITE_INTEGRATIONS.md](DHBW_SITE_INTEGRATIONS.md).

Für Ravensburg wird beim Öffnen des Tabs die offizielle OWA-Adresse direkt geladen:

`https://webmail1.dhbw-ravensburg.de/owa/`

Auf iOS und Android öffnet das lokale Plugin `@dhbw/capacitor-embedded-mail` die Seite als native WebView oberhalb der App-Tabbar. Dadurch bleiben die Kalender-/Dualis-/Mail-Tabs unten sichtbar und OWA selbst hat keine URL-Leiste oder externe Browser-Navigation. Der Login findet direkt auf der DHBW-Seite statt; die Planner-App erhält weder das Passwort noch OWA-Cookies. Die WebView-Sitzung wird nicht bei jedem Öffnen gelöscht, sodass der nächste Klick auf „Mail“ direkt den Posteingang öffnen kann.

Im normalen Web-Build wird OWA in einem neuen Browser-Tab geöffnet, weil die Seite nicht zuverlässig in ein iframe eingebettet werden kann.

## Push-Benachrichtigungen

Push ist noch nicht aktiv. OWA in einer WebView kann keine verlässliche Hintergrundzustellung an die App garantieren. Dafür braucht es einen serverseitigen Exchange-Sync-Dienst, der neue Nachrichten erkennt und anschließend über Apple Push Notification Service bzw. Firebase Cloud Messaging an die App meldet.

Ein solcher Dienst darf keine Zugangsdaten unverschlüsselt speichern. Vor einer Umsetzung müssen daher Authentifizierung, Einwilligung, Token-Schutz, Löschung und die Freigabe durch die zuständige DHBW-IT geklärt werden.

## Erweiterung

Die Provider-Zuordnung liegt in `src/dhbw/siteConfiguration.ts`. Für einen weiteren Standort wird dort ein eigener `mail`-Block ergänzt. Die App blendet den Mail-Tab anschließend automatisch ein. Das native Plugin kennt keine DHBW-Standorte und lädt lediglich die vom Profil gelieferte Webmail-Adresse. Wenn ein Standort nur Weiterleitungen anbietet oder die Webmail-Adresse nicht belastbar verifiziert ist, bleibt `mail` bewusst `null`; dadurch wird kein falscher Login angeboten.
