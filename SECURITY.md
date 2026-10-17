# Security Policy

## Supported Versions

Aktuell wird die neueste Version im `main`-Branch unterstützt.

## Schutz des Hauptbranches

Änderungen sollen über Pull Requests eingebracht werden. Der versionierte
Workflow [ci.yml](.github/workflows/ci.yml) führt im Job `web-quality` Tests und
Produktions-Build aus. Ob dieser Check verpflichtend ist, Reviews erforderlich
sind und Force-Pushes oder Löschungen gesperrt sind, hängt von den aktuellen
GitHub-Branchregeln ab; diese lassen sich nicht aus dem Quellcode nachweisen.

## Reporting a Vulnerability

Bitte melde Sicherheitsprobleme nicht als öffentliches Issue. Nutze GitHubs private vulnerability reporting Funktion, falls verfügbar, oder kontaktiere den Repository-Inhaber direkt über das GitHub-Profil.

Gib bitte an:

- betroffene Funktion
- Schritte zur Reproduktion
- mögliche Auswirkungen
- ob personenbezogene Daten oder Zugangsdaten betroffen sein könnten

## Sensitive Data

Zugangsdaten dürfen nicht geloggt, exportiert oder außerhalb der unten beschriebenen freiwilligen Speicherung dauerhaft abgelegt werden. Bitte melde entsprechende Abweichungen privat. Rapla-Links können selbst zugangsberechtigende Parameter enthalten und gehören ebenfalls nicht in öffentliche Fehlerberichte.

## Lokale Speicherung und Sitzungen

- **Ohne „Angemeldet bleiben“:** Das Dualis-Passwort bleibt im Arbeitsspeicher des laufenden Clients, auch für eine erneute Anmeldung nach Session-Ablauf. Es wird nicht durch die App dauerhaft gespeichert.
- **Mit „Angemeldet bleiben“:** Die Option wird nur auf iOS und Android angeboten und ist anfangs deaktiviert. Nach erfolgreichem Login speichert die App Benutzername, Passwort und Standortkennung unter `dualis.credentials.v1` im nativen Secure Storage. Beim Start erfolgt mit diesem Datensatz und passender Standortkennung eine neue Anmeldung; die alte Session wird nicht wiederhergestellt. Im Browser gibt es keinen Passwortspeicher-Fallback.
- **Schutz:** iOS nutzt die Keychain mit `AfterFirstUnlockThisDeviceOnly`. Android speichert einen AES-GCM-verschlüsselten Datensatz in privaten SharedPreferences; der Schlüssel liegt im Android Keystore. Es ist keine zusätzliche biometrische Freigabe pro Zugriff implementiert und keine bestimmte Hardwareabsicherung zugesichert. Zum Anmelden wird das Passwort im App-Prozess wieder im Klartext benötigt. Geräteschutz bleibt erforderlich.
- **Preferences:** „Benutzername merken“ speichert separat nur den Benutzernamen. Die Optionswerte sowie Rapla-/Kursauswahl, Stundenplan- und Mensa-Cache, ausgeblendete Module und Dozenten-Verzeichnis liegen in normalen Capacitor Preferences, ohne zusätzliche App-Verschlüsselung. Dort steht kein Dualis-Passwort.
- **Session:** Dualis-Access-Token, Session-URLs und die vom Client verwaltete Cookie-Map bleiben im Arbeitsspeicher. Geladene Noten und Prüfungsdaten werden ebenfalls nur im React-Zustand gehalten. Die automatische Capacitor-Cookie-Integration ist deaktiviert. Native Dualis-Cookies werden beim Login/Logout auf iOS und Android sowie nach jeder empfangenen Antwort nur auf Android best effort bereinigt. Dies ist keine Garantie, dass native Netzwerk-Stacks nie vorübergehend Cookies speichern.
- **Abmelden und Löschung:** Abmelden verwirft die lokale Session, deaktiviert die Wiederanmeldung und fordert die Löschung des Secure-Storage-Eintrags an. Auch nach erfolgreichem manuellem Login ohne Speicheroption sowie bei `login-failed` während der Wiederanmeldung wird dessen Löschung angefordert. Netzwerkfehler beim Wiederanmelden und ein Standortwechsel löschen den Datensatz nicht. Speicher- und Löschfehler sowie der Optionsstatus sind unter [Implementierungsgrenzen](docs/AUTHENTICATION_PERSISTENCE.md#implementierungsgrenzen) beschrieben; eine garantierte Löschung wird nicht zugesichert.
- **Mail:** Die native Mail-WebView hält Cookies und Website-Daten persistent. Der Planner-Anwendungscode kopiert Mail-Passwörter nicht in einen eigenen Zugangsdaten-Speicher. Dualis-Abmelden löscht keine Mail-Sitzung; dafür ist die Abmeldung beim Mailanbieter erforderlich.
- **Backups:** Im Android-Manifest ist `allowBackup="false"` gesetzt; zusätzliche Backup-Regeln sind versioniert. Das ist keine Zusicherung für sämtliche geräte- oder herstellerspezifischen Übertragungswege. Für normale iOS-Preferences wird kein vergleichbarer Backup-Ausschluss konfiguriert.

Details und Quellcode-Verweise: [Datenschutz](docs/PRIVACY.md), [Anmeldungen](docs/AUTHENTICATION_PERSISTENCE.md).

## Prüfstatus

Diese Beschreibung dokumentiert den Repository-Code. Eine offizielle Sicherheitsprüfung oder Freigabe durch die DHBW-IT ist damit nicht nachgewiesen und wird nicht behauptet. Die Geräteprüfungen in der Anmeldedokumentation sind eine Prüfliste, kein Nachweis ihrer Durchführung.

## Rapla-Links

Rapla-Links werden vor der Verwendung auf den unterstützten DHBW-Rapla-Host und die bekannten Kalenderpfade geprüft. Die App verwendet keine beliebige Host-Adresse aus einem Link als Netzwerkziel.
