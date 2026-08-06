import { WebPlugin } from '@capacitor/core';

export class EmbeddedMailWeb extends WebPlugin {
  async open() {
    throw new Error('EmbeddedMail is only available in the native app.');
  }

  async close() {}
}
