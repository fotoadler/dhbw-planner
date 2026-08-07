import { useEffect, useMemo, useState } from 'react';
import { closeEmbeddedMail, isEmbeddedMailAvailable, openEmbeddedMail } from '../mail/embedded';
import { mailProviderForSite } from '../mail/providers';
import { siteConfigurationFor } from '../dhbw/siteConfiguration';

interface Props {
  site: string;
}

export function MailView({ site }: Props) {
  const siteConfig = siteConfigurationFor(site);
  const provider = mailProviderForSite(site);
  const feedbackHref = `mailto:christian@fotoadler.com?subject=${encodeURIComponent(
    'DHBW Planner – Mailzugang',
  )}&body=${encodeURIComponent(
    `Standort: ${siteConfig.label}${siteConfig.site ? ` (${siteConfig.site})` : ''}\n\nMailprovider oder Anmeldeseite:\n`,
  )}`;
  const nativeMailView = isEmbeddedMailAvailable();
  const [nativeOpenFailed, setNativeOpenFailed] = useState(false);
  const webmailUrls = useMemo(
    () => (provider ? [provider.webmailUrl, ...(provider.fallbackUrls ?? [])] : []),
    [provider?.fallbackUrls, provider?.webmailUrl],
  );

  useEffect(() => {
    if (!provider || !nativeMailView) return;

    setNativeOpenFailed(false);
    let cancelled = false;

    const openFirstAvailable = async (index: number): Promise<void> => {
      if (cancelled || index >= webmailUrls.length) {
        if (!cancelled) setNativeOpenFailed(true);
        return;
      }
      try {
        await openEmbeddedMail(webmailUrls[index]);
      } catch {
        await openFirstAvailable(index + 1);
      }
    };

    void openFirstAvailable(0);

    return () => {
      cancelled = true;
      void closeEmbeddedMail();
    };
  }, [nativeMailView, provider?.fallbackUrls, provider?.webmailUrl, webmailUrls]);

  if (!provider) {
    return (
      <main className="mailview dayview">
        <div className="mailview__empty">
          <h2>Uni-Mail</h2>
          <p>Diese Funktion ist für deinen Standort noch nicht verfügbar.</p>
          <p>Falls du zur Bereitstellung beitragen möchtest, freuen wir uns über Details zum Mailprovider o. Ä.</p>
          {siteConfig.mailUnavailableReason && <p className="mailview__note">{siteConfig.mailUnavailableReason}</p>}
          <a className="setup__button mailview__open" href={feedbackHref}>
            Informationen senden <span aria-hidden="true">✉</span>
          </a>
        </div>
      </main>
    );
  }

  if (nativeMailView && !nativeOpenFailed) {
    return (
      <main className="mailview mailview--launch dayview">
        <p>Mail wird geöffnet …</p>
      </main>
    );
  }

  return (
    <main className="mailview mailview--fallback dayview">
      <p className="mailview__fallbacktext">Uni-Mail</p>
      <a className="setup__button mailview__open" href={provider.webmailUrl} target="_blank" rel="noreferrer">
        Mail öffnen <span aria-hidden="true">↗</span>
      </a>
      {provider.fallbackUrls?.map((url) => (
        <a key={url} className="mailview__fallbacklink" href={url} target="_blank" rel="noreferrer">
          Alternativen Mailzugang öffnen <span aria-hidden="true">↗</span>
        </a>
      ))}
      {nativeOpenFailed && (
        <p className="setup__error" role="alert">
          Die eingebettete Mail-Ansicht konnte nicht geöffnet werden. Bitte öffne die Mail einmal manuell.
        </p>
      )}
    </main>
  );
}
