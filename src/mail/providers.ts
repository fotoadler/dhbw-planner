/**
 * Mail-Provider werden bewusst vom Stundenplan-Standort getrennt gehalten.
 * Dadurch bleibt die spätere Erweiterung um weitere DHBW-Mail-Systeme lokal
 * und die Ravensburger OWA-Konfiguration landet nicht in der App-Wurzel.
 */

export interface MailProvider {
  site: string;
  label: string;
  webmailUrl: string;
  emailDomain: string;
  usernameHint: string;
}

export const RAVENSBURG_MAIL_PROVIDER: MailProvider = {
  site: 'RV',
  label: 'DHBW Ravensburg',
  webmailUrl: 'https://webmail.dhbw-ravensburg.de/owa/',
  emailDomain: 'stud.dhbw-ravensburg.de',
  usernameHint: 'DOMAB\\Benutzername',
};

/**
 * Zentrale Provider-Registry. Für einen weiteren Standort wird hier nur ein
 * weiterer Provider ergänzt; App-Shell und native WebView bleiben unverändert.
 */
export const MAIL_PROVIDERS: Readonly<Record<string, MailProvider>> = {
  [RAVENSBURG_MAIL_PROVIDER.site]: RAVENSBURG_MAIL_PROVIDER,
};

export function mailProviderForSite(site: string | undefined): MailProvider | null {
  return site ? MAIL_PROVIDERS[site] ?? null : null;
}
