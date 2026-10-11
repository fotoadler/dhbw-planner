import { useEffect, useState } from 'react';
import { App } from '@capacitor/app';

/** Refresh Berlin-based calendar dates and the now marker after midnight/resume. */
export function useCurrentTime(enabled = true): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!enabled) return;
    const refresh = () => setNow(new Date());
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    const timer = window.setInterval(refresh, 30_000);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    const resume = App.addListener('resume', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      void resume.then(listener => listener.remove());
    };
  }, [enabled]);
  return now;
}
