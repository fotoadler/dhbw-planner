import { useEffect, useState } from 'react';
import { closeEmbeddedMail, isEmbeddedMailAvailable, openEmbeddedMail } from '../mail/embedded';
import { mailProviderForSite } from '../mail/providers';

interface Props {
  site: string;
}

export function MailView({ site }: Props) {
  const provider = mailProviderForSite(site);
  const nativeMailView = isEmbeddedMailAvailable();
  const [nativeOpenFailed, setNativeOpenFailed] = useState(false);

  useEffect(() => {
    if (!provider || !nativeMailView) return;

    setNativeOpenFailed(false);
    void openEmbeddedMail(provider.webmailUrl).catch(() => {
      setNativeOpenFailed(true);
    });

    return () => {
      void closeEmbeddedMail();
    }
  }, [nativeMailView, provider?.webmailUrl]);

  if (!provider) {
    return (
      <main className="mailview dayview">
        <div className="mailview__empty">
          <h2>Uni-Mail</h2>
          <p>Für diesen DHBW-Standort ist noch kein Mail-Provider hinterlegt.</p>
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
      {nativeOpenFailed && (
        <p className="setup__error" role="alert">
          Die eingebettete Mail-Ansicht konnte nicht geöffnet werden. Bitte öffne die Mail einmal manuell.
        </p>
      )}
    </main>
  );
}
