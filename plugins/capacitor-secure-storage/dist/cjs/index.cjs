const core = require('@capacitor/core');

const SecureStorage = core.registerPlugin('SecureStorage', {
  web: () => Promise.resolve({
    SecureStorageWeb: class SecureStorageWeb extends core.WebPlugin {
      async set() {
        throw new Error('SecureStorage is only available in the native app.');
      }

      async get() {
        throw new Error('SecureStorage is only available in the native app.');
      }

      async remove() {
        throw new Error('SecureStorage is only available in the native app.');
      }
    },
  }).then((m) => new m.SecureStorageWeb()),
});

module.exports = { SecureStorage };
