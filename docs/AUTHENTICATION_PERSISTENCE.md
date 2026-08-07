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
- Ein Netzwerkfehler behält den gespeicherten Datensatz. Wird das gespeicherte Passwort vom Dualis-Server abgelehnt, wird der gespeicherte Datensatz gelöscht und eine erneute Eingabe verlangt.
- **Abmelden** löscht die laufende Dualis-Session und die gespeicherten Dualis-Zugangsdaten.
- Der Mail-Tab speichert keine Mail-Passwörter. iOS nutzt den persistenten WebKit-Datenspeicher; Android akzeptiert die WebView-Cookies und ruft beim Schließen, Pausieren und Zerstören `CookieManager.flush()` auf.
- Mail-Anbieter mit kurzlebigen Sessions oder zusätzlicher MFA können trotzdem eine erneute Anmeldung verlangen. Das entscheidet der jeweilige Mailserver.

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
