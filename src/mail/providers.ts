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

export function mailProviderForSite(site: string | undefined): MailProvider | null {
  return site === RAVENSBURG_MAIL_PROVIDER.site ? RAVENSBURG_MAIL_PROVIDER : null;
}
