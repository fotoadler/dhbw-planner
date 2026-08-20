import SwiftUI

@main
struct DHBWPlannerWatchApp: App {
    @StateObject private var store = WatchSyncStore.shared

    var body: some Scene {
        WindowGroup {
            ContentView(store: store)
        }
    }
}
