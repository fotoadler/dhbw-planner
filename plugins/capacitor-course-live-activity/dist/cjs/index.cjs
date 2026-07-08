const core = require('@capacitor/core');

const CourseLiveActivity = core.registerPlugin('CourseLiveActivity', {
  web: () => Promise.resolve({
    CourseLiveActivityWeb: class CourseLiveActivityWeb extends core.WebPlugin {
      async isAvailable() {
        return { available: false, platform: 'web', reason: 'Native live activities are not available on web.' };
      }
      async start() {}
      async update() {}
      async end() {}
      async endAll() {}
    },
  }).then((m) => new m.CourseLiveActivityWeb()),
});

module.exports = { CourseLiveActivity };
