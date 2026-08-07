import { registerPlugin } from '@capacitor/core';

export const CommunityMessaging = registerPlugin('CommunityMessaging', {
  web: () => import('./web.js').then((module) => new module.CommunityMessagingWeb()),
});
