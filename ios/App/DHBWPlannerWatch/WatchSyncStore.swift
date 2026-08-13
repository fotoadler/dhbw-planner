import Foundation
import WatchConnectivity

@MainActor
final class WatchSyncStore: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSyncStore()

    @Published private(set) var snapshot: WatchScheduleSnapshot?

    private let defaults = UserDefaults(suiteName: "group.de.dhbw.raplaplan") ?? .standard
    private let snapshotKey = "watch.schedule.snapshot"

    private override init() {
        super.init()
        restore()
        activateSession()
    }

    private func activateSession() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    private func restore() {
        guard let data = defaults.data(forKey: snapshotKey) else { return }
        snapshot = try? JSONDecoder().decode(WatchScheduleSnapshot.self, from: data)
    }

    private func apply(context: [String: Any]) {
        guard let raw = context["snapshot"] as? String, let data = raw.data(using: .utf8) else { return }
        guard let next = try? JSONDecoder().decode(WatchScheduleSnapshot.self, from: data) else { return }
        snapshot = next
        defaults.set(data, forKey: snapshotKey)
    }

    nonisolated func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {}

    nonisolated func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in
            apply(context: applicationContext)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        Task { @MainActor in
            apply(context: message)
        }
    }

    nonisolated func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        Task { @MainActor in
            apply(context: userInfo)
        }
    }
}
