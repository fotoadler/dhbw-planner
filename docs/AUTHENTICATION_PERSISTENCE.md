# Anmeldungen nach dem App-Neustart

## Ursache

Dualis wurde bisher über `DualisClient` nur im Arbeitsspeicher angemeldet. Der Benutzername konnte in den App-Einstellungen bleiben, Passwort, Session-Cookies und Access-Token wurden beim Prozessende aber verworfen. Beim nächsten Start gab es keinen Wiederherstellungsversuch.

Der Mail-Tab verwendet eine native WebView. iOS hat bereits den persistenten `WKWebsiteDataStore.default()` verwendet. Android akzeptiert zwar Cookies, hat sie beim App-Lifecycle aber nicht explizit mit `CookieManager.flush()` in den persistenten Speicher geschrieben.

## Umgesetztes Verhalten

- Dualis zeigt eine freiwillige Option **„Angemeldet bleiben“**.
- Nur bei aktivierter Option werden Benutzername, Passwort und Standortprofil nach erfolgreichem Login gespeichert.
- iOS verwendet dafür die Keychain (`kSecClassGenericPassword`, `AfterFirstUnlockThisDeviceOnly`).
- Android verwendet einen AES-GCM-Datensatz, dessen Schlüssel im Android Keystore liegt. Der verschlüsselte Datensatz liegt in einem privaten App-Speicher.
- Die normale Preferences-Datei enthält weiterhin niemals das Passwort.
- Beim App-Start wird nur bei aktivierter Option und passendem Standortprofil automatisch neu angemeldet.
- Ein Netzwerkfehler behält den gespeicherten Datensatz. Wird das gespeicherte Passwort vom Dualis-Server abgelehnt, wird die Löschung des gespeicherten Datensatzes angefordert und eine erneute Eingabe verlangt.
- **Abmelden** verwirft die lokale Dualis-Session, deaktiviert die Wiederanmeldung und fordert die Löschung der gespeicherten Dualis-Zugangsdaten an (Grenzen siehe unten).
- Der Planner-Anwendungscode kopiert keine Mail-Passwörter in einen eigenen Zugangsdaten-Speicher. iOS nutzt den persistenten WebKit-Datenspeicher; Android akzeptiert die WebView-Cookies und ruft beim Schließen, Pausieren und Zerstören `CookieManager.flush()` auf.
- Mail-Anbieter mit kurzlebigen Sessions oder zusätzlicher MFA können trotzdem eine erneute Anmeldung verlangen. Das entscheidet der jeweilige Mailserver.

## Implementierungsgrenzen

- `src/ui/useDualis.ts` steuert Speichern und Wiederanmelden; `src/store/dualis.ts` trennt normale Preferences (`dualis.prefs.v1`) und Secure Storage (`dualis.credentials.v1`). Die Login-UI in `src/ui/DualisView.tsx` bietet die Option nur nativ an. Die Standardeinstellung ist deaktiviert.
- Nach erfolgreichem Login **ohne** Speicheroption liefert der Löschzweig derzeit `true` zurück und übernimmt diesen Wert in `prefs.rememberCredentials`. Das Optionsflag kann deshalb trotz abgewählter Option `true` sein. Dieser Pfad speichert kein neues Passwort; für die Wiederanmeldung muss zusätzlich ein lesbarer Datensatz mit passendem Standort vorliegen. Falls dessen Löschung scheitert, kann ein alter Datensatz verbleiben. Dies ist ein offener Codebefund, keine zugesicherte korrekte Abbildung der Einwilligung.
- `clearStoredDualisCredentials()` fängt Fehler beim Entfernen ab. Abmelden garantiert deshalb nicht, dass der persistente Datensatz tatsächlich gelöscht wurde. Der native Android-Aufruf entfernt mit asynchronem `apply()`. Ein Standortwechsel verwirft nur die laufende Session und behält den gespeicherten Datensatz.
- Ein Fehler beim Speichern verhindert den aktuellen Login nicht; die UI zeigt einen Hinweis, dass die Zugangsdaten nicht gespeichert werden konnten. Netzwerkfehler während der Wiederanmeldung behalten den Datensatz. `login-failed` löst einen Löschversuch aus; diese Fehlerklasse ist kein eindeutiger Nachweis eines falschen Passworts, da auch unerwartete Loginantworten so klassifiziert werden.
- `src/dualis/client.ts` hält Zugangsdaten für erneutes Login, Access-Token, Session-URLs und Cookie-Map im Arbeitsspeicher. `src/ui/useDualis.ts` hält Noten und Prüfungen im React-Zustand. „Nur Arbeitsspeicher“ bedeutet keine dauerhafte Ablage durch diese Codepfade, keine zugesicherte sichere Überschreibung von Speicher beim Logout.
- `plugins/capacitor-secure-storage` enthält die nativen Implementierungen. iOS setzt `AfterFirstUnlockThisDeviceOnly`; Android verwendet AES-GCM mit zufälligem 12-Byte-IV und 128-Bit-Authentifizierungstag. Eine biometrische Freigabe pro Abruf und eine bestimmte Hardwareabsicherung werden nicht erzwungen.
- `capacitor.config.ts` deaktiviert die Cookie-Integration und Capacitor-Logging (`loggingBehavior: 'none'`). `src/dualis/client.ts` bereinigt native Cookies beim Login/Logout auf beiden Plattformen, nach jeder Antwort nur auf Android; Fehler werden abgefangen. Die Cookie-Map bleibt im RAM, eine vorübergehende native Cookie-Ablage ist nicht ausgeschlossen.
- Die native Mail-WebView verwendet persistenten Website-Speicher. Dualis-Abmelden löscht ihn nicht. Die Aussage zur Passwortspeicherung betrifft den Planner-Code, nicht das Verhalten des Webmail-Anbieters oder der Plattform.

Dieser Abgleich bezieht sich auf den Quellcode, nicht auf eine nachgewiesene Prüfung eines veröffentlichten App-Binaries. Eine offizielle DHBW-IT-Prüfung oder Freigabe ist damit nicht belegt. Die nachfolgende Prüfliste bleibt vor Veröffentlichung auf realen Geräten abzuarbeiten; insbesondere sind Löschfehler und der Optionsstatus gesondert zu prüfen.

## Warum Mail keine universelle Passwort-Automatik erhält

Die Standorte verwenden unterschiedliche Mailanbieter und Loginabläufe. Cookies, MFA, Weiterleitungen und Session-Laufzeiten sind nicht einheitlich. Deshalb bleibt die Mail-Anmeldung eine WebView-Session; die App kopiert keine Mail-Passwörter in einen eigenen Speicher und versucht keine fremden Loginformulare generisch auszufüllen.

## Verifikation vor Veröffentlichung

Für jedes unterstützte Standortprofil sollte auf iOS und Android geprüft werden:

1. Dualis anmelden, „Angemeldet bleiben“ aktivieren, App vollständig beenden und neu öffnen.
2. Dasselbe nach einem Geräte-Neustart prüfen.
3. Dualis mit deaktivierter Option anmelden und bestätigen, dass kein automatischer Login erfolgt.
4. Dualis über **Abmelden** verlassen und bestätigen, dass auch ein Neustart nicht mehr anmeldet.
5. Gespeichertes Passwort serverseitig ändern und prüfen, dass die App eine neue Eingabe verlangt.
6. Während der Wiederherstellung den Netzwerkzugriff unterbrechen und später erneut öffnen.
7. Im Mail-Tab anmelden, Tab/App schließen und die WebView nach einem Neustart erneut öffnen.
8. Eine abgelaufene oder serverseitig ungültige Mail-Session prüfen.

## Abgleich mit offizieller Plattformdokumentation

- Apple beschreibt die [Keychain als sicheren Speicher für Passwörter und kleine Geheimnisse](https://developer.apple.com/documentation/security/adding-a-password-to-the-keychain) und empfiehlt, gespeicherte Zugangsdaten nach erfolgreicher Authentifizierung abzulegen sowie beim expliziten Abmelden zu löschen ([Using the keychain to manage user secrets](https://developer.apple.com/documentation/security/using-the-keychain-to-manage-user-secrets?language=objc)).
- Apple dokumentiert, dass [`WKWebsiteDataStore.default()` Website-Daten dauerhaft speichert](https://developer.apple.com/documentation/webkit/wkwebsitedatastore?changes=la_5); der nicht-persistente Datenspeicher ist für diesen Mailfall deshalb ausdrücklich nicht geeignet.
- Android beschreibt den [Android Keystore](https://developer.android.com/privacy-and-security/keystore?authuser=1) als geschützten Speicher für nicht exportierbare Schlüssel. Der App-Code legt dort nur den Verschlüsselungsschlüssel ab, nicht das Klartextpasswort.
- Android dokumentiert für [`CookieManager.flush()`](https://developer.android.com/reference/android/webkit/CookieManager.html), dass Cookies damit in den persistenten Speicher geschrieben werden. Der Aufruf erfolgt im Mail-WebView-Lifecycle.
