# Changelog

Alle nennenswerten Änderungen werden hier dokumentiert.

## Unveröffentlicht

### Funktionen und Darstellung

- Standorte ohne bestätigten Webmail-Login zeigen im Mail-Tab jetzt einen standortspezifischen Hinweis mit Feedback- und GitHub-Aktion statt eines generischen Leerzustands.
- Die Einstellungen weisen sichtbar darauf hin, dass DHBW Planner Open Source ist, und verlinken das Repository.

### Fehlerbehebungen

- Die native Mail-WebView unter Android liegt nicht mehr unter Statusleiste oder Display-Cutout. Sie ist eine native View über der Capacitor-WebView und erbt deren CSS-Safe-Area-Insets nicht. Ergänzt wird nur der Anteil der System-Insets, den der Host tatsächlich noch überdeckt — ohne erzwungenes Edge-to-Edge (Android 14 und älter) hat das DecorView die Leisten bereits verrechnet, ein ungeprüfter Rand wäre dort ein zweiter, sichtbarer Abstand. Rotation, Split-Screen und eingeblendete Tastatur positionieren die Ansicht jetzt neu.
- Der Mail-Tab zeigt beim Öffnen einen Ladekreis statt einer weißen Fläche. Die native Mail-WebView liegt über der App und war bis zum ersten gezeichneten Bild weiß — für mehrere Sekunden sah der Tab dadurch defekt aus. Sie bleibt jetzt unsichtbar, bis sie tatsächlich etwas anzeigt (Android `onPageCommitVisible`, iOS `didFinish`), spätestens aber nach acht Sekunden; solange ist der Ladehinweis der App sichtbar.
- Der Stuttgarter Webmail-Einstieg zeigt auf `/roundcubemail/`. Die bisherige Adresse lieferte nur eine Infoseite statt des Shibboleth-SSO-Logins.

- Android startet im Dark Mode wieder. `values-night/styles.xml` definierte `AppTheme`, `AppTheme.NoActionBar` und `AppTheme.NoActionBarLaunch` ohne `parent`; da Ressourcen-Qualifier einen Style vollständig ersetzen statt ihn zu ergänzen, verloren die Themes im Dark Mode ihre Abstammung von `Theme.AppCompat` und die App stürzte bei jedem Start mit `IllegalStateException: You need to use a Theme.AppCompat theme (or descendant) with this activity.` ab. Im hellen Design trat der Fehler nicht auf.
- Der System-Zurück-Button funktioniert unter Android wieder. `@capacitor/app` registriert beim Start einen aktiven `OnBackPressedCallback`, der ohne `backButton`-Listener nur `webView.goBack()` aufruft. Da die Navigation reiner React-State ohne History ist, wurde jeder Zurück-Druck wirkungslos verschluckt — weder eine Ebene zurück noch das Verlassen der App war möglich. Ein Zurück-Druck baut jetzt eine sichtbare Ebene ab: Einstellungen, Kursdetail, Bereich, Dualis-Unterseite, Wochenansicht, danach wird die App beendet.

### Entwicklung

- Die Zurück-Navigation liegt als reine Funktion in `src/ui/backNavigation.ts` und ist über `tests/backNavigation.test.ts` abgedeckt; `src/ui/useBackButton.ts` bleibt ein dünner Wrapper um das Plugin.
- `tests/embeddedMailLayout.test.ts` sichert die Inset-Logik des nativen Mail-Plugins schmal über den Quelltext ab; die Sichtprüfung auf Android 14 und Android 15+ ersetzt das nicht. Die Repository-Adresse liegt als `PROJECT_REPOSITORY_URL` in `src/lib/projectLinks.ts`.
- Die Aktionen der Mailhilfe stehen als `mailSupport`/`mailContribution` mit verpflichtender Beschriftung in der Standortkonfiguration. Als getrennte optionale Href- und Label-Felder konnte eine Beschriftung an einem fremden Ziel landen, ohne dass der Compiler es bemerkt.
- `tests/androidThemes.test.ts` prüft die explizite AppCompat-Abstammung der Night-Styles sowie die vollständige Splashscreen-Konfiguration. Der Fehler war rein deklarativ und wurde weder vom TypeScript-Compiler noch von `lintVitalRelease` erkannt.
- Bekannte Schwachstellen der Build-Toolchain über `npm audit fix` behoben (nur `package-lock.json`, keine Laufzeitabhängigkeiten der App).

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
