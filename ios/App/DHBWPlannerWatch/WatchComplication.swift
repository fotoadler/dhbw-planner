import SwiftUI
import WidgetKit

private let watchSnapshotKey = "watch.schedule.snapshot"
private let watchAppGroup = "group.de.dhbw.raplaplan"

struct WatchComplicationEntry: TimelineEntry {
    let date: Date
    let snapshot: WatchScheduleSnapshot?
}

struct WatchComplicationProvider: TimelineProvider {
    func placeholder(in context: Context) -> WatchComplicationEntry {
        WatchComplicationEntry(date: Date(), snapshot: nil)
    }

    func getSnapshot(in context: Context, completion: @escaping (WatchComplicationEntry) -> Void) {
        completion(WatchComplicationEntry(date: Date(), snapshot: loadSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WatchComplicationEntry>) -> Void) {
        let snapshot = loadSnapshot()
        let nextRefresh = snapshot?.currentEntry?.endDate
            ?? snapshot?.nextEntry?.startDate
            ?? Date().addingTimeInterval(15 * 60)
        let entry = WatchComplicationEntry(date: Date(), snapshot: snapshot)
        completion(Timeline(entries: [entry], policy: .after(nextRefresh)))
    }

    private func loadSnapshot() -> WatchScheduleSnapshot? {
        let defaults = UserDefaults(suiteName: watchAppGroup) ?? .standard
        guard let data = defaults.data(forKey: watchSnapshotKey) else { return nil }
        return try? JSONDecoder().decode(WatchScheduleSnapshot.self, from: data)
    }
}

struct WatchComplication: Widget {
    let kind = "DHBWPlannerWatchComplication"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchComplicationProvider()) { entry in
            WatchComplicationView(snapshot: entry.snapshot)
        }
        .configurationDisplayName("Nächster DHBW-Termin")
        .description("Zeigt die aktuelle oder nächste Veranstaltung.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}

struct WatchComplicationView: View {
    @Environment(\.widgetFamily) private var family
    let snapshot: WatchScheduleSnapshot?

    var body: some View {
        let entry = snapshot?.currentEntry ?? snapshot?.nextEntry
        Group {
            if let entry {
                switch family {
                case .accessoryCircular:
                    VStack(spacing: 0) {
                        Image(systemName: snapshot?.currentEntry == nil ? "arrow.right" : "play.fill")
                        Text(entry.startDate, style: .time)
                            .font(.caption2.monospacedDigit())
                    }
                case .accessoryInline:
                    Text("\(entry.startDate.formatted(date: .omitted, time: .shortened)) \(entry.title)")
                default:
                    VStack(alignment: .leading, spacing: 1) {
                        Text(entry.title).lineLimit(1)
                        Text(entry.room.isEmpty ? entry.startDate.formatted(date: .omitted, time: .shortened) : entry.room)
                            .font(.caption2)
                            .lineLimit(1)
                    }
                }
            } else {
                Text("Keine Vorlesung")
            }
        }
        .widgetURL(URL(string: "dhbw-planner://calendar"))
    }
}

@main
struct DHBWPlannerWatchWidgetBundle: WidgetBundle {
    var body: some Widget {
        WatchComplication()
    }
}
