# Xcode-Meldungen vom 11. Oktober 2026

Grundlage: eingefügte Issue-Navigator-Meldungen, Xcode 27, lokale Quellen und ein neuer iOS-Simulator-Build. Die eingefügte Liste enthält keine Compilerfehler. Mehrere Meldungen nennen dieselben Cordova-Header beim Kompilieren verschiedener Targets.

| Meldung | Ursache und Auswirkung | Einordnung / Behandlung |
| --- | --- | --- |
| `WKProcessPool` (App / CapacitorCordova, Header und Implementierung) | Capacitor 7 verwendet die ältere WebKit-Prozesspool-API. Laut Apple hat die Verwendung mehrerer Pools seit iOS 15 keine Wirkung mehr. | Dependency-Modernisierung, kein durch diese Warnung belegter Absturz. In installiertem 7.6.7 und geprüftem 7.6.9 weiterhin vorhanden. Kein Eingriff in `node_modules`. |
| `UTTypeCreatePreferredIdentifierForTag`, `kUTTagClassFilenameExtension`, `UTTypeCopyPreferredTagWithClass`, `kUTTagClassMIMEType` | Capacitor bestimmt MIME-Typen mit älteren MobileCoreServices-APIs statt UniformTypeIdentifiers. | Vier Warnungen für einen zusammengehörigen Codepfad. Auch 7.6.9 enthält diesen Code. Ein künftiges Dependency-Update / Upstream-Fix sollte auf `UTType` migrieren. |
| LocalNotifications `.alert` | Ältere Darstellung von Benachrichtigungen im Vordergrund; moderne API verwendet `.banner` / `.list`. | Funktionale Modernisierung des Plugins, kein Buildfehler. Installiertes 7.0.7 ist aktuell innerhalb 7.x. Kein pauschaler Austausch ohne Prüfung des gewünschten Vordergrundverhaltens. |
| LocalNotifications `summaryArgument` | Das Plugin setzt ein seit iOS 15 ignoriertes Zusammenfassungsfeld. | Niedrige Priorität: das Feld hat keine Wirkung. Die eigentlichen Benachrichtigungen werden dadurch nicht als defekt nachgewiesen. Upstream-Bereinigung. |
| StatusBar `UIApplication.shared.windows` | Das Plugin sucht das Key Window über die ältere globale Fensterliste statt die konkrete `UIWindowScene`. | Modernisierung mit möglicher Bedeutung bei mehreren Szenen. Die App verwendet eine einzelne Szene; die Warnung belegt keinen Fehler ihrer Scene-Konfiguration. Installiertes 7.0.6 ist aktuell innerhalb 7.x. |
| App: `Update to recommended settings` | Projektmetadaten stammten aus älteren Xcode-Versionen. | Sichere Vorschläge übernommen: zusätzliche Compilerwarnungen, Parallelisierung unabhängiger Targets und zeitgemäße Bezeichnung der Extension-Einbettung. Xcode normalisierte zudem äquivalente Runpath-/Swift-Optimierungseinstellungen. iOS 15 für die App und 16.1 für das Widget bleiben erhalten. Automatische Erhöhung der Mindestversion und Script-Sandboxing nicht übernommen. Einzelne Empfehlungen können deshalb weiterhin angeboten werden; sie sind bewusst nicht pauschal angewendet. |
| Pods: `Update to recommended settings` | Generiertes CocoaPods-Projekt war noch nicht für Xcode 27 geprüft. | Xcode hat die Parallelisierung übernommen. Die geprüfte Konfiguration und Review-Metadaten werden über den versionierten `post_install`-Hook wiederhergestellt. Keine manuellen Änderungen an generierten Pods erforderlich. |
| `[CP] Embed Pods Frameworks` läuft bei jedem Build | Der bestehende Capacitor-Workaround deaktiviert CocoaPods-Ein-/Ausgabepfade. Ohne diese kann Xcode keine Abhängigkeiten ableiten. | Behoben: `post_integrate` deklariert diese konkrete Phase explizit als bei jedem Build auszuführen, sofern sie keine Ausgabepfade besitzt. Das Verhalten bleibt bewusst gleich; die Warnung entfällt. Nach zwei `cap sync ios`-Läufen geprüft. |

Quellen: [Apple: WKProcessPool](https://developer.apple.com/documentation/webkit/wkprocesspool), [CocoaPods: Installationsoptionen und Hooks](https://guides.cocoapods.org/syntax/podfile), die im Issue Navigator benannten lokalen Plugin-Quellen sowie das separat geprüfte Registry-Paket `@capacitor/ios@7.6.9`. Es wurden keine Dependency-Warnungen global unterdrückt und keine Änderungen an heruntergeladenen Paketen vorgenommen.

## Zusätzlich in der geöffneten Debug-Konsole sichtbar

Diese Meldungen sind nicht Bestandteil der eingefügten Compilerliste und müssen getrennt betrachtet werden:

- Firebase meldet eine nicht konfigurierte Default-App. Das Community-Messaging-Plugin prüft beim Laden `FirebaseApp.app()`, konfiguriert Firebase aber nur mit vorhandenem `GoogleService-Info.plist`. Diese Datei ist in diesem App-Target nicht eingebunden. Remote-Push kann damit in diesem Build nicht verwendet werden; lokale Benachrichtigungen und Kalenderzugriff sind davon getrennt. Ohne passende Projektkonfiguration lässt sich das nicht sinnvoll durch blindes `FirebaseApp.configure()` beheben.
- `nw_read_request_report ... Operation timed out` bezeichnet einen tatsächlichen Netzwerk-Timeout. Die Konsole allein enthält keinen zuordenbaren Endpunkt; ein konkreter Rapla-/Dualis-/Mail-Fehler ist damit nicht bestimmt. Bei reproduzierbarem Funktionsausfall mit URL und Zeitpunkt untersuchen.
- Sandbox-/WebContent-/PointerUI-/Location-Entitlement-Ausgaben stammen aus dem System beziehungsweise WebKit. Die vorhandenen Zeilen allein belegen weder einen App-Absturz noch einen fehlenden, von der App benötigten Standortzugriff. Kein Standort-Entitlement allein zum Entfernen einer Konsolenmeldung ergänzen.
- Der neue Build meldet teilweise `Metadata extraction skipped, no AppIntents.framework dependency found`. Ein automatischer Xcode-Metadaten-Schritt findet keine AppIntents-Implementierung im jeweiligen Target. Kein zusätzlicher AppIntents-Code ist zum Beheben der eingefügten Warnungen nötig.

## Prüfung

- Zweimal `npx cap sync ios` erfolgreich; Plugin-Registrierung und Projektanbindung erhalten.
- iOS-Simulator-Build mit Xcode 27: erfolgreich, ohne Deployment-Target-Override. Ein zusätzlicher Build in der geöffneten Xcode-Workspace für das ausgewählte iPhone meldet ebenfalls `Build Succeeded`; keine Installation oder Laufzeitprüfung gehört zu diesem Buildtest.
- Nach dem erneuten Sync kein Warnhinweis zur Framework-Skriptphase im neuen Buildlog; die Laufphase ist explizit immer aktiv.
- Abhängigkeiten und Compilerwarnungen zu veralteten APIs bleiben sichtbar. Ein erfolgreicher Build bestätigt weder alle Laufzeitfunktionen noch reale Push-Konfiguration.
