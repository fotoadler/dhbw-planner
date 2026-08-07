# Community Messaging Plugin

Native Capacitor bridge used by DHBW Planner for Firebase Cloud Messaging on Android and iOS.

The plugin deliberately does not contain feed, subscription, analytics, or local-reminder logic. It exposes one cross-platform contract for notification permission, FCM token lifecycle, notification receipt, tap handling, and cold-start delivery.

## Required production configuration

- Android: add the Firebase `google-services.json` to `android/app/`.
- iOS: add `GoogleService-Info.plist` to the App target and enable the Push Notifications capability.
- Upload the APNs authentication key to Firebase for the iOS app.
- Keep `FirebaseMessagingAutoInitEnabled` disabled until the user has completed the notification/community consent flow.

Without the Firebase project files the native projects still compile. Calls that require FCM reject with a clear configuration error.

## API

```ts
CommunityMessaging.checkPermission();
CommunityMessaging.requestPermission();
CommunityMessaging.register();
CommunityMessaging.getToken();
CommunityMessaging.deleteToken();
CommunityMessaging.getInitialNotification();

CommunityMessaging.addListener('tokenReceived', listener);
CommunityMessaging.addListener('notificationReceived', listener);
CommunityMessaging.addListener('notificationActionPerformed', listener);
```

`register()` enables Firebase Messaging auto-initialization. `deleteToken()` removes the FCM token, disables auto-initialization, and unregisters remote notifications on iOS.
