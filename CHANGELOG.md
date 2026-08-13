# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert.

## Unveröffentlicht

### Fehlerbehebungen

- Die Live Activity auf dem Sperrbildschirm ist im hellen Erscheinungsmodus wieder lesbar und wird wie zuvor in jedem Modus dunkel dargestellt. Der Hintergrund lag zuletzt auf `Color(uiColor: .systemBackground)`. Diese gebrückte UIKit-Farbe löst gegen die Trait-Collection des Geräts auf und wird im hellen Modus weiß, während der Sperrbildschirm Live Activities immer im dunklen Schema rendert und `Color.primary` deshalb weiß bleibt — weiße Schrift auf weißem Grund. Hintergrund und Farbschema der Ansicht sind jetzt fest gesetzt, ebenso in der aufgeklappten Dynamic Island: deren Hintergrund ist hardwarebedingt immer schwarz, dort hätte `Color.primary` im hellen Modus schwarzen Text auf Schwarz ergeben.

## 1.4.1 - 2026-08-10

### Funktionen und Darstellung

- Die Mensa-Ansicht kennt jeden Standort einzeln: eigene Einrichtungen, Kategorien, Preise, Kennzeichnungen, Schließzeiten und Vorbestellhinweise statt einer gemeinsamen generischen Darstellung. Partnerrestaurants und nicht tagesbezogene Campusangebote stehen eingeklappt darunter.
- Bad Mergentheim wird als Essensmarken-Modell mit Kooperationsrestaurants geführt, CAS mit wählbarem Essensstandort.
- Der Wechsel des Essensstandorts bleibt sichtbar, solange der Studienstandort mehrere Studienakademien bündelt — vorher verschwand er nach dem ersten Wechsel und war nur über die Einstellungen erreichbar.

### Fehlerbehebungen

- Vorlesungstitel nutzen in der Wochenansicht die tatsächlich verfügbare Kachelhöhe und werden nur noch bei wirklich zu kurzen Terminen mit einer Ellipse abgeschnitten.
- Historisch falsch gespeicherte Heidenheimer Kursnamen (`DHD-…`) werden zu `HDH-…` korrigiert; der Kursplan-Endpunkt antwortet auf die alte Schreibweise mit 404.
- Die Auswahlhaptik unter iOS funktioniert wieder: Capacitor verlangt den Dreischritt aus Start, Änderung und Ende; ein einzelnes `selectionChanged` löst kein Feedback aus.
- Für Bad Mergentheim entfallen die acht Speiseplanlinks des Studierendenwerks. Sie zeigten auf eine einzige Platzhalterdatei mit dem Text „Derzeit kein Speiseplan vorhanden!“; verlinkt sind jetzt nur restauranteigene Seiten.
- Der Dualis-Login unter Android schlägt nicht mehr mit „Dualis-Anmeldung ist abgelaufen oder wurde abgelehnt." fehl. CapacitorCookies installiert beim Start unabhängig von `CapacitorCookies.enabled` einen globalen CookieHandler; der schreibt jedes `Set-Cookie` in den WebView-Cookie-Jar und hängt es beim nächsten Request als zweiten `Cookie`-Header an. Beide Header werden zusammengefasst, sodass am Server `cnsc=<wert>,cnsc=<wert>` ankam — Cookie-Werte werden aber mit `; ` getrennt, nicht mit `,`. CampusNet las dadurch einen einzigen Cookie mit unbrauchbarem Wert und lieferte wieder das Loginformular. Der native Jar wird jetzt nach jeder Antwort geleert, und zwar mit der Request-URL: CampusNet sendet den Cookie ohne `Path`-Attribut, der WebView bindet ihn deshalb an `/scripts`, und ein Aufruf auf die blanke Origin hätte ihn nicht erfasst. Im Browser trat der Fehler nicht auf, weil die Fetch-API den selbst gesetzten `Cookie`-Header verwirft und nur einer hinausgeht.
- Die bestehende Aufräumroutine für native Cookies bei Anmeldung und Abmeldung erfasst den Session-Cookie jetzt tatsächlich. Sie leerte bisher nur die Origin und ging damit am pfadgebundenen Cookie vorbei.
- Der Dualis-Login zeigt „Angemeldet bleiben“ nur noch dort, wo die Zugangsdaten auch abgelegt werden können. Das SecureStorage-Plugin ist ohne Web-Implementierung registriert, im Browser scheiterte das Speichern deshalb immer — angeboten wurde es trotzdem.
- Scheitert das Speichern der Zugangsdaten auf dem Gerät, erscheint kein Fehler mehr. Die Anmeldung selbst hat funktioniert; die Meldung steht jetzt als sachlicher Hinweis in der Dualis-Ansicht und sagt, was daraus folgt: „beim nächsten Start musst du dich erneut anmelden.“

### Sicherheit

- Die Dualis-Session landete unter Android trotz `CapacitorCookies: { enabled: false }` im WebView-Cookie-Store, weil diese Einstellung nur die JavaScript-Seite steuert. Mit dem Leeren des Jars nach jeder Antwort gilt die dokumentierte Zusage wieder, dass Session-Cookies ausschließlich im Speicher gehalten werden.
- Native Plugin-Aufrufe werden auch in Debug-Builds nicht mehr protokolliert,
  damit Dualis-Benutzername und -Passwort nicht im Android-/iOS-Systemprotokoll
  erscheinen.

### Entwicklung

- Standortprofile liegen in `src/mensa/sites/`, das gemeinsame ViewModel in `src/mensa/model.ts`. Standort-Sonderfälle gehören ausschließlich in Profilfelder — `partialWithoutMain`, `partnersLabel` und `venuePicker` ersetzen die vorherigen Abfragen auf Standortcodes im Loader und in der Oberfläche.
- Zeitlich begrenzte Angaben tragen `source` und `checkedAt`, damit feste Datumsfenster nicht unbemerkt veralten.
- `tests/diningSites.test.ts` prüft die Abdeckung gegen `SITE_CONFIGURATIONS` statt gegen eine feste Liste; ein neuer Standort ohne Essensprofil fällt damit auf.
- Aufbau und Erweiterung sind in `docs/MENSA_INTEGRATION.md` beschrieben.
- `tests/dualisAndroidCookies.test.ts` deckt den nativen Cookie-Transport über einen gemockten Capacitor-Layer ab: Für jede angefragte URL muss der Jar mit genau dieser URL geleert werden, der Session-Cookie genau einmal und ohne Komma hinausgehen, und andere Plattformen dürfen unberührt bleiben.
- Der Dualis-State trennt `error` und `notice`: `error` bleibt echten Fehlern und dem roten Kasten im Login-Formular vorbehalten, `notice` trägt Hinweise ohne Fehlercharakter. Beides wird beim nächsten Anmeldeversuch und beim Abmelden zurückgesetzt.
- `isSecureStorageAvailable()` in `src/store/dualis.ts` beantwortet die Plattformfrage an einer Stelle, analog zu `isEmbeddedMailAvailable()`. `tests/dualisCredentialStorage.test.ts` deckt den Hinweiszweig über den gerenderten Hook ab.

## 1.4.0 - 2026-08-10

### Funktionen und Darstellung

- Standorte ohne bestätigten Webmail-Login zeigen im Mail-Tab jetzt einen standortspezifischen Hinweis mit Feedback- und GitHub-Aktion statt eines generischen Leerzustands.
- Die Einstellungen weisen sichtbar darauf hin, dass DHBW Planner Open Source ist, und verlinken das Repository.

### Fehlerbehebungen

- Die native Mail-WebView unter Android liegt nicht mehr unter Statusleiste oder Display-Cutout. Sie ist eine native View über der Capacitor-WebView und erbt deren CSS-Safe-Area-Insets nicht. Ergänzt wird nur der Anteil der System-Insets, den der Host tatsächlich noch überdeckt — ohne erzwungenes Edge-to-Edge (Android 14 und älter) hat das DecorView die Leisten bereits verrechnet, ein ungeprüfter Rand wäre dort ein zweiter, sichtbarer Abstand. Rotation, Split-Screen und eingeblendete Tastatur positionieren die Ansicht jetzt neu.
- Unter Android überdecken Statusleiste und Navigationsleiste nicht mehr die Kopfzeile und die Beschriftungen der Tab-Leiste. Android-WebViews melden über `env(safe-area-inset-*)` nur Display-Cutouts, nicht die Systemleisten — das Layout reservierte dafür 0 px, während die WebView über die volle Displayhöhe zeichnete. `MainActivity` liest die echten Insets und schreibt sie als `--inset-top`/`--inset-bottom` in die Seite; das CSS nimmt über `--safe-top`/`--safe-bottom` den größeren Wert aus `env()` und Variable, sodass iOS unverändert bleibt. Gemessen im Emulator: 24 px oben und unten statt vorher 0.
- Der Mail-Tab zeigt beim Öffnen einen Ladekreis statt einer weißen Fläche. Die native Mail-WebView liegt über der App und war bis zum ersten gezeichneten Bild weiß — für mehrere Sekunden sah der Tab dadurch defekt aus. Sie bleibt jetzt unsichtbar, bis die Seite geladen ist (Android `onPageFinished`, iOS `didFinish`), im Fehlerfall und spätestens nach acht Sekunden; solange ist der Ladehinweis der App sichtbar. `onPageCommitVisible` wäre der frühere Zeitpunkt, meldet aber bereits den ersten, noch leeren Frame und blendete genau die weiße Fläche ein.
- Der Stuttgarter Webmail-Einstieg zeigt auf `/roundcubemail/`. Die bisherige Adresse lieferte nur eine Infoseite statt des Shibboleth-SSO-Logins.
- Android startet im Dark Mode wieder. `values-night/styles.xml` definierte `AppTheme`, `AppTheme.NoActionBar` und `AppTheme.NoActionBarLaunch` ohne `parent`; da Ressourcen-Qualifier einen Style vollständig ersetzen statt ihn zu ergänzen, verloren die Themes im Dark Mode ihre Abstammung von `Theme.AppCompat` und die App stürzte bei jedem Start mit `IllegalStateException: You need to use a Theme.AppCompat theme (or descendant) with this activity.` ab. Im hellen Design trat der Fehler nicht auf.
- Der System-Zurück-Button funktioniert unter Android wieder. `@capacitor/app` registriert beim Start einen aktiven `OnBackPressedCallback`, der ohne `backButton`-Listener nur `webView.goBack()` aufruft. Da die Navigation reiner React-State ohne History ist, wurde jeder Zurück-Druck wirkungslos verschluckt — weder eine Ebene zurück noch das Verlassen der App war möglich. Ein Zurück-Druck baut jetzt eine sichtbare Ebene ab: Einstellungen, Kursdetail, Bereich, Dualis-Unterseite, Wochenansicht, danach wird die App beendet.

### Entwicklung

- Die Zurück-Navigation liegt als reine Funktion in `src/ui/backNavigation.ts` und ist über `tests/backNavigation.test.ts` abgedeckt; `src/ui/useBackButton.ts` bleibt ein dünner Wrapper um das Plugin.
- `tests/embeddedMailLayout.test.ts` sichert die Inset-Logik des nativen Mail-Plugins schmal über den Quelltext ab; die Sichtprüfung auf Android 14 und Android 15+ ersetzt das nicht. Die Repository-Adresse liegt als `PROJECT_REPOSITORY_URL` in `src/lib/projectLinks.ts`.
- Die Aktionen der Mailhilfe stehen als `mailSupport`/`mailContribution` mit verpflichtender Beschriftung in der Standortkonfiguration. Als getrennte optionale Href- und Label-Felder konnte eine Beschriftung an einem fremden Ziel landen, ohne dass der Compiler es bemerkt.
- `tests/androidThemes.test.ts` prüft die explizite AppCompat-Abstammung der Night-Styles sowie die vollständige Splashscreen-Konfiguration. Der Fehler war rein deklarativ und wurde weder vom TypeScript-Compiler noch von `lintVitalRelease` erkannt.
- Bekannte Schwachstellen der Build-Toolchain über `npm audit fix` behoben (nur `package-lock.json`, keine Laufzeitabhängigkeiten der App).

## 1.3.0 - 2026-08-07

Nachträglich aus der Versionsgeschichte ergänzt: Der Release bestand nur aus einem Versions-Bump, die Änderungen waren hier nie dokumentiert.

### Funktionen und Darstellung

- Helles und dunkles Design folgen dem Systemdesign und lassen sich im Einrichtungsassistenten und in den Einstellungen umstellen.
- Standortabhängige Integrationen für Dualis und Uni-Mail als modulare Standortprofile ergänzt; die Mailplattform wird nicht mehr global angenommen.

### Fehlerbehebungen

- Angemeldete Dualis-Sitzungen überstehen einen Neustart, statt bei jedem Start eine erneute Anmeldung zu verlangen; die iOS-Sitzung bleibt dabei nativ erhalten.
- Benachrichtigungen unter Android werden zuverlässiger zugestellt.
- Die Live-Aktivität unter iOS fällt wieder korrekt zurück, wenn keine Aktivität läuft.

### Entwicklung

- Verpflichtende Qualitätsprüfungen für den Web-Build in der CI ergänzt.
- Doppelter Cookie-Parser nach einem Merge entfernt.

## 1.2.0 - 2026-08-06

### Funktionen und Darstellung

- Geführte Stundenplanauswahl über DHBW-Standort, Studiengang und Kurs ergänzt; der manuelle Rapla-Modus bleibt als Alternative erhalten.
- Mensa-Speisepläne werden im geführten Modus standardmäßig passend zum Standort geladen und können in den Einstellungen manuell auf eine andere Mensa umgestellt werden.
- Vorlesungsmodule können in den Einstellungen gesucht und einzeln ausgeblendet werden; der Filter gilt für API- und Rapla-Pläne sowie deren Benachrichtigungen.
- Der geführte API-Modus lädt mit `archived=true` auch vergangene Termine und ermöglicht die Navigation zu historischen Stundenplanwochen, soweit diese von der API bereitgestellt werden.
- Dozentenangaben werden aus API-Feldern und eingebetteten Terminangaben aufbereitet. Ein lokales Verzeichnis ergänzt bekannte Zuordnungen, wenn die Quelle vorübergehend keine Dozenten liefert.
- Wochenansicht, parallele Termine, Titelumbrüche und die Navigation zwischen Wochen wurden für schmalere und breitere Geräte verbessert.

### Entwicklung und Dokumentation

- Die öffentliche API-Nutzung, ihre Grenzen und die lokale Datenverarbeitung sind in `docs/DHBW_API.md` und `docs/PRIVACY.md` dokumentiert.
- Der öffentliche `main`-Branch ist gegen Force-Pushes und Löschung geschützt. Pull Requests beziehungsweise Änderungen am Hauptbranch müssen den GitHub-Actions-Check `web-quality` mit Tests und Produktions-Build bestehen.

### Sicherheit und Robustheit

- Dualis-Session-Cookies werden nur für laufende Requests im Speicher gehalten; die automatische Capacitor-Cookie-Persistenz ist deaktiviert. Beim Login und Logout wird ein nativer Cookie-Speicher zusätzlich best-effort bereinigt, bleibt aber während des Login-Redirects und der anschließenden authentifizierten Requests erhalten.
- Der Dualis-Login verwendet die aktuelle CampusNet-Menükennung `000000`; dadurch und durch die erhaltene Cookie-Session werden Android-Logins nicht mehr fälschlich als abweichende Dualis-Seite erkannt.
- Native Dualis-Logins steuern Redirects explizit, normalisieren CampusNet-Session-Cookies mit Leerzeichen und akzeptieren alternative Menüvarianten; dadurch bleibt die iOS-Sitzung nach dem Login erhalten.
- Android-App-Backups sind deaktiviert, damit lokale Stundenplan-, Rapla- und Sessiondaten nicht automatisch gesichert werden.
- Rapla-Links werden auf den unterstützten Host und Pfad begrenzt. Persönliche `user`/`file`-Links sowie öffentliche `key`/`salt`-Freigabelinks werden unterstützt.
- Rapla-Antworten werden strukturell geprüft. Fehler- oder Loginseiten mit HTTP 200 werden nicht mehr als leere Kalenderwoche übernommen.
- Parallele Refreshes und doppelte Nachlade-Requests werden entkoppelt; nur der aktuellste Refresh darf den sichtbaren Zustand und Cache aktualisieren.
- Teilfehler beim Mehrwochenabruf führen nicht mehr zum Verwerfen aller erfolgreichen Wochen.
- Überlappende Termine werden in der Wochenansicht als kompakte Parallelgruppe dargestellt; die Tagesansicht enthält weiterhin alle Details.
- Nachgeladene Einzelwochen werden zusammen mit Benachrichtigungen und Live Activity persistiert und synchronisiert.
- Preferences und Cache werden zur Laufzeit validiert. Die neuen Storage-Schemata sind versioniert und lesen bestehende `v1`-Daten kompatibel weiter.

## 1.0.0

- Erste öffentliche Vorbereitung von DHBW Planner
- Rapla-2.0-Stundenplanparser
- Tages- und Wochenansicht
- ICS-Export
- Lokale Benachrichtigungen
- Dualis-Ansicht für Modulnoten und Prüfungen
- iOS- und Android-Projekte über Capacitor
