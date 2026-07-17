/**
 * Erststart: ein einziges Eingabefeld für den Rapla-Link. Kein Wizard,
 * keine Erklär-Screens — Link einfügen, fertig.
 */

import { useState } from 'react';
import { parseRaplaLink, RaplaConfig } from '../rapla/client';

interface Props {
  initialLink?: string;
  onSave: (link: string, config: RaplaConfig) => void;
}

export function LinkSetup({ initialLink = '', onSave }: Props) {
  const [link, setLink] = useState(initialLink);
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const config = parseRaplaLink(link);
    if (!config) {
      setError('Der Link muss die Parameter „user“ und „file“ enthalten — bitte den kompletten Rapla-Link einfügen.');
      return;
    }
    setError(null);
    onSave(link.trim(), config);
  };

  return (
    <div className="setup">
      <h1 className="setup__title">DHBW Plan</h1>
      <p className="setup__hint">Füge deinen Rapla-Link ein, um deinen Stundenplan zu sehen.</p>
      <input
        className="setup__input"
        type="url"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="https://rapla.dhbw.de/rapla/calendar?user=…&file=…"
        value={link}
        onChange={(e) => {
          setLink(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />
      {error && <p className="setup__error">{error}</p>}

      <button className="setup__button" onClick={submit} disabled={!link.trim()}>
        Stundenplan laden
      </button>
    </div>
  );
}
