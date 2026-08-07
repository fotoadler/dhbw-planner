/**
 * Abwärtskompatibler Mail-Adapter über die zentrale Standortkonfiguration.
 * Neue Standortdaten werden ausschließlich in ../dhbw/siteConfiguration.ts
 * ergänzt; UI und natives Mail-Plugin bleiben unverändert.
 */

import { configuredSiteCodes, SiteMailConfig, siteConfigurationFor } from '../dhbw/siteConfiguration';

export type MailProvider = SiteMailConfig;

export const RAVENSBURG_MAIL_PROVIDER: MailProvider = siteConfigurationFor('RV').mail!;

export const MAIL_PROVIDERS: Readonly<Record<string, MailProvider>> = Object.freeze(
  Object.fromEntries(
    configuredSiteCodes()
      .map((site) => [site, siteConfigurationFor(site).mail])
      .filter((entry): entry is [string, MailProvider] => entry[1] !== null),
  ),
);

export function mailProviderForSite(site: string | undefined): MailProvider | null {
  return siteConfigurationFor(site).mail;
}
