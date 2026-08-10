# Uni-Mail-Integration

## Standortabhängige Integration

Mailplattform und Webmail-Adresse werden nicht mehr global angenommen, sondern aus dem ausgewählten Standortprofil geladen. Die vollständige Recherche und die Dualis-Regeln stehen in [DHBW_SITE_INTEGRATIONS.md](DHBW_SITE_INTEGRATIONS.md).

Für Ravensburg wird beim Öffnen des Tabs die offizielle OWA-Adresse direkt geladen:

`https://webmail1.dhbw-ravensburg.de/owa/`

Auf iOS und Android öffnet das lokale Plugin `@dhbw/capacitor-embedded-mail` die Seite als native WebView oberhalb der App-Tabbar. Da sie eine native View über der Capacitor-WebView ist, erbt sie deren CSS-Safe-Area-Insets nicht: Das Plugin ergänzt Ränder selbst und übergibt dabei nur den Anteil der Systemleisten, den der Host tatsächlich noch überdeckt — ohne erzwungenes Edge-to-Edge (Android 14 und älter) hat das System die Leisten bereits verrechnet. Rotation, Split-Screen und eingeblendete Tastatur positionieren die Ansicht neu.

Bis zum Laden bleibt die native WebView unsichtbar, weil sie sonst als weiße Fläche über der App läge und der Tab defekt wirken würde. Sichtbar wird sie bei `onPageFinished` (Android) beziehungsweise `didFinish` (iOS), im Fehlerfall und spätestens nach acht Sekunden; solange zeigt die App einen Ladekreis. Bewusst nicht bei `onPageCommitVisible` — das meldet bereits den ersten, noch leeren Frame. Dadurch bleiben die Kalender-/Dualis-/Mail-Tabs unten sichtbar und OWA selbst hat keine URL-Leiste oder externe Browser-Navigation. Der Login findet direkt auf der DHBW-Seite statt; die Planner-App erhält weder das Passwort noch OWA-Cookies. Die WebView-Sitzung wird nicht bei jedem Öffnen gelöscht, sodass der nächste Klick auf „Mail“ direkt den Posteingang öffnen kann.

Im normalen Web-Build wird OWA in einem neuen Browser-Tab geöffnet, weil die Seite nicht zuverlässig in ein iframe eingebettet werden kann.

## Push-Benachrichtigungen

Push ist noch nicht aktiv. OWA in einer WebView kann keine verlässliche Hintergrundzustellung an die App garantieren. Dafür braucht es einen serverseitigen Exchange-Sync-Dienst, der neue Nachrichten erkennt und anschließend über Apple Push Notification Service bzw. Firebase Cloud Messaging an die App meldet.

Ein solcher Dienst darf keine Zugangsdaten unverschlüsselt speichern. Vor einer Umsetzung müssen daher Authentifizierung, Einwilligung, Token-Schutz, Löschung und die Freigabe durch die zuständige DHBW-IT geklärt werden.

## Erweiterung

Die Provider-Zuordnung liegt in `src/dhbw/siteConfiguration.ts`. Für einen weiteren Standort wird dort ein eigener `mail`-Block ergänzt. Die App blendet den Mail-Tab anschließend automatisch ein. Das native Plugin kennt keine DHBW-Standorte und lädt lediglich die vom Profil gelieferte Webmail-Adresse. Wenn ein Standort nur Weiterleitungen anbietet oder die Webmail-Adresse nicht belastbar verifiziert ist, bleibt `mail` bewusst `null`; dadurch wird kein falscher Login angeboten.

## Standorte ohne bestätigten Webmail-Login

Der Mail-Tab bleibt auch bei `mail: null` sichtbar und zeigt statt eines generischen Leerzustands eine standortspezifische Hilfe. Die Texte und Aktionen kommen aus demselben Standortprofil:

| Feld | Bedeutung |
| --- | --- |
| `mailUnavailableTitle` | Überschrift der Hilfe; ohne Angabe „Noch kein Mailzugang hinterlegt" |
| `mailUnavailableReason` | Warum kein Login angeboten wird — als Aussage, nicht als Entschuldigung |
| `mailUnavailableInstructions` | Optionaler zweiter Absatz, etwa der Hinweis auf das Open-Source-Projekt |
| `mailSupport` | `{ href?, label }` für die erste Aktion; ohne `href` beschriftet `label` den Feedback-Fallback |
| `mailContribution` | `{ href, label }` für den Beitragslink; entfällt der Block, entfällt der Knopf |

Ziel und Beschriftung stehen bewusst je in einem Objekt mit verpflichtendem `label`. Als getrennte optionale Felder konnte eine Beschriftung an einem fremden Ziel landen — etwa „Webmail-Link mitteilen" über dem allgemeinen Feedback-Formular —, ohne dass der Compiler es bemerkt. Die Repository-Adresse für `mailContribution` liegt zentral als `PROJECT_REPOSITORY_URL` in `src/lib/projectLinks.ts`.

Karlsruhe ist der aktuelle Anwendungsfall: dokumentiert ist dort eine Weiterleitungsadresse, ein studentischer Weblogin ist nicht bestätigt.
