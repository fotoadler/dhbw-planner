# @dhbw/capacitor-watch-sync

Thin native bridge for the watch schedule snapshot.

- iOS: sends the latest snapshot through `WatchConnectivity`.
- Android: publishes the latest snapshot through the Wear OS Data Layer.
- Web: no-op fallback.

The bridge intentionally transports only already-projected schedule data. It
does not receive or store Rapla credentials, Dualis cookies, mail sessions or
the main Preferences cache.
