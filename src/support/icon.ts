import { Capacitor, registerPlugin } from '@capacitor/core';

const SupporterIcon = registerPlugin<{
  getIcon(): Promise<{ gold: boolean; available: boolean }>;
  setIcon(options: { gold: boolean }): Promise<void>;
}>('SupporterIcon');

export async function getSupporterIcon() {
  return Capacitor.isNativePlatform() ? SupporterIcon.getIcon() : { gold: false, available: false };
}
export async function setSupporterIcon(gold: boolean) {
  if (!Capacitor.isNativePlatform()) throw new Error('App-Symbole lassen sich nur in der installierten App ändern.');
  await SupporterIcon.setIcon({ gold });
}
