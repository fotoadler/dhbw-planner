# Freiwillige Unterstützung

Die native App bietet vier Unterstützungsbeträge ohne Abo. Der erste Kauf schaltet Widgets und das goldene App-Symbol dauerhaft und wiederherstellbar frei; danach bleiben dieselben Beträge beliebig oft als Unterstützung kaufbar. Kalender, Dualis und Mail bleiben kostenlos. Der Browser führt keine Käufe aus. Produktpreise und Währungen kommen aus dem Store; nicht verfügbare Produkte werden nicht angeboten. Solange nicht alle vier Produkte geladen sind, erscheint kein automatischer Hinweis.

## Dauerhafte Freischaltung und weitere Unterstützung

Für den ersten Kauf verwendet die App `support_gold_1`, `support_gold_3`, `support_gold_5`, `support_gold_10` (Apple: **Non-Consumable**, Google: **Buy**, durch die App nur bestätigen, niemals verbrauchen). Alle vier Produkte schalten dieselben Widgets und das goldene App-Symbol frei. Deutsche Endpreise: 1/3/5/10 EUR. Produktbeschreibung: „Widgets und goldenes App-Symbol freischalten.“

Nach bestätigter Freischaltung lädt die App die nachfolgenden, bestehenden Consumables für beliebig wiederholbare Unterstützungen. Die dauerhafte Freischaltung bleibt dabei bestehen. Der Wechsel zwischen beiden Produktgruppen erfolgt automatisch; kein zweiter Kauf ist für das Symbol nötig.

- Wiederherstellung automatisch beim Start sowie explizit über „Käufe wiederherstellen“ in den Einstellungen, mit demselben Apple-/Google-Store-Konto.
- Das Gold-Symbol wird nach Wiederherstellung erneut auswählbar, nicht ungefragt aktiviert. Auswahl „Standard“/„Gold“ in den Einstellungen.
- Kein plattformübergreifender Transfer Apple ↔ Google, kein zusätzliches Benutzerkonto oder Backend.
- Bestehende lokale Unterstützungen, einschließlich des früheren 2-EUR-Produkts, erhalten Widgets und Gold ohne weiteren Kauf. Apple kann mit `SKIncludeConsumableInAppPurchaseHistory` ab iOS 18 auch abgeschlossene Verbrauchskäufe in der Transaktionshistorie liefern. Google liefert bereits verbrauchte Käufe nach einer Neuinstallation nicht zurück; ohne den bisherigen lokalen Status ist hierfür keine automatische Wiederherstellung möglich. Die neuen `support_gold_*` sind auf beiden Plattformen wiederherstellbar. Sandbox-Berechtigungen bleiben Testberechtigungen.
- Bestätigte iOS-Transaktionen mit `revocationDate` und ausstehende Android-Käufe schalten Gold nicht frei. Erfolgreiche Store-Abfragen gleichen den lokalen Cache ab.
- Bis zum verifizierten Kaufergebnis ersetzt ein Spinner die Angebotsansicht. Die Danke-Animation beginnt unmittelbar nach der bestätigten Transaktion und lokaler Speicherung; das Store-Finalisieren läuft danach. Fehlgeschlagenes Finalisieren wird beim nächsten Start erneut versucht.

## Wiederholbare Produkte in beiden Stores

| Produkt-ID (exakt) | Anzeigename | Zielpreis Deutschland |
| --- | --- | --- |
| `support_1` | Kleine Unterstützung | 1,00 € |
| `support_3` | App unterstützen | 3,00 € |
| `support_5` | Großes Dankeschön | 5,00 € |
| `support_10` | Besonderes Dankeschön | 10,00 € |

Beschreibung bei Apple: „Weitere Unterstützung für die App-Betriebskosten.“ Die Extras bleiben unverändert freigeschaltet; der Dialog kennzeichnet diese Käufe als „Erneut unterstützen“.

### App Store Connect

1. Unter Geschäftsbereich/Business die Vereinbarung für kostenpflichtige Apps sowie Bank- und Steuerangaben vervollständigen.
2. In DHBW Planner vier In-App-Käufe vom Typ **Verbrauchsartikel / Consumable** mit den obigen Produkt-IDs sowie vier **Non-Consumables** `support_gold_1/3/5/10` für den wiederherstellbaren Erstkauf anlegen. Referenznamen, deutsche Lokalisierung, Preise und Verfügbarkeit eintragen. Bei abweichender Preisstaffel den tatsächlich gewünschten verfügbaren Preis wählen.
3. Review-Screenshot des Unterstützungsdialogs und Review-Hinweis hinterlegen: Einstellungen → App unterstützen; freiwilliger Einmalkauf; Kalender, Dualis und Mail bleiben kostenlos, Widgets und Gold-Symbol werden unabhängig vom Betrag dauerhaft freigeschaltet. Der Zugang funktioniert auch im lokalen Review-Demomodus, automatische Hinweise sind dort deaktiviert.
4. Neues Build mit dem Plugin hochladen. Die In-App-Purchase-Capability ist lokal im Xcode-Target aktiviert. Die ersten In-App-Käufe zusammen mit einer neuen App-Version zur Prüfung einreichen.
5. In Sandbox/TestFlight jeden Kauf, Abbruch und erneuten Kauf prüfen. Gegebenenfalls das Small Business Program separat beantragen; reduzierte Gebühren gelten nicht automatisch.

### Google Play Console

1. Händler-/Zahlungsprofil einschließlich Bank- und Steuerangaben vervollständigen.
2. Vier **Einmalprodukte / One-time products** mit den obigen Produkt-IDs anlegen, je eine normale Kaufoption vom Typ **Buy** mit Preisen und Ländern konfigurieren und aktivieren. Keine Miet-, Rabatt- oder Vorbestelloptionen verwenden. Zusätzlich vier Buy-Einmalprodukte `support_gold_1/3/5/10` für die dauerhafte Freischaltung anlegen. Die App verbraucht nur `support_*`, während `support_gold_*` bestätigt und erhalten bleiben; keine Abonnements anlegen.
3. Neues AAB mit Billing-Anbindung zunächst in einen internen Test hochladen, Tester und Lizenztester eintragen. App aus Google Play installieren und alle vier Käufe, Abbruch, ausstehende Zahlung und Wiederholung prüfen.
4. Angaben zu In-App-Käufen und Datensicherheit sowie Store-Beschreibung prüfen und mit dem neuen Release zur Prüfung einreichen.






## Kostenlose iPhone-Kaufprüfung


## Wann welcher Dialog erscheint

Die folgenden Regeln beschreiben den aktuell implementierten Stand. Ein Update setzt vorhandene Werte unter `support.v1` nicht zurück. Es gibt kein Gesamtlimit. Auf die erste automatische Anzeige folgt eine Erinnerung frühestens nach 14 Tagen; anschließend beträgt der Abstand mindestens 90 Tage.

| Nutzer / Auslöser | Bildschirm | Frühester Zeitpunkt / Häufigkeit |
| --- | --- | --- |
| Neuinstallation ohne eingerichteten Kurs beim ersten Laden der Einstellungen | Geladener Kalender (Tag, Woche oder Monat) | 14 Tage nach erster Initialisierung der Unterstützungsfunktion **und** mindestens 10 Sitzungen |
| Update mit bereits eingerichtetem Kurs, aber noch ohne `support.v1` | Geladener Kalender | 7 Tage nach erster Initialisierung der Unterstützungsfunktion **und** mindestens 10 Sitzungen; frühere App-Nutzung wird nicht nachgezählt |
| Update mit vorhandenem `support.v1` | Geladener Kalender | Bisherige Frist, Sitzungen, Ablehnung und Anzeigezähler bleiben erhalten |
| „Später erinnern“, Zurück, Escape oder Hintergrundfläche des Dialogs | Derselbe automatische Hinweis über dem Kalender | Nach der ersten Anzeige: frühestens 14 Tage nach dem Schließen. Ab der zweiten Anzeige: jeweils frühestens 90 Tage; kein Gesamtlimit |
| Bisherige Unterstützung oder noch ausstehender Kauf | Kein automatischer Hinweis | Manuelles Öffnen bleibt möglich |
| „App unterstützen“ | Einstellungen | Jederzeit manuell, unabhängig von Frist, Sitzungen und Ablehnung; ohne automatischen Anzeigezähler, startet aber die 90-tägige Ruhezeit neu |
| Goldener Vorteilsbutton | Einstellungen oder Kaufdialog | Vorschau auf Widgets oder App-Symbole, ausschließlich nach Antippen |
| Betrag antippen | Aktueller Kaufdialog | Ladeanzeige; anschließend nativer Apple-/Google-Kaufdialog; nach bestätigtem Kauf Danke/Konfetti im selben App-Dialog |

Der automatische Dialog heißt „DHBW Planner unterstützen“ und hat nur „Später erinnern“ als Schließaktion. Ein dauerhafter Ablehnungsbutton wird nicht mehr angeboten. Der manuell geöffnete Dialog bietet stattdessen „Schließen“. Beide zeigen dieselben Beträge und Vorteilsvorschauen. Wiederherstellen zeigt Statusmeldungen unten in den Einstellungen, keinen automatischen Angebotsdialog.

### Voraussetzungen und lokale Speicherung

- Speicherung in Capacitor Preferences unter `support.v1`, ohne eigenes Backend oder Übertragung der Nutzungssitzungen an den Entwickler.
- Ein kalter App-Start zählt einmal. Rückkehr aus dem Hintergrund zählt erst nach mindestens 30 Minuten seit dem letzten gezählten Sitzungsbeginn. StrictMode zählt nicht doppelt. Die zehn Sitzungen müssen nicht vor jeder Erinnerung erneut gesammelt werden.
- Wenn sämtliche Voraussetzungen erfüllt sind, wartet die App 1,5 Sekunden. Verlassen des geeigneten Bildschirms während dieser Wartezeit bricht den Timer ab. Je App-Laufzeit wird höchstens ein automatischer Hinweis angezeigt. Der Zähler wird erst nach der sichtbaren Darstellung aktualisiert; ein während der Speicherabfrage verworfener Versuch zählt nicht.
- Nur im Vordergrund, nach abgeschlossener Store-Abfrage. Kein automatischer Hinweis in Einstellungen, Dualis, Mail, Einrichtung, Demo-/Reviewmodus, offline oder während des Ladens. Kursauswahl/-verwaltung, Teilen, Modulhinweis und geöffnete Vorlesungsdetails blockieren ihn ebenfalls.
- Alle vier Kaufprodukte müssen geladen sein. Die erste Store-Wiederherstellung erfolgt vor dem Katalogladen; erkannte Unterstützer werden nicht erneut automatisch gefragt.
- Eine Grenze wird nicht durch einen eigenen täglichen Timer überwacht, sondern bei erneuter Prüfung, beispielsweise nach Start/Resume oder Wechsel zurück in den Kalender.
- Anzeigezähler und Fristen gelten lokal. Eine früher bereits ausdrücklich gewählte Abwahl bleibt bei der Migration respektiert; beschädigte Zustände unterdrücken Hinweise weiterhin. Eine echte Neuinstallation ohne wiederhergestellte App-Daten kann sie zurücksetzen. Wiederhergestellte dauerhafte Käufe unterdrücken neue Hinweise; für alte Verbrauchskäufe gelten die oben beschriebenen Store-Grenzen.

### Rückkehr nach der Praxisphase und behobene Randfälle

- Nach mindestens 30 Tagen ohne Nutzung bleibt der erste Besuch frei von automatischen Erinnerungen. Die App wartet anschließend mindestens 24 Stunden und mindestens eine weitere gezählte Sitzung. Die übrigen Voraussetzungen gelten zusätzlich.
- Ein manueller Aufruf setzt die 90-tägige Ruhezeit neu und verhindert einen automatischen Hinweis in derselben App-Laufzeit.
- Der Timer wird bei einem Bildschirmwechsel oder Wechsel in den Hintergrund verworfen. Nach Rückkehr wird erst nach dem Store-Abgleich und erneut 1,5 Sekunden geprüft.
- Die letzte Nutzung wird beim Start, bei Rückkehr und beim Wechsel in den Hintergrund lokal gespeichert. Vorhandene Zustände werden ergänzt: Ablehnung, Unterstützerstatus und Historie bleiben erhalten. Die frühere Grenze von zwei Anzeigen entfällt.
- Ein bereits gestarteter Kaufdialog wird beim Wechsel zur Store-Bestätigung nicht geschlossen; die Lade-/Danke-Ansicht bleibt erhalten.

## Zahlungsabwicklung und Prüfung



- Alle vier lokalisierten Preise und wiederholten Käufe.
- Abbruch ohne Dankesmeldung; ausstehende Zahlung ohne vorzeitige Erfolgsmeldung.
- Abschluss einer ausstehenden Zahlung und Neustart während des Kaufablaufs.
- Fehlende Produkte, Offlinebetrieb, Doppeltippen sowie keine simulierten Browser-Käufe.
- Hinweisfristen (erste Erinnerung 14 Tage, danach 90 Tage), Bestandsnutzer und weiterhin kostenlose Funktionen.


Offizielle Anleitungen: [Apple: In-App-Käufe einreichen](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/), [Google: Einmalprodukte anlegen](https://support.google.com/googleplay/android-developer/answer/16430488?hl=de).






- iOS: WidgetKit, klein/mittel/groß; verwendet die bestehende Erweiterung zusammen mit der Live-Aktivität. App und Erweiterung teilen ausschließlich einen reduzierten Stundenplan-Snapshot über `group.de.dhbw.raplaplan.widgets`.
- Android: drei AppWidget-Anbieter mit anpassbarer Größe. Aktualisierungen an Vorlesungsgrenzen/Mitternacht sowie periodisch; Android kann diese zur Schonung des Akkus verzögern. Keine zusätzliche Berechtigung für exakte Alarme.
- Hauptkurs und aktuelle Modulfilter; maximal 14 Tage aus dem letzten App-Abruf, mit Titel, Zeit und Raum. Kein selbstständiger Netzwerkabruf, keine Anmeldedaten oder Dozentennamen im Snapshot. Datenstand sichtbar. Fehlende Daten werden nicht als freier Tag dargestellt.
- Mittel und groß zeigen auch vergangene Vorlesungen des heutigen Tages. Groß zeigt unten je nach Platz bis zu drei kommende geladene Vorlesungstage; vorlesungsfreie und unbekannte Tage werden ausgelassen.
- Antippen öffnet die Tagesansicht mit Datum und Hauptkurs. Ein gesperrtes Widget führt zu den Unterstützungseinstellungen. Widgets werden durch Nutzer selbst auf dem Home-Bildschirm hinzugefügt.
- Alle Beträge und bestehende lokal nachweisbare Unterstützungen schalten alle drei Größen frei. Wiederholte Unterstützungen bleiben möglich. Ein lokal bekannter Status funktioniert auch ohne erreichbaren Store.



## Vorschauen und kompakte Einstellungen

Der Einstellungsbereich besteht aus einem kurzen Kostenhinweis, zwei anklickbaren Vorteilen und „App unterstützen“. Die Widget-Vorschau zeigt drei native Beispielbilder mit Wischgeste, Pfeilen und Größenauswahl; der Symbol-Vorteil zeigt Rot und Gold nebeneinander. Bereits freigeschaltete Nutzer ändern ihr App-Symbol in einem eigenen Dialog. Auf der Einstellungsseite werden keine Symbolkacheln mehr eingeblendet. Beide Vorschauen sind auch aus dem Kaufdialog erreichbar; das Schließen löst keinen Kauf aus. Wiederherstellung bleibt separat erreichbar.

## Review-Prüfung vom 21. Oktober 2026

- Review-Hinweise erklären den unveränderten kostenlosen Kalender/Dualis/Mail, gleiche Extras bei allen Beträgen, Wiederherstellung und die Teststrecke für Widgets mit öffentlich konfiguriertem Kurs ohne Hochschul-Login. Der lokale Demomodus zeigt den Kaufdialog, schreibt aber keine Widget-Daten.
- Die App und ihre Widget-Erweiterung enthalten eigene Privacy-Manifeste für UserDefaults. App: `CA92.1` und `1C8F.1`; Widget: `1C8F.1`. Die Dateien müssen in den jeweiligen gebauten Bundles enthalten sein.
- Der Android-Build enthält Google Play Billing 8.3.0 einschließlich Versions-Metadatum und BILLING-Berechtigung. Version 8 ist laut aktuellem Google-Zeitplan für neue Apps und Updates bis 31. August 2027 unterstützt.


Quellen: [Apple UserDefaults](https://developer.apple.com/documentation/foundation/userdefaults), [Apple Required Reason APIs](https://developer.apple.com/documentation/bundleresources/app-privacy-configuration/nsprivacyaccessedapitypes/nsprivacyaccessedapitype), [Google Billing-Versionen](https://developer.android.com/google/play/billing/deprecation-faq), [Google Zahlungen](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [Google Datenschutz](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en), [Apple erste In-App-Käufe einreichen](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-in-app-purchase/).


