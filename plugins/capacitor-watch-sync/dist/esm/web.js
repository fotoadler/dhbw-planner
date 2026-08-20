import { WebPlugin } from '@capacitor/core';
export class WatchSyncWeb extends WebPlugin {
    async isAvailable() {
        return { available: false, platform: 'web', reason: 'Watch synchronization requires a native app.' };
    }
    async sync() {
        return { queued: false };
    }
}
