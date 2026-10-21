import { useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import type { WidgetSnapshot } from './snapshot';
import { parseWidgetLink } from './snapshot';
const ScheduleWidgets = registerPlugin<{ update(options: { snapshot: string }): Promise<void> }>('ScheduleWidgets');
let writes: Promise<void> = Promise.resolve();
export function useWidgets(snapshot: WidgetSnapshot | null, onOpen: (link: NonNullable<ReturnType<typeof parseWidgetLink>>) => void) {
  const open = useRef(onOpen); open.current = onOpen;
  const pendingLink = useRef<string | null>(null);
  const ready = useRef(snapshot !== null); ready.current = snapshot !== null;
  const serialized = snapshot === null ? null : JSON.stringify(snapshot);
  useEffect(() => {
    if (!Capacitor.isNativePlatform() || serialized === null) return;
    // Ordered writes prevent an older course/filter snapshot from arriving last.
    writes = writes.catch(() => undefined).then(() => ScheduleWidgets.update({ snapshot: serialized }));
    void writes.catch(() => undefined);
    if (pendingLink.current) {
      const parsed = parseWidgetLink(pendingLink.current); pendingLink.current = null;
      if (parsed) open.current(parsed);
    }
  }, [serialized]);
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let active = true;
    const receive = (url: string) => {
      if (!active || !parseWidgetLink(url)) return;
      if (!ready.current) pendingLink.current = url;
      else open.current(parseWidgetLink(url)!);
    };
    const listener = CapApp.addListener('appUrlOpen', ({ url }) => receive(url));
    void CapApp.getLaunchUrl().then(result => { if (result) receive(result.url); }).catch(() => undefined);
    return () => { active = false; void listener.then(handle => handle.remove()); };
  }, []);
}
