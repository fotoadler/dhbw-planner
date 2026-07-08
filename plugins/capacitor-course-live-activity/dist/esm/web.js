import { WebPlugin } from '@capacitor/core';

export class CourseLiveActivityWeb extends WebPlugin {
  async isAvailable() {
    return { available: false, platform: 'web', reason: 'Native live activities are not available on web.' };
  }

  async start() {}

  async update() {}

  async end() {}

  async endAll() {}
}
