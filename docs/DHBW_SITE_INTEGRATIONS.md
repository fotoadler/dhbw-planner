# DHBW-Standortintegrationen

## Verifizierter Architektur-Befund

DUALIS ist ein zentraler DHBW-Dienst: Das [Corporate IT Service Center](https://www.dhbw.de/die-dhbw/einrichtungen-service/corporate-it-service-center-cis) betreibt DUALIS für alle DHBW-Standorte. Die offiziellen Standortseiten verlinken deshalb auf denselben Webclient `https://dualis.dhbw.de`.

Die Anmeldung ist trotzdem nicht standortneutral. DUALIS verwendet die jeweilige Hochschul- bzw. Lehrenetzkennung. Beispiele aus den offiziellen Anleitungen:

| Standort | DUALIS-Eingabe | Mailzugang | Status in der App |
| --- | --- | --- | --- |
| Ravensburg | `UserID@stud.dhbw-ravensburg.de` | OWA, `webmail1.dhbw-ravensburg.de/owa` | konfiguriert |
| Friedrichshafen | je nach Bereich unterschiedliche Ravensburg-Domain | Ravensburg-OWA | vollständige Adresse erforderlich |
| Stuttgart | `UserID@lehre.dhbw-stuttgart.de` | Roundcube, `lehre-webmail.dhbw-stuttgart.de/roundcubemail/` (leitet auf den Shibboleth-SSO-Login) | konfiguriert |
| Campus Horb | `UserID@hb.dhbw-stuttgart.de` | `mail.hb.dhbw-stuttgart.de` | konfiguriert |
| Karlsruhe | `UserID@dh-karlsruhe.de` | dokumentiert ist eine Weiterleitungsadresse; ein studentischer Webmail-Einstieg ist nicht bestätigt | Mail-Tab zeigt Hinweis und Mitmach-Aktionen statt einer geratenen Anmeldeseite |
| Mannheim | `UserID@student.dhbw-mannheim.de` | Studgate/Zimbra, `studgate.dhbw-mannheim.de` | konfiguriert |
| Mosbach | `UserID@lehre.mosbach.dhbw.de` | Webmail, `webmail.lehre.mosbach.dhbw.de` | konfiguriert |
| Bad Mergentheim | Mosbacher Accountbereich | Mosbacher Webmail | konfiguriert |
| Villingen-Schwenningen | `UserID@dhbw-vs.de` | Modoboa, `modoboa.dhbw-vs.de` | konfiguriert |
| Heidenheim | vollständige Adresse aus den Accountdaten | Microsoft OWA, `outlook.office.com` | vollständige Adresse erforderlich |
| Heilbronn | vollständige Adresse aus den Accountdaten | `webmail.dhbw.de` | vollständige Adresse erforderlich |
| Lörrach | vollständige Adresse aus den Accountdaten | `webmail.dhbw-loerrach.de` | vollständige Adresse erforderlich |
| CAS | vollständige CAS-Adresse aus den Accountdaten | `webmail.dhbw.de` | vollständige Adresse erforderlich |

Die Tabelle ist eine Integrationshilfe, keine Zusage für die Gültigkeit einzelner Konten. Bei unbekannten oder nicht eindeutig dokumentierten Domains wird nie eine Domain geraten: Nutzer können die vollständige Adresse eingeben; das Login wird unverändert an DUALIS weitergegeben.

## Umsetzung im Quellcode

Alle standortabhängigen Regeln liegen in [`src/dhbw/siteConfiguration.ts`](../src/dhbw/siteConfiguration.ts):

- `dualis.usernameMode = email-domain` ergänzt einen kurzen Accountnamen um eine verifizierte Domain.
- `dualis.usernameMode = full-email` lässt die Eingabe unverändert und verhindert falsche Annahmen.
- `mail` beschreibt Webmail-URL, Plattform und Login-Hinweis. `null` bedeutet, dass kein belastbarer studentischer Webmail-Login bekannt ist.
- Bei `mail: null` beschreiben `mailUnavailableTitle`, `mailUnavailableReason` und `mailUnavailableInstructions` die Hilfe im Mail-Tab; `mailSupport` und `mailContribution` sind die zugehörigen Aktionen. Details in [MAIL_INTEGRATION.md](MAIL_INTEGRATION.md).

Ein weiterer Standort wird als einzelner Eintrag in `SITE_CONFIGURATIONS` ergänzt. Für spezielle Konten, mehrere Domains oder abweichende Login-Regeln soll `full-email` verwendet werden, bis die lokale IT-Dokumentation eine sichere automatische Regel erlaubt. Das native Plugin lädt nur die URL des Profils und kennt keine Standortlogik.

## Primärquellen

- [DHBW Corporate IT Service Center – DUALIS zentral für alle Standorte](https://www.dhbw.de/die-dhbw/einrichtungen-service/corporate-it-service-center-cis)
- [DHBW Stuttgart – DUALIS und Benutzerformat](https://www.dhbw-stuttgart.de/studium/rund-ums-studium/dualis/)
- [DHBW Ravensburg – Zugangsdatenübersicht](https://www.ravensburg.dhbw.de/fileadmin/Ravensburg/Dokumente_Bilder_Contentbereich/ITS/DHBW_RV_ITS_Zugangsdatenuebersicht_RV.pdf)
- [DHBW Karlsruhe – DUALIS WebClient](https://www.karlsruhe.dhbw.de/it-service/dualis-webclient-fuer-studierende.html)
- [DHBW Mannheim – IT-Zugänge und Maildomain](https://www.mannheim.dhbw.de/service/itservice-center/internet)
- [DHBW Mosbach – Dienste, Webmail und DUALIS](https://www.mosbach.dhbw.de/mosbach/it-service/dienste-systeme)
- [DHBW Villingen-Schwenningen – Mail und DUALIS](https://www.dhbw-vs.de/studierende/serviceeinrichtungen/it-service-center/its-dienste.html)
- [DHBW Heidenheim – OWA für Studierende](https://www.heidenheim.dhbw.de/service-einrichtungen/it-service-center)
- [DHBW Heilbronn – IT Service und Webmail](https://www.heilbronn.dhbw.de/service/it-service-support/)
- [DHBW Lörrach – Webmail-Zugang](https://dhbw-loerrach.de/homepage)
- [DHBW CAS – Webmail-Anleitung](https://www.cas.dhbw.de/fileadmin/user_upload/Einrichtungen/IT/CAS_Webmailclient-Studierende.pdf)
- [DHBW Stuttgart Campus Horb – Webmail](https://www.hb.dhbw-stuttgart.de/)
