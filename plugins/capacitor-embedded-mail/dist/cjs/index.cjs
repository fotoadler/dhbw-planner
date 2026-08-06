const core = require('@capacitor/core');

const EmbeddedMail = core.registerPlugin('EmbeddedMail', {
  web: () => Promise.resolve({
    EmbeddedMailWeb: class EmbeddedMailWeb extends core.WebPlugin {
      async open() {
        throw new Error('EmbeddedMail is only available in the native app.');
      }

      async close() {}
    },
  }).then((m) => new m.EmbeddedMailWeb()),
});

module.exports = { EmbeddedMail };
