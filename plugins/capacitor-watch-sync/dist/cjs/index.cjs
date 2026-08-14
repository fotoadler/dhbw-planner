"use strict";
var core = require('@capacitor/core');
const WatchSync = core.registerPlugin('WatchSync', {
    web: () => Promise.resolve().then(() => require('./web.cjs')).then((module) => new module.WatchSyncWeb()),
});
exports.WatchSync = WatchSync;
