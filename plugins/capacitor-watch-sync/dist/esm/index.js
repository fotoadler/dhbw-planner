import { registerPlugin } from '@capacitor/core';
export const WatchSync = registerPlugin('WatchSync', {
    web: () => import('./web.js').then((module) => new module.WatchSyncWeb()),
});
