'use strict';

const core = require('@capacitor/core');

class CommunityMessagingWeb extends core.WebPlugin {
  async checkPermission() { return { receive: 'unsupported' }; }
  async requestPermission() { return { receive: 'unsupported' }; }
  async register() { throw this.unavailable('Community messaging is only available in native builds.'); }
  async getToken() { return { token: null }; }
  async deleteToken() {}
  async getInitialNotification() { return { notification: null }; }
}

const CommunityMessaging = core.registerPlugin('CommunityMessaging', {
  web: () => Promise.resolve(new CommunityMessagingWeb()),
});

exports.CommunityMessaging = CommunityMessaging;
