import Capacitor
import OSLog
import WatchConnectivity

private final class WatchSyncSessionDelegate: NSObject, WCSessionDelegate {
    static let shared = WatchSyncSessionDelegate()

    private let logger = Logger(subsystem: "de.dhbw.raplaplan", category: "WatchSync")
    private var pendingSnapshot: String?

    func activate() {
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
    }

    func queue(snapshot: String) {
        pendingSnapshot = snapshot
        sendIfPossible()
    }

    var isWatchInstalled: Bool {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
            return false
        }
        return WCSession.default.isWatchAppInstalled
    }

    private func sendIfPossible() {
        guard
            WCSession.isSupported(),
            WCSession.default.activationState == .activated,
            let snapshot = pendingSnapshot
        else { return }

        let payload: [String: Any] = [
                "snapshot": snapshot,
                "updatedAt": Date().timeIntervalSince1970 * 1000,
        ]

        do {
            try WCSession.default.updateApplicationContext(payload)
            if WCSession.default.isReachable {
                WCSession.default.sendMessage(
                    payload,
                    replyHandler: nil,
                    errorHandler: { [logger] error in
                        logger.error("Direct message failed: \(error.localizedDescription, privacy: .public)")
                    }
                )
            }
            pendingSnapshot = nil
        } catch {
            logger.error("Application context failed: \(error.localizedDescription, privacy: .public)")
        }
    }

    func session(
        _ session: WCSession,
        activationDidCompleteWith activationState: WCSessionActivationState,
        error: Error?
    ) {
        sendIfPossible()
    }

    #if os(iOS)
    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()
    }
    #endif
}

@objc(WatchSyncPlugin)
public class WatchSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WatchSyncPlugin"
    public let jsName = "WatchSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
    ]

    override public func load() {
        WatchSyncSessionDelegate.shared.activate()
    }

    @objc func isAvailable(_ call: CAPPluginCall) {
        guard WCSession.isSupported() else {
            call.resolve([
                "available": false,
                "platform": "ios",
                "watchInstalled": false,
                "reason": "WatchConnectivity is unavailable on this device.",
            ])
            return
        }

        call.resolve([
            "available": true,
            "platform": "ios",
            "watchInstalled": WatchSyncSessionDelegate.shared.isWatchInstalled,
        ])
    }

    @objc func sync(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot"), !snapshot.isEmpty else {
            call.reject("Missing snapshot")
            return
        }

        guard WCSession.isSupported() else {
            call.resolve(["queued": false])
            return
        }

        WatchSyncSessionDelegate.shared.queue(snapshot: snapshot)
        call.resolve([
            "queued": true,
            "watchInstalled": WatchSyncSessionDelegate.shared.isWatchInstalled,
        ])
    }
}
