import { registerPlugin } from '@capacitor/core';

export const CourseLiveActivity = registerPlugin('CourseLiveActivity', {
  web: () => import('./web.js').then((m) => new m.CourseLiveActivityWeb()),
});
