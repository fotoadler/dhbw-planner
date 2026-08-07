import { WebPlugin } from '@capacitor/core';

export class SecureStorageWeb extends WebPlugin {
  async set() {
    throw new Error('SecureStorage is only available in the native app.');
  }

  async get() {
    throw new Error('SecureStorage is only available in the native app.');
  }

  async remove() {
    throw new Error('SecureStorage is only available in the native app.');
  }
}
