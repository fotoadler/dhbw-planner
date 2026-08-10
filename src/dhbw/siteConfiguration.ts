/**
 * Standortbezogene Integrationen der DHBW.
 *
 * DUALIS selbst ist zentral erreichbar, die Identität davor aber nicht:
 * Standorte verwenden unterschiedliche Mail-/Account-Domains und teilweise
 * unterschiedliche Mailplattformen. Neue Standorte werden deshalb hier als
 * Datenprofil ergänzt, ohne DualisClient, App-Shell oder das native Mail-
 * Plugin anzupassen.
 */

import { PROJECT_REPOSITORY_URL } from '../lib/projectLinks';

export type DualisUsernameMode = 'email-domain' | 'full-email';
export type MailPlatform = 'owa' | 'roundcube' | 'modoboa' | 'webmail';

export interface DualisSiteConfig {
  /** Ob ein kurzer Accountname sicher um eine bekannte Domain ergänzt werden kann. */
  usernameMode: DualisUsernameMode;
  /** Nur bei usernameMode=email-domain gesetzt. */
  emailDomain?: string;
  /** Sichtbarer Hinweis im Loginformular. */
  usernameHint: string;
  /** Text, der die Regel für Nutzer erklärt. */
  description: string;
}

export interface SiteMailConfig {
  site: string;
  label: string;
  platform: MailPlatform;
  webmailUrl: string;
  /** Optionaler, verifizierter Alias für Migrationen oder temporäre Ausfälle. */
  fallbackUrls?: string[];
  usernameHint: string;
}

export interface DhbwSiteConfiguration {
  site: string;
  label: string;
  dualis: DualisSiteConfig;
  mail: SiteMailConfig | null;
  /** Kurze, standortspezifische Hilfe, wenn kein Webmail-Login existiert. */
  mailUnavailableTitle?: string;
  /** Erklärt einen bewusst nicht angebotenen Mail-Login in der UI. */
  mailUnavailableReason?: string;
  /** Beschreibt, wo die Nachrichten stattdessen gelesen oder verwaltet werden. */
  mailUnavailableInstructions?: string;
  /**
   * Optionaler Kontakt für standortspezifische Fragen zum Mailzugang.
   *
   * Ziel und Beschriftung stehen bewusst in einem Objekt: Als getrennte
   * optionale Felder könnte eine Beschriftung an einem fremden Ziel landen —
   * etwa „Webmail-Link mitteilen" über dem generischen Feedback-Formular oder
   * „Informationen senden" über einem standortspezifischen IT-Service-Link.
   * Ohne `href` beschriftet `label` den Feedback-Fallback.
   */
  mailSupport?: SiteMailAction;
  /** Optionaler Open-Source-Beitrag zur Ergänzung des Mailzugangs. */
  mailContribution?: SiteMailLink;
}

/** Aktion der Mailhilfe ohne eigenes Ziel: beschriftet dann den Feedback-Fallback. */
export interface SiteMailAction {
  href?: string;
  label: string;
}

/** Aktion der Mailhilfe mit eigenem Ziel; ohne href gäbe es nichts zu öffnen. */
export interface SiteMailLink {
  href: string;
  label: string;
}

const RAVENSBURG_DUALIS: DualisSiteConfig = {
  usernameMode: 'email-domain',
  emailDomain: 'stud.dhbw-ravensburg.de',
  usernameHint: 'Kürzel oder vollständige DHBW-Adresse',
  description: 'Kürzel genügt; die Ravensburger Domain wird automatisch ergänzt.',
};

const FULL_EMAIL_DUALIS: DualisSiteConfig = {
  usernameMode: 'full-email',
  usernameHint: 'Vollständige DHBW-E-Mail-Adresse',
  description: 'Vollständige DHBW-E-Mail-Adresse eingeben.',
};

export const SITE_CONFIGURATIONS: Readonly<Record<string, DhbwSiteConfiguration>> = {
  RV: {
    site: 'RV',
    label: 'DHBW Ravensburg',
    dualis: RAVENSBURG_DUALIS,
    mail: {
      site: 'RV',
      label: 'DHBW Ravensburg',
      platform: 'owa',
      webmailUrl: 'https://webmail1.dhbw-ravensburg.de/owa/',
      fallbackUrls: ['https://webmail.dhbw-ravensburg.de/owa/'],
      usernameHint: 'DOMAB\\Benutzername',
    },
  },
  // Friedrichshafen uses more than one Ravensburg account domain (for
  // example @it.dhbw-ravensburg.de and @mb.dhbw-ravensburg.de). The course
  // selection alone cannot distinguish those accounts, so we require the
  // complete address instead of guessing.
  FN: {
    site: 'FN',
    label: 'DHBW Friedrichshafen',
    dualis: {
      ...FULL_EMAIL_DUALIS,
      description: 'Vollständige Adresse eingeben; je nach Bereich gilt eine andere Domain.',
    },
    mail: {
      site: 'FN',
      label: 'DHBW Friedrichshafen',
      platform: 'owa',
      webmailUrl: 'https://webmail1.dhbw-ravensburg.de/owa/',
      fallbackUrls: ['https://webmail.dhbw-ravensburg.de/owa/'],
      usernameHint: 'Vollständige Adresse oder Accountdaten des Campus',
    },
  },
  STG: {
    site: 'STG',
    label: 'DHBW Stuttgart',
    dualis: {
      usernameMode: 'email-domain',
      emailDomain: 'lehre.dhbw-stuttgart.de',
      usernameHint: 'UserID oder vollständige DHBW-Adresse',
      description: 'UserID genügt; @lehre.dhbw-stuttgart.de wird ergänzt.',
    },
    mail: {
      site: 'STG',
      label: 'DHBW Stuttgart',
      platform: 'roundcube',
      webmailUrl: 'https://lehre-webmail.dhbw-stuttgart.de/roundcubemail/',
      usernameHint: 'UserID oder DHBW-Lehre-Adresse',
    },
  },
  HORB: {
    site: 'HORB',
    label: 'DHBW Campus Horb',
    dualis: {
      usernameMode: 'email-domain',
      emailDomain: 'hb.dhbw-stuttgart.de',
      usernameHint: 'UserID oder vollständige DHBW-Adresse',
      description: 'UserID genügt; @hb.dhbw-stuttgart.de wird ergänzt.',
    },
    mail: {
      site: 'HORB',
      label: 'DHBW Campus Horb',
      platform: 'webmail',
      webmailUrl: 'https://mail.hb.dhbw-stuttgart.de/',
      usernameHint: 'DHBW-Lehre-Adresse oder Accountdaten',
    },
  },
  KA: {
    site: 'KA',
    label: 'DHBW Karlsruhe',
    dualis: {
      usernameMode: 'email-domain',
      emailDomain: 'dh-karlsruhe.de',
      usernameHint: 'Benutzerkennung oder vollständige DHBW-Adresse',
      description: 'Benutzerkennung genügt; @dh-karlsruhe.de wird ergänzt.',
    },
    // Für Karlsruhe ist noch kein verlässlicher studentischer Webmail-Einstieg
    // bekannt. Der Tab bleibt als standortspezifischer Mitmach-Einstieg sichtbar,
    // ohne eine unbestätigte Anmeldeseite auszuliefern.
    mail: null,
    mailUnavailableTitle: 'Mailzugang für Karlsruhe gesucht',
    mailUnavailableReason:
      'Für Karlsruhe ist eine Weiterleitungsadresse dokumentiert, aber kein bestätigter Webmail-Login. Wenn du dort studierst und ein Postfach mit eigenem Weblogin nutzt, teile uns bitte den Link mit.',
    mailUnavailableInstructions:
      'Du kennst dich mit Code aus? Dann kannst du den Zugang auch direkt im Open-Source-Projekt auf GitHub ergänzen.',
    mailSupport: { label: 'Webmail-Link mitteilen' },
    mailContribution: { href: PROJECT_REPOSITORY_URL, label: 'Auf GitHub beitragen' },
  },
  MA: {
    site: 'MA',
    label: 'DHBW Mannheim',
    dualis: {
      usernameMode: 'email-domain',
      emailDomain: 'student.dhbw-mannheim.de',
      usernameHint: 'Benutzername oder vollständige DHBW-Adresse',
      description: 'Benutzername genügt; @student.dhbw-mannheim.de wird ergänzt.',
    },
    mail: {
      site: 'MA',
      label: 'DHBW Mannheim',
      platform: 'webmail',
      webmailUrl: 'https://studgate.dhbw-mannheim.de/',
      usernameHint: 'Benutzername oder DHBW-Adresse',
    },
  },
  MOS: {
    site: 'MOS',
    label: 'DHBW Mosbach',
    dualis: {
      usernameMode: 'email-domain',
      emailDomain: 'lehre.mosbach.dhbw.de',
      usernameHint: 'UserID oder vollständige DHBW-Adresse',
      description: 'UserID genügt; @lehre.mosbach.dhbw.de wird ergänzt.',
    },
    mail: {
      site: 'MOS',
      label: 'DHBW Mosbach',
      platform: 'webmail',
      webmailUrl: 'https://webmail.lehre.mosbach.dhbw.de/',
      usernameHint: 'UserID oder DHBW-Adresse',
    },
  },
  MGH: {
    site: 'MGH',
    label: 'DHBW Campus Bad Mergentheim',
    dualis: {
      usernameMode: 'email-domain',
      emailDomain: 'lehre.mosbach.dhbw.de',
      usernameHint: 'UserID oder vollständige DHBW-Adresse',
      description: 'UserID genügt; der Mosbacher Accountbereich wird verwendet.',
    },
    mail: {
      site: 'MGH',
      label: 'DHBW Campus Bad Mergentheim',
      platform: 'webmail',
      webmailUrl: 'https://webmail.lehre.mosbach.dhbw.de/',
      usernameHint: 'UserID oder DHBW-Adresse',
    },
  },
  VS: {
    site: 'VS',
    label: 'DHBW Villingen-Schwenningen',
    dualis: {
      usernameMode: 'email-domain',
      emailDomain: 'dhbw-vs.de',
      usernameHint: 'DHBW-UserID oder vollständige DHBW-Adresse',
      description: 'UserID genügt; @dhbw-vs.de wird ergänzt.',
    },
    mail: {
      site: 'VS',
      label: 'DHBW Villingen-Schwenningen',
      platform: 'modoboa',
      webmailUrl: 'https://modoboa.dhbw-vs.de/',
      usernameHint: 'DHBW-UserID oder DHBW-Adresse',
    },
  },
  HDH: {
    site: 'HDH',
    label: 'DHBW Heidenheim',
    dualis: {
      ...FULL_EMAIL_DUALIS,
      description: 'Vollständige Adresse aus den Accountdaten eingeben.',
    },
    mail: {
      site: 'HDH',
      label: 'DHBW Heidenheim',
      platform: 'owa',
      webmailUrl: 'https://outlook.office.com/',
      usernameHint: 'DHBW-Adresse oder Microsoft-Account',
    },
  },
  HN: {
    site: 'HN',
    label: 'DHBW Heilbronn',
    dualis: FULL_EMAIL_DUALIS,
    mail: {
      site: 'HN',
      label: 'DHBW Heilbronn',
      platform: 'webmail',
      webmailUrl: 'https://webmail.dhbw.de/',
      usernameHint: 'Vollständige DHBW-Adresse',
    },
  },
  LÖR: {
    site: 'LÖR',
    label: 'DHBW Lörrach',
    dualis: FULL_EMAIL_DUALIS,
    mail: {
      site: 'LÖR',
      label: 'DHBW Lörrach',
      platform: 'webmail',
      webmailUrl: 'https://webmail.dhbw-loerrach.de/',
      usernameHint: 'Vollständige DHBW-Adresse',
    },
  },
  CAS: {
    site: 'CAS',
    label: 'DHBW Center for Advanced Studies',
    dualis: FULL_EMAIL_DUALIS,
    mail: {
      site: 'CAS',
      label: 'DHBW CAS',
      platform: 'webmail',
      webmailUrl: 'https://webmail.dhbw.de/',
      usernameHint: 'DHBW-CAS-Adresse',
    },
  },
};

const FALLBACK_CONFIGURATION: DhbwSiteConfiguration = {
  site: '',
  label: 'DHBW-Standort',
  dualis: FULL_EMAIL_DUALIS,
  mail: null,
};

export function normalizeSiteCode(site: string | undefined): string {
  return site?.trim().toUpperCase() ?? '';
}

export function siteConfigurationFor(site: string | undefined): DhbwSiteConfiguration {
  return SITE_CONFIGURATIONS[normalizeSiteCode(site)] ?? FALLBACK_CONFIGURATION;
}

export function dualisUsernameFor(username: string, site: string | undefined = 'RV'): string {
  const value = username.trim();
  const dualis = siteConfigurationFor(site).dualis;
  if (!value || value.includes('@') || dualis.usernameMode !== 'email-domain' || !dualis.emailDomain) return value;
  return `${value}@${dualis.emailDomain}`;
}

export function configuredSiteCodes(): string[] {
  return Object.keys(SITE_CONFIGURATIONS);
}
