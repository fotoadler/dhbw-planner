# @dhbw/capacitor-course-live-activity

Reusable Capacitor bridge for showing the currently running course as native live UI.

## API

```ts
import { CourseLiveActivity } from '@dhbw/capacitor-course-live-activity';

await CourseLiveActivity.start({
  id: 'stable-course-id',
  title: 'Personalwirtschaft',
  room: 'WS17-0.13',
  lecturer: 'Max Mustermann',
  startTime: Date.now(),
  endTime: Date.now() + 90 * 60_000,
  nextTitle: 'Geld und Waehrung',
  nextStartTime: Date.now() + 120 * 60_000,
});
```

## Platform behavior

- iOS: uses ActivityKit. The host app still needs a Widget Extension that renders the same `CourseLectureAttributes` shape.
- Android: posts one silent ongoing notification with countdown/progress. On Android versions that support promoted ongoing notifications, it requests Live Update promotion with `android.requestPromotedOngoing`.
- Web: no-op fallback.

The module intentionally has no knowledge of Rapla or DHBW. Host apps pass the current activity payload and decide when to start/end it.
