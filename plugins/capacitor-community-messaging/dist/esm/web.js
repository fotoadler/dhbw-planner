import { WebPlugin } from '@capacitor/core';

export class CommunityMessagingWeb extends WebPlugin {
  async checkPermission() {
    return { receive: 'unsupported' };
  }

  async requestPermission() {
    return { receive: 'unsupported' };
  }

  async register() {
    throw this.unavailable('Community messaging is only available in native builds.');
  }

  async getToken() {
    return { token: null };
  }

  async deleteToken() {}

  async getInitialNotification() {
    return { notification: null };
  }
}
