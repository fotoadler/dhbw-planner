# Datenschutz

DHBW Planner ist so gebaut, dass keine eigene Server-Infrastruktur nötig ist.

## Lokal gespeicherte Daten

Die App kann lokal speichern:

- Rapla-Link und daraus abgeleitete Rapla-Konfiguration
- ausgewählter DHBW-Standort, Studiengang und Kurskennung im geführten Modus
- zuletzt geladene Stundenplantermine
- ETag und Metadaten des Stundenplan-Caches, damit unveränderte API-Antworten nicht vollständig neu verarbeitet werden
- zuletzt geladener Mensa-Speiseplan und die gewählte Mensa
- vom Nutzer ausgeblendete Vorlesungsmodule
- ein lokales Dozenten-Verzeichnis mit zuletzt erfolgreich erkannten Zuordnungen, damit fehlende Dozentennamen bei späteren Abrufen best effort ergänzt werden können
- Benachrichtigungseinstellungen
- optional den Dualis-Benutzernamen, wenn „Benutzername merken“ aktiviert ist
- optional die Dualis-Zugangsdaten, wenn „Angemeldet bleiben“ ausdrücklich aktiviert ist; diese liegen ausschließlich im nativen Secure Storage des Geräts

Ohne „Angemeldet bleiben“ wird das Dualis-Passwort nicht dauerhaft gespeichert. Die Mail-Zugangsdaten werden nicht von der App kopiert oder separat gespeichert; der Mail-Tab nutzt die Session-Daten der nativen WebView.

Die Speicherung von Einstellungen und Cache-Daten (nicht der Secure-Storage-Zugangsdaten oder Mail-Sitzung) erfolgt über Capacitor Preferences. Sie ist für App-Einstellungen und Cache-Daten gedacht, ersetzt aber keine zusätzliche Ende-zu-Ende-Verschlüsselung innerhalb der App.

Im Android-Manifest sind automatische App-Backups deaktiviert; dies garantiert keinen Ausschluss sämtlicher herstellerspezifischer Übertragungswege. Für normale iOS-Preferences ist kein entsprechender Ausschluss konfiguriert. Dualis-Zugangsdaten werden auf iOS in der Keychain und auf Android mit einem vom Android Keystore geschützten Schlüssel verschlüsselt abgelegt. Dualis-Access-Token, Session-URLs, die Cookie-Map des Clients sowie geladene Noten und Prüfungsdaten bleiben im Arbeitsspeicher. Die automatische Capacitor-Cookie-Integration ist deaktiviert; native Dualis-Cookies werden beim Login/Logout auf beiden Plattformen und nach jeder Antwort nur auf Android best effort bereinigt. Eine vorübergehende Cookie-Speicherung durch native Netzwerk-Stacks ist dadurch nicht ausgeschlossen. Mail-WebView-Cookies werden dagegen über den jeweiligen nativen persistenten WebView-Speicher gehalten.

## Netzwerkzugriffe

Die installierte App ruft Daten ohne eigenes Zwischen-Backend ab:

- `rapla.dhbw.de`: Stundenpläne über den eingegebenen Rapla-Link
- `api.dhbw.app`: öffentlicher Standort-/Kurskatalog, geführte Stundenpläne und Mensa-Daten; die Bezeichnung „DHBW-API“ ist kein Nachweis einer offiziellen DHBW-Trägerschaft oder Freigabe
- Mensa-Quellen wie `seezeit.com` und `www.stw.uni-heidelberg.de` für ergänzende Abrufe
- `dualis.dhbw.de`: Anmeldung und Abruf von Modulnoten und Prüfungsleistungen
- standortabhängige Webmail-Systeme einschließlich ihrer Login- und Weiterleitungsziele innerhalb der nativen Mail-WebView; im Browser öffnet Webmail in einem eigenen Tab

Die Zielserver erhalten technisch notwendige Verbindungs- und Anfragedaten, beispielsweise IP-Adresse und angefragte Kurskennung. Dualis-Zugangsdaten werden zur Anmeldung an Dualis übertragen. Es gibt kein eigenes Backend zur Weiterleitung dieser Studien- oder Zugangsdaten. Im lokalen Entwicklungsbetrieb laufen API-Abrufe teilweise über den Vite-Entwicklungsproxy (`vite.config.ts`), einschließlich des Dualis-Logins.

Die öffentliche DHBW-API kann bei einzelnen Terminen unvollständige Daten liefern, zum Beispiel ohne Dozentenname. Die App versucht solche Angaben aus der Terminbezeichnung oder aus dem lokalen Dozenten-Verzeichnis zu ergänzen. Das Verzeichnis wird nicht an einen eigenen Server übertragen.

## Tracking

Der Anwendungscode enthält keine Tracking-, Analytics- oder Werbeaufrufe. Das Repository enthält jedoch ein natives Firebase-Cloud-Messaging-Plugin mit Firebase-Abhängigkeiten für Push-Nachrichten; der aktuelle `src`-Code ruft dessen Registrierung nicht auf. Eine Firebase-Konfiguration im ausgelieferten Build muss gesondert geprüft werden. Für die geladenen Webmail-Seiten und externe Links gelten zusätzlich die Regeln ihrer Anbieter.

## Gerätekalender und Benachrichtigungen

Lokale Benachrichtigungen werden auf dem Gerät erzeugt.

Die optionale Gerätekalender-Synchronisierung benötigt unter Android Lese- und Schreibzugriff auf Kalender und unter iOS vollständigen Kalenderzugriff. Die App fragt erst beim Aktivieren danach. Sie liest und bearbeitet ausschließlich ihre markierten Termine im eigenen Kalender „DHBW Planner“. Übertragen werden Titel, Beginn, Ende, Raum, Dozenten und Kursangaben. Die Kalenderkennung und die Aktivierung werden lokal gespeichert. Je nach verwendetem Kalenderkonto und Systemeinstellungen kann das Betriebssystem die Termine mit dem Kontenanbieter synchronisieren. Die App betreibt dafür keinen eigenen Server. Beim Deaktivieren bleiben bereits übertragene Termine erhalten.

## Dualis: Speicheroption und Grenzen

„Angemeldet bleiben“ ist anfangs deaktiviert und nur in der nativen App verfügbar. Nach erfolgreicher Anmeldung wird bei gewählter Option ein Datensatz aus Benutzername, Passwort und Standortkennung gespeichert. Ohne die Option bleibt das Passwort für die laufende Anmeldung und erneute Anmeldung nach Session-Ablauf im Client-Arbeitsspeicher. „Benutzername merken“ ist eine separate Preferences-Einstellung und speichert kein Passwort.

Secure Storage schützt die Ablage auf dem Gerät, verhindert aber keinen Klartextzugriff durch den laufenden App-Prozess und verlangt keine zusätzliche biometrische Bestätigung. Abmelden fordert die Löschung des Datensatzes an und deaktiviert die Wiederanmeldung. Netzwerkfehler beim Wiederanmelden und ein Standortwechsel behalten den Datensatz. Fehler bei der Löschung werden abgefangen, daher wird keine garantierte Löschung zugesichert. Details einschließlich des derzeit ungenauen Optionsstatus stehen in [AUTHENTICATION_PERSISTENCE.md](AUTHENTICATION_PERSISTENCE.md#implementierungsgrenzen).

Dualis-Abmelden beendet keine Mail-Sitzung. Die Abmeldung im Webmail-Angebot muss separat erfolgen. Eine offizielle Prüfung oder Freigabe durch die DHBW-IT wird durch diese Dokumentation nicht behauptet.
