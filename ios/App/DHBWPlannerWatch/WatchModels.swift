import Foundation

struct WatchScheduleEntry: Codable, Identifiable, Hashable {
    let id: String
    let title: String
    let startTime: Double
    let endTime: Double
    let room: String
    let lecturer: String
    let extra: String
    let type: String
    let day: String

    var startDate: Date { Date(timeIntervalSince1970: startTime / 1000) }
    var endDate: Date { Date(timeIntervalSince1970: endTime / 1000) }
}

struct WatchScheduleSnapshot: Codable, Hashable {
    let version: Int
    let timezone: String
    let updatedAt: Double
    let currentEntry: WatchScheduleEntry?
    let nextEntry: WatchScheduleEntry?
    let today: String
    let todayEntries: [WatchScheduleEntry]
    let upcomingEntries: [WatchScheduleEntry]

    var updatedDate: Date { Date(timeIntervalSince1970: updatedAt / 1000) }
}

/// Der Snapshot enthält `currentEntry`/`nextEntry`/`todayEntries` nur als Stand
/// des Sync-Zeitpunkts. Zwischen zwei Syncs – und erst recht über Mitternacht
/// hinweg – wäre das falsch, deshalb leitet die Uhr diese Werte selbst aus den
/// Zeitstempeln ab. `upcomingEntries` liefert dafür die Tage nach dem Sync.
extension WatchScheduleSnapshot {
    private static let berlinDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "Europe/Berlin") ?? .current
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    static func dayKey(for date: Date) -> String {
        berlinDayFormatter.string(from: date)
    }

    /// Alle bekannten Termine, dedupliziert und chronologisch.
    var knownEntries: [WatchScheduleEntry] {
        var seen = Set<String>()
        return (todayEntries + upcomingEntries)
            .filter { seen.insert($0.id).inserted }
            .sorted { $0.startTime < $1.startTime }
    }

    /// Gerade laufende Veranstaltung zum gegebenen Zeitpunkt.
    func currentEntry(at date: Date) -> WatchScheduleEntry? {
        knownEntries.first { $0.startDate <= date && $0.endDate > date }
    }

    /// Nächste Veranstaltung – auch wenn sie direkt an die laufende anschließt.
    func nextEntry(at date: Date) -> WatchScheduleEntry? {
        let current = currentEntry(at: date)
        let from = current?.endDate ?? date
        return knownEntries.first { $0.id != current?.id && $0.startDate >= from }
    }

    /// Termine des Kalendertags, in dem `date` liegt.
    func entries(forDayOf date: Date) -> [WatchScheduleEntry] {
        let key = Self.dayKey(for: date)
        return knownEntries.filter { $0.day == key }
    }

    /// True, sobald der Snapshot nicht mehr den laufenden Kalendertag abdeckt.
    func isOutdated(at date: Date) -> Bool {
        Self.dayKey(for: date) > today
    }
}
