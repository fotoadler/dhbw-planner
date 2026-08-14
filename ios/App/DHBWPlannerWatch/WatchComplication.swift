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
        let now = Date()
        let snapshot = loadSnapshot()
        // Ein einzelner Eintrag würde bis zum nächsten Reload denselben Termin
        // zeigen. Stattdessen an jedem Start-/Endzeitpunkt der nächsten Tage neu
        // rendern, damit „jetzt“ und „als Nächstes“ ohne Sync korrekt wechseln.
        let boundaries = (snapshot?.knownEntries ?? [])
            .flatMap { [$0.startDate, $0.endDate] }
            .filter { $0 > now && $0 < now.addingTimeInterval(2 * 24 * 60 * 60) }
            .sorted()
            .prefix(40)

        let dates = [now] + boundaries
        let entries = dates.map { WatchComplicationEntry(date: $0, snapshot: snapshot) }
        let reload = boundaries.last ?? now.addingTimeInterval(60 * 60)
        completion(Timeline(entries: entries, policy: .after(reload)))
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
            WatchComplicationView(snapshot: entry.snapshot, now: entry.date)
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
    let now: Date

    var body: some View {
        let current = snapshot?.currentEntry(at: now)
        let entry = current ?? snapshot?.nextEntry(at: now)
        // Steht der nächste Termin erst morgen an, ist eine nackte Uhrzeit irreführend.
        let isOnAnotherDay = entry.map { $0.day != WatchScheduleSnapshot.dayKey(for: now) } ?? false
        Group {
            if let entry {
                switch family {
                case .accessoryCircular:
                    VStack(spacing: 0) {
                        Image(systemName: current == nil ? "arrow.right" : "play.fill")
                        Text(entry.startDate, style: .time)
                            .font(.caption2.monospacedDigit())
                    }
                case .accessoryInline:
                    if isOnAnotherDay {
                        Text("\(entry.startDate.formatted(.dateTime.weekday(.abbreviated).hour().minute())) \(entry.title)")
                    } else {
                        Text("\(entry.startDate.formatted(date: .omitted, time: .shortened)) \(entry.title)")
                    }
                default:
                    VStack(alignment: .leading, spacing: 1) {
                        Text(entry.title).lineLimit(1)
                        Text(subtitle(for: entry, isOnAnotherDay: isOnAnotherDay))
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

    private func subtitle(for entry: WatchScheduleEntry, isOnAnotherDay: Bool) -> String {
        if isOnAnotherDay {
            return entry.startDate.formatted(.dateTime.weekday(.abbreviated).hour().minute())
        }
        return entry.room.isEmpty ? entry.startDate.formatted(date: .omitted, time: .shortened) : entry.room
    }
}

@main
struct DHBWPlannerWatchWidgetBundle: WidgetBundle {
    var body: some Widget {
        WatchComplication()
    }
}
