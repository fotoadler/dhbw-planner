import SwiftUI
import WidgetKit

struct PlannerEvent: Decodable {
    let title: String; let start: Double; let end: Double; let room: String
    var startDate: Date { Date(timeIntervalSince1970: start / 1000) }
    var endDate: Date { Date(timeIntervalSince1970: end / 1000) }
}
struct PlannerDay: Decodable { let date: String; let known: Bool; let events: [PlannerEvent] }
struct PlannerSnapshot: Decodable {
    let unlocked: Bool; let profileId: String; let course: String; let updatedAt: Double; let days: [PlannerDay]
    var courseLabel: String { course.trimmingCharacters(in: .whitespacesAndNewlines) }
    static var empty: Self { .init(unlocked: false, profileId: "", course: "", updatedAt: 0, days: []) }
    static func read() -> Self {
        guard let json = UserDefaults(suiteName: "group.de.dhbw.raplaplan.widgets")?.string(forKey: "schedule.v1"),
              let data = json.data(using: .utf8), let value = try? JSONDecoder().decode(Self.self, from: data) else { return .empty }
        return value
    }
}
struct PlannerWidgetEntry: TimelineEntry {
    let date: Date; let snapshot: PlannerSnapshot
    var day: PlannerDay? { snapshot.days.first { $0.date == plannerDayKey(date) } }
    var remaining: [PlannerEvent] { (day?.events ?? []).filter { $0.endDate > date } }
    var status: String {
        if !snapshot.unlocked { return "Widgets für Unterstützer" }
        if day?.known != true { return "Stundenplan öffnen" }
        if day?.events.isEmpty != false { return "Heute keine Vorlesung" }
        if remaining.isEmpty { return "Für heute geschafft" }
        return remaining[0].startDate <= date ? "Jetzt" : "Als Nächstes"
    }
    var link: URL {
        if !snapshot.unlocked { return URL(string: "dhbwplanner://support")! }
        var url = URLComponents(); url.scheme = "dhbwplanner"; url.host = "day"
        url.queryItems = [.init(name: "date", value: plannerDayKey(date)), .init(name: "profile", value: snapshot.profileId)]
        return url.url!
    }
}
private func plannerDayKey(_ date: Date) -> String {
    let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.timeZone = TimeZone(identifier: "Europe/Berlin"); formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
}
struct PlannerTimeline: TimelineProvider {
    func placeholder(in context: Context) -> PlannerWidgetEntry {
        let now = Date()
        let snapshot = PlannerSnapshot(unlocked: true, profileId: "", course: "DHBW Planner", updatedAt: now.timeIntervalSince1970 * 1000,
            days: [.init(date: plannerDayKey(now), known: true, events: [.init(title: "Medienwirtschaft", start: now.addingTimeInterval(1800).timeIntervalSince1970 * 1000, end: now.addingTimeInterval(5400).timeIntervalSince1970 * 1000, room: "RV 201"), .init(title: "Kommunikation", start: now.addingTimeInterval(6300).timeIntervalSince1970 * 1000, end: now.addingTimeInterval(11700).timeIntervalSince1970 * 1000, room: "RV 203"), .init(title: "Marketing", start: now.addingTimeInterval(12600).timeIntervalSince1970 * 1000, end: now.addingTimeInterval(18000).timeIntervalSince1970 * 1000, room: "RV 205")])])
        return .init(date: now, snapshot: snapshot)
    }
    func getSnapshot(in context: Context, completion: @escaping (PlannerWidgetEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : .init(date: Date(), snapshot: .read()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<PlannerWidgetEntry>) -> Void) {
        let snapshot = PlannerSnapshot.read(); let now = Date()
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(identifier: "Europe/Berlin")!
        // Switch at starts, ends and local midnight, even without reopening the app.
        var dates = Set<Date>([now])
        for offset in 1...14 {
            if let day = calendar.date(byAdding: .day, value: offset, to: calendar.startOfDay(for: now)) { dates.insert(day) }
        }
        for event in snapshot.days.flatMap({ $0.events }) {
            if event.startDate > now { dates.insert(event.startDate) }
            if event.endDate > now { dates.insert(event.endDate) }
        }
        let entries = dates.sorted().prefix(180).map { PlannerWidgetEntry(date: $0, snapshot: snapshot) }
        completion(Timeline(entries: entries, policy: .after(now.addingTimeInterval(3600))))
    }
}
private let plannerBrandRed = Color(red: 0.88, green: 0.02, blue: 0.12)
private let plannerRed = Color(uiColor: UIColor { traits in
    traits.userInterfaceStyle == .dark ? UIColor(red: 1, green: 0.45, blue: 0.51, alpha: 1) : UIColor(red: 0.88, green: 0.02, blue: 0.12, alpha: 1)
})

struct PlannerWidgetPaper: View {
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        scheme == .dark ? Color(red: 0.13, green: 0.13, blue: 0.15) : Color.white
    }
}
struct PlannerWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: PlannerWidgetEntry
    var body: some View {
        if #available(iOS 17.0, *) {
            PlannerWidgetContent(entry: entry, family: family).containerBackground(for: .widget) { PlannerWidgetPaper() }.widgetURL(entry.link).privacySensitive()
        } else {
            PlannerWidgetContent(entry: entry, family: family).padding(16).background(PlannerWidgetPaper()).widgetURL(entry.link).privacySensitive()
        }
    }
}
struct PlannerWidgetContent: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let entry: PlannerWidgetEntry
    let family: WidgetFamily
    private var small: Bool { family == .systemSmall }
    private var large: Bool { family == .systemLarge }
    private var known: Bool { entry.snapshot.unlocked && entry.day?.known == true }
    private var events: [PlannerEvent] { small ? entry.remaining : (entry.day?.events ?? []) }
    private var showEvents: Bool { known && !events.isEmpty }
    private var emptyTitle: String {
        if !entry.snapshot.unlocked { return "Widgets freischalten" }
        if !known { return "Stundenplan laden" }
        return entry.day?.events.isEmpty == false ? "Geschafft!" : "Heute frei."
    }
    private var emptySubtitle: String {
        if !entry.snapshot.unlocked { return "Widgets für Unterstützer" }
        if !known { return "Stundenplan in der App laden" }
        return entry.day?.events.isEmpty == false ? "Alle Vorlesungen für heute vorbei" : "Keine Vorlesungen"
    }
    private var nextEvent: PlannerEvent? {
        entry.snapshot.days.filter { $0.known && $0.date > plannerDayKey(entry.date) }.flatMap { $0.events }.first
    }
    var body: some View {
        GeometryReader { bounds in
            if !entry.snapshot.unlocked {
                PlannerLockedWidget(family: family, available: bounds.size)
            } else if typeSize > .large || (small && bounds.size.height < 130) {
                PlannerReadableWidget(entry: entry, family: family, available: bounds.size)
            } else {
                Group {
                    if small { smallBody }
                    else if large { largeBody(height: bounds.size.height) }
                    else { mediumBody }
                }.frame(width: bounds.size.width, height: bounds.size.height, alignment: .topLeading)
            }
        }
        .environment(\.locale, Locale(identifier: "de_DE"))
        .environment(\.timeZone, TimeZone(identifier: "Europe/Berlin")!)
    }
    private var smallBody: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text(entry.date, format: .dateTime.day()).plannerFont(25, weight: .bold, design: .rounded).foregroundStyle(plannerRed)
                Text(entry.date, format: .dateTime.month(.abbreviated)).plannerFont(11, weight: .medium).foregroundStyle(.secondary)
                Spacer(minLength: 0)
                Image(systemName: "calendar").plannerFont(12, weight: .semibold).foregroundStyle(plannerRed.opacity(0.65))
            }
            if showEvents, let event = events.first {
                Text(entry.status.uppercased()).plannerFont(9, weight: .bold).tracking(0.8).foregroundStyle(plannerRed)
                Text(event.title).plannerFont(15, weight: .semibold).lineLimit(2).minimumScaleFactor(0.8)
                HStack(spacing: 3) {
                    Text(event.startDate, style: .time)
                    Text("–")
                    Text(event.endDate, style: .time)
                }.plannerFont(11, weight: .medium).monospacedDigit().lineLimit(1).minimumScaleFactor(0.7)
            } else {
                Spacer(minLength: 0)
                Text(emptyTitle).plannerFont(21, weight: .bold, design: .rounded).lineLimit(2).minimumScaleFactor(0.75)
                Text(emptySubtitle).plannerFont(11).foregroundStyle(.secondary).lineLimit(2)
            }
            Spacer(minLength: 0)
            if !entry.snapshot.courseLabel.isEmpty {
                Text(entry.snapshot.courseLabel).plannerFont(10, weight: .semibold).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.6)
            }
            updated
        }
    }
    private var mediumBody: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack(alignment: .center, spacing: 14) {
                dateTile(width: 64, height: 83)
                VStack(alignment: .leading, spacing: 6) {
                    if showEvents {
                        Text(entry.status.uppercased()).plannerFont(9, weight: .bold).tracking(1).foregroundStyle(plannerRed)
                        ForEach(Array(events.prefix(2).enumerated()), id: \.offset) { index, event in
                            HStack(alignment: .firstTextBaseline, spacing: 7) {
                                Text(event.startDate, style: .time).plannerFont(12, weight: .semibold).monospacedDigit().lineLimit(1).minimumScaleFactor(0.7).frame(width: 42, alignment: .leading)
                                Text(event.title).plannerFont(13, weight: index == 0 ? .semibold : .regular).lineLimit(2)
                            }
                            if index == 0 && !event.room.isEmpty { Label(event.room, systemImage: "mappin").plannerFont(10).foregroundStyle(.secondary).lineLimit(1) }
                        }
                    } else {
                        Text(emptyTitle).plannerFont(23, weight: .bold, design: .rounded).lineLimit(1).minimumScaleFactor(0.7)
                        Text(emptySubtitle).plannerFont(12).foregroundStyle(.secondary).lineLimit(2)
                        Label(known ? "Tagesansicht öffnen" : "App öffnen", systemImage: "arrow.up.right").plannerFont(10, weight: .semibold).foregroundStyle(plannerRed).padding(.top, 3)
                    }
                }.frame(maxWidth: .infinity, alignment: .leading)
            }.frame(maxHeight: .infinity)
            footer
        }
    }
    private var upcomingDays: [PlannerDay] {
        guard known else { return [] }
        return entry.snapshot.days.filter { $0.known && $0.date > plannerDayKey(entry.date) && !$0.events.isEmpty }.sorted { $0.date < $1.date }
    }
    private func largeBody(height: CGFloat) -> some View {
        let eventLimit = max(1, min(upcomingDays.isEmpty ? 5 : 3, Int((height - 142 - (upcomingDays.isEmpty ? 0 : 64)) / 52)))
        let futureLimit = max(0, min(3, Int((height - (showEvents ? 142 + CGFloat(min(eventLimit, events.count)) * 52 : 180)) / 64)))
        let illustrationSize: CGFloat = height < 320 ? 64 : 90
        return VStack(alignment: .leading, spacing: 12) {
            HStack(spacing: 12) {
                dateTile(width: 51, height: 58)
                VStack(alignment: .leading, spacing: 3) {
                    Text(entry.date, format: .dateTime.weekday(.wide)).plannerFont(10, weight: .medium).foregroundStyle(.secondary)
                    if !entry.snapshot.courseLabel.isEmpty {
                        Text(entry.snapshot.courseLabel).plannerFont(15, weight: .semibold).lineLimit(1).minimumScaleFactor(0.65)
                    }
                }
                Spacer(minLength: 0)
                Image(systemName: "calendar").plannerFont(17, weight: .medium).foregroundStyle(plannerRed).padding(10).background(plannerRed.opacity(0.07), in: Circle())
            }
            if showEvents {
                HStack {
                    Text("\(events.count) Vorlesung\(events.count == 1 ? "" : "en")").plannerFont(9, weight: .bold).tracking(1).foregroundStyle(.secondary)
                    Spacer()
                    Text(entry.status).plannerFont(10, weight: .semibold).foregroundStyle(plannerRed)
                }
                VStack(spacing: 8) {
                    ForEach(Array(events.prefix(eventLimit).enumerated()), id: \.offset) { _, event in
                        HStack(alignment: .center, spacing: 10) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(event.startDate, style: .time).plannerFont(12, weight: .semibold)
                                Text(event.endDate, style: .time).plannerFont(10).foregroundStyle(.secondary)
                            }.monospacedDigit().lineLimit(1).minimumScaleFactor(0.7).frame(width: 43, alignment: .leading)
                            RoundedRectangle(cornerRadius: 2).fill(event.endDate <= entry.date ? Color.secondary.opacity(0.2) : plannerRed).frame(width: 3, height: 29)
                            VStack(alignment: .leading, spacing: 3) {
                                Text(event.title).plannerFont(13, weight: .semibold).lineLimit(2)
                                if !event.room.isEmpty { Text(event.room).plannerFont(10).foregroundStyle(.secondary).lineLimit(1) }
                            }
                            Spacer(minLength: 0)
                        }.opacity(event.endDate <= entry.date ? 0.45 : 1)
                    }
                }
                if events.count > eventLimit { Text("+ \(events.count - eventLimit) weitere in der App").plannerFont(10).foregroundStyle(.secondary) }
            } else {
                Spacer(minLength: 0)
                HStack(spacing: 18) {
                    freeIllustration.scaleEffect(illustrationSize / 90).frame(width: illustrationSize, height: illustrationSize)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(emptyTitle).plannerFont(28, weight: .bold, design: .rounded).minimumScaleFactor(0.7).lineLimit(2)
                        Text(emptySubtitle).plannerFont(12).foregroundStyle(.secondary)
                    }
                }.frame(maxWidth: .infinity, alignment: .leading)
                Spacer(minLength: 0)
                if upcomingDays.isEmpty {
                    Label("Tagesansicht öffnen", systemImage: "arrow.up.right").plannerFont(11, weight: .semibold).foregroundStyle(plannerRed)
                }
            }
            Spacer(minLength: 0)
            ForEach(Array(upcomingDays.prefix(futureLimit)), id: \.date) { day in
                if let first = day.events.first, let last = day.events.last {
                    Link(destination: plannerEventLink(first)) {
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 4) {
                                Text(first.startDate, format: .dateTime.weekday(.abbreviated).day().month(.abbreviated))
                                Text("·")
                                Text(first.startDate, style: .time)
                                Text("–")
                                Text(last.endDate, style: .time)
                            }.plannerFont(10, weight: .semibold).foregroundStyle(plannerRed).monospacedDigit().lineLimit(1).minimumScaleFactor(0.75)
                            Text(first.title + (day.events.count > 1 ? " · +\(day.events.count - 1) weitere" : ""))
                                .plannerFont(12, weight: .medium).foregroundStyle(.primary).lineLimit(2)
                        }.frame(maxWidth: .infinity, alignment: .leading).padding(8)
                            .background(plannerRed.opacity(0.055), in: RoundedRectangle(cornerRadius: 10))
                    }.buttonStyle(.plain)
                }
            }
            updated
        }
    }
    private func dateTile(width: CGFloat, height: CGFloat) -> some View {
        VStack(spacing: 1) {
            Text(entry.date, format: .dateTime.day()).font(.system(size: height > 70 ? 33 : 27, weight: .bold, design: .rounded)).lineLimit(1)
            Text(entry.date, format: .dateTime.month(.abbreviated)).plannerFont(10, weight: .semibold).textCase(.uppercase)
        }.foregroundStyle(.white).frame(width: width, height: height)
            .background(plannerBrandRed, in: RoundedRectangle(cornerRadius: 15))
    }
    private var freeIllustration: some View {
        ZStack {
            Circle().fill(plannerRed.opacity(0.06)).frame(width: 83, height: 83)
            RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .systemBackground)).frame(width: 56, height: 64).rotationEffect(.degrees(-9)).shadow(color: plannerRed.opacity(0.08), radius: 8, y: 3)
            Image(systemName: !entry.snapshot.unlocked ? "heart.fill" : !known ? "calendar.badge.clock" : entry.day?.events.isEmpty == false ? "checkmark" : "sun.max")
                .plannerFont(29, weight: .light).foregroundStyle(plannerRed).rotationEffect(.degrees(-9))
            Circle().fill(Color(red: 0.87, green: 0.66, blue: 0.24)).frame(width: 7, height: 7).offset(x: 32, y: -27)
            Circle().fill(plannerRed.opacity(0.25)).frame(width: 4, height: 4).offset(x: -33, y: 23)
        }.accessibilityHidden(true)
    }
    private var weekDays: [PlannerDay] {
        var calendar = Calendar(identifier: .gregorian); calendar.timeZone = TimeZone(identifier: "Europe/Berlin")!
        return (0..<7).map { offset in
            let key = plannerDayKey(calendar.date(byAdding: .day, value: offset, to: entry.date)!)
            return entry.snapshot.days.first { $0.date == key } ?? .init(date: key, known: false, events: [])
        }
    }
    private var weekStrip: some View {
        HStack(spacing: 0) {
            ForEach(Array(weekDays.enumerated()), id: \.offset) { index, day in
                let date = ISO8601DateFormatter().date(from: day.date + "T12:00:00Z") ?? entry.date
                VStack(spacing: 5) {
                    Text(date, format: .dateTime.weekday(.abbreviated)).plannerFont(9, weight: .medium).foregroundStyle(.secondary)
                    Text(date, format: .dateTime.day()).plannerFont(12, weight: index == 0 ? .bold : .medium).foregroundStyle(index == 0 ? plannerRed : .primary)
                    Circle().fill(!day.known ? Color.secondary.opacity(0.15) : day.events.isEmpty ? Color.secondary.opacity(0.3) : plannerRed).frame(width: 4, height: 4)
                }.frame(maxWidth: .infinity).padding(.vertical, 7).background(index == 0 ? plannerRed.opacity(0.06) : .clear, in: RoundedRectangle(cornerRadius: 10))
            }
        }
    }
    private var footer: some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            if !entry.snapshot.courseLabel.isEmpty {
                Text(entry.snapshot.courseLabel).plannerFont(10, weight: .semibold).lineLimit(1).minimumScaleFactor(0.6)
            }
            Spacer(minLength: 0)
            updated
        }.foregroundStyle(.secondary)
    }
    private var updated: some View {
        Group {
            if entry.snapshot.unlocked && entry.snapshot.updatedAt > 0 {
                Text("Stand \(Date(timeIntervalSince1970: entry.snapshot.updatedAt / 1000), format: .dateTime.day().month().hour().minute())")
                    .plannerFont(8).foregroundStyle(.secondary).lineLimit(1).minimumScaleFactor(0.7)
            }
        }
    }
    private func plannerEventLink(_ event: PlannerEvent) -> URL {
        var url = URLComponents(); url.scheme = "dhbwplanner"; url.host = "day"
        url.queryItems = [.init(name: "date", value: plannerDayKey(event.startDate)), .init(name: "profile", value: entry.snapshot.profileId)]
        return url.url!
    }
}
private struct PlannerLockedWidget: View {
    let family: WidgetFamily
    let available: CGSize
    private var small: Bool { family == .systemSmall }
    private var large: Bool { family == .systemLarge }
    var body: some View {
        ViewThatFits(in: .vertical) {
            content(compact: false).fixedSize(horizontal: false, vertical: true)
            content(compact: true).fixedSize(horizontal: false, vertical: true)
            VStack(alignment: .leading, spacing: 5) {
                Text("Widgets").font(.system(size: min(26, available.height / 3), weight: .bold, design: .rounded)).lineLimit(1).minimumScaleFactor(0.5)
                Text("Freischalten ↗").font(.system(size: min(18, available.height / 4), weight: .semibold)).foregroundStyle(plannerRed).lineLimit(1).minimumScaleFactor(0.5)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Widgets freischalten. Werde Unterstützer und erhalte deinen Stundenplan auf dem Home-Bildschirm. Tippe, um die Unterstützung zu öffnen.")
    }
    private func content(compact: Bool) -> some View {
        VStack(alignment: .leading, spacing: small || compact ? 8 : 14) {
            Text("Widgets freischalten").plannerFont(small ? 19 : large ? 29 : 23, weight: .bold, design: .rounded)
                .fixedSize(horizontal: false, vertical: true)
            if !small && !compact {
                Text("Unterstütze die App und nutze deinen Stundenplan als Widget.")
                    .plannerFont(13).foregroundStyle(.secondary).fixedSize(horizontal: false, vertical: true)
            }
            if large && !compact {
                VStack(alignment: .leading, spacing: 12) {
                    Label("Vorlesungen, Uhrzeiten und Räume", systemImage: "calendar")
                    Label("Antippen öffnet die Tagesansicht", systemImage: "arrow.up.right")
                }.plannerFont(13, weight: .medium).padding(14).frame(maxWidth: .infinity, alignment: .leading)
                    .background(plannerRed.opacity(0.05), in: RoundedRectangle(cornerRadius: 15))
            }
            action.plannerFont(small ? 11 : 13, weight: .semibold)
                .padding(.vertical, small ? 8 : 11).padding(.horizontal, small ? 9 : 13)
                .frame(maxWidth: .infinity, alignment: .leading)
                .foregroundStyle(.white).background(plannerBrandRed, in: RoundedRectangle(cornerRadius: 11))
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private var action: some View {
        HStack(spacing: 5) {
            Text(small ? "Unterstützen" : "Jetzt Unterstützer werden").fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Image(systemName: "arrow.up.right")
        }
    }
}

struct PlannerScheduleWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DHBWSchedule", provider: PlannerTimeline()) { PlannerWidgetView(entry: $0) }
            .configurationDisplayName("DHBW Stundenplan")
            .description("Stundenplan-Widgets für Unterstützer.")
            .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}


/// A fixed widget surface cannot grow with Dynamic Type. Prefer fewer readable
/// fields/rows before falling back to a compact presentation; never cap the
/// user's Dynamic Type setting for the whole widget.
private struct PlannerReadableWidget: View {
    let entry: PlannerWidgetEntry
    let family: WidgetFamily
    let available: CGSize
    @ScaledMetric(relativeTo: .body) private var titleSize: CGFloat = 15
    @ScaledMetric(relativeTo: .caption) private var detailSize: CGFloat = 11
    private var small: Bool { family == .systemSmall }
    private var known: Bool { entry.snapshot.unlocked && entry.day?.known == true }
    private var events: [PlannerEvent] { known ? (small ? entry.remaining : (entry.day?.events ?? [])) : [] }
    private var title: String {
        !entry.snapshot.unlocked ? "Widgets freischalten" : !known ? "App öffnen" : entry.day?.events.isEmpty == false ? "Geschafft!" : "Heute frei."
    }
    private var subtitle: String {
        !entry.snapshot.unlocked ? "Widgets für Unterstützer" : !known ? "Stundenplan laden" : entry.day?.events.isEmpty == false ? "Für heute vorbei" : "Keine Vorlesungen"
    }
    private var rowLimit: Int {
        // Budget includes two title lines, a time line and optional room per row.
        let budget = available.height - detailSize * 3 - 24
        return max(1, min(family == .systemLarge ? 4 : small ? 1 : 2, Int(budget / (titleSize * 2.4 + detailSize * 2.4 + 12))))
    }
    var body: some View {
        ViewThatFits(in: .vertical) {
            detailed.fixedSize(horizontal: false, vertical: true)
            focused.fixedSize(horizontal: false, vertical: true)
            essential
        }
        .frame(width: available.width, height: available.height, alignment: .topLeading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(voiceOverSummary)
    }
    private var detailed: some View {
        VStack(alignment: .leading, spacing: small ? 4 : 8) {
            HStack(spacing: 8) {
                Text(entry.date, format: .dateTime.day().month()).plannerFont(11, weight: .bold).foregroundStyle(plannerRed).lineLimit(1)
                if !small {
                    if !entry.snapshot.courseLabel.isEmpty {
                        Text(entry.snapshot.courseLabel).plannerFont(11, weight: .semibold).lineLimit(1)
                    }
                }
            }
            if !events.isEmpty {
                ForEach(Array(events.prefix(rowLimit).enumerated()), id: \.offset) { _, event in
                    VStack(alignment: .leading, spacing: 3) {
                        time(event, end: !small)
                        Text(event.title).plannerFont(15, weight: .semibold).lineLimit(2)
                        if !small && !event.room.isEmpty { Text(event.room).plannerFont(11).foregroundStyle(.secondary).lineLimit(1) }
                    }
                }
                if events.count > rowLimit && !small { Text("+ \(events.count - rowLimit) weitere in der App").plannerFont(10).foregroundStyle(.secondary).lineLimit(1) }
            } else {
                Text(title).plannerFont(small ? 20 : 25, weight: .bold, design: .rounded).lineLimit(2)
                Text(subtitle).plannerFont(12).foregroundStyle(.secondary).lineLimit(2)
            }
            stamp
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private var focused: some View {
        VStack(alignment: .leading, spacing: 6) {
            if let event = events.first {
                time(event, end: !small)
                Text(event.title).plannerFont(15, weight: .semibold).lineLimit(2)
            } else {
                Text(title).plannerFont(20, weight: .bold, design: .rounded).lineLimit(2)
                Text(subtitle).plannerFont(11).foregroundStyle(.secondary).lineLimit(2)
            }
            if !small { stamp }
        }.frame(maxWidth: .infinity, alignment: .leading)
    }
    private var essential: some View {
        VStack(alignment: .leading, spacing: 4) {
            if let event = events.first {
                time(event, end: false)
                Text(event.title).plannerFont(15, weight: .semibold).lineLimit(1).minimumScaleFactor(0.85)
            } else {
                Text(!entry.snapshot.unlocked ? "Freischalten" : !known ? "App" : entry.day?.events.isEmpty == false ? "Fertig." : "Frei.")
                    .plannerFont(15, weight: .bold, design: .rounded).lineLimit(2).minimumScaleFactor(0.85)
            }
        }.frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
    private func time(_ event: PlannerEvent, end: Bool) -> some View {
        HStack(spacing: 3) {
            Text(event.startDate, style: .time)
            if end { Text("–"); Text(event.endDate, style: .time) }
        }.plannerFont(11, weight: .semibold).monospacedDigit().foregroundStyle(plannerRed).lineLimit(1).minimumScaleFactor(0.85)
    }
    private var stamp: some View {
        Group {
            if entry.snapshot.updatedAt > 0 {
                Text("Stand \(Date(timeIntervalSince1970: entry.snapshot.updatedAt / 1000), format: .dateTime.day().month().hour().minute())")
                    .plannerFont(8).foregroundStyle(.secondary).lineLimit(1)
            }
        }
    }
    private var voiceOverSummary: String {
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "de_DE"); formatter.timeZone = TimeZone(identifier: "Europe/Berlin"); formatter.dateStyle = .medium; formatter.timeStyle = .short
        let schedule = events.prefix(rowLimit).map { "\($0.title), \(formatter.string(from: $0.startDate)) bis \(formatter.string(from: $0.endDate)), \($0.room)" }.joined(separator: ". ")
        let updated = entry.snapshot.updatedAt > 0 ? "Datenstand \(formatter.string(from: Date(timeIntervalSince1970: entry.snapshot.updatedAt / 1000)))" : ""
        return [entry.snapshot.courseLabel, schedule.isEmpty ? title + ". " + subtitle : schedule, updated, "Tagesansicht öffnen"].filter { !$0.isEmpty }.joined(separator: ". ")
    }
}

private struct PlannerScaledFont: ViewModifier {
    @ScaledMetric private var size: CGFloat
    let weight: Font.Weight
    let design: Font.Design
    init(size: CGFloat, weight: Font.Weight, design: Font.Design) {
        _size = ScaledMetric(wrappedValue: size, relativeTo: .body)
        self.weight = weight; self.design = design
    }
    func body(content: Content) -> some View { content.font(.system(size: size, weight: weight, design: design)) }
}
private extension View {
    func plannerFont(_ size: CGFloat, weight: Font.Weight = .regular, design: Font.Design = .default) -> some View {
        modifier(PlannerScaledFont(size: size, weight: weight, design: design))
    }
}
