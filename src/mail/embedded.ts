import { Capacitor } from '@capacitor/core';
import { EmbeddedMail } from '@dhbw/capacitor-embedded-mail';

export function isEmbeddedMailAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export function openEmbeddedMail(url: string): Promise<void> {
  return EmbeddedMail.open({ url, bottomInset: 58 });
}

export function closeEmbeddedMail(): Promise<void> {
  return isEmbeddedMailAvailable() ? EmbeddedMail.close() : Promise.resolve();
}
