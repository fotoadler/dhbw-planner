"use strict";
const core = require('@capacitor/core');
class WatchSyncWeb extends core.WebPlugin {
    async isAvailable() {
        return { available: false, platform: 'web', reason: 'Watch synchronization requires a native app.' };
    }
    async sync() {
        return { queued: false };
    }
}
exports.WatchSyncWeb = WatchSyncWeb;
