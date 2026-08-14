import SwiftUI

struct ContentView: View {
    @ObservedObject var store: WatchSyncStore

    var body: some View {
        NavigationStack {
            ScrollView {
                // Minütlich neu auswerten, damit „Jetzt“/„Als Nächstes“ und die
                // Tagesliste auch ohne frischen Sync stimmen (u. a. über Mitternacht).
                TimelineView(.periodic(from: .now, by: 60)) { context in
                    VStack(alignment: .leading, spacing: 10) {
                        if let snapshot = store.snapshot {
                            summary(snapshot, now: context.date)
                            todayList(snapshot, now: context.date)
                            syncFooter(snapshot, now: context.date)
                        } else {
                            emptyState
                        }
                    }
                }
                .padding(.horizontal, 8)
            }
        }
    }

    @ViewBuilder
    private func summary(_ snapshot: WatchScheduleSnapshot, now: Date) -> some View {
        if let current = snapshot.currentEntry(at: now) {
            EntrySummaryCard(entry: current, isCurrent: true, now: now)
        } else if let next = snapshot.nextEntry(at: now) {
            EntrySummaryCard(entry: next, isCurrent: false, now: now)
        } else {
            VStack(alignment: .leading, spacing: 4) {
                Label("Keine Vorlesung", systemImage: "checkmark.circle")
                    .font(.headline)
                Text("Es ist kein weiterer Termin bekannt.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 6)
        }

    }

    @ViewBuilder
    private func todayList(_ snapshot: WatchScheduleSnapshot, now: Date) -> some View {
        let entries = snapshot.entries(forDayOf: now)
        if !entries.isEmpty {
            Text("Heute")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .padding(.top, 4)

            ForEach(entries) { entry in
                NavigationLink(destination: WatchEntryDetailView(entry: entry)) {
                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(entry.startDate, style: .time)
                            .font(.caption2.monospacedDigit())
                            .frame(width: 42, alignment: .leading)
                        VStack(alignment: .leading, spacing: 1) {
                            Text(entry.title)
                                .font(.caption)
                                .lineLimit(1)
                            if !entry.room.isEmpty {
                                Text(entry.room)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func syncFooter(_ snapshot: WatchScheduleSnapshot, now: Date) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            if snapshot.isOutdated(at: now) {
                Label("Stand von einem früheren Tag", systemImage: "exclamationmark.triangle")
                    .font(.caption2)
                    .foregroundStyle(.orange)
            }
            Text("Stand \(snapshot.updatedDate.formatted(.relative(presentation: .named)))")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(.top, 6)
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Noch nicht synchronisiert", systemImage: "arrow.triangle.2.circlepath")
                .font(.headline)
            Text("Öffne DHBW Planner auf dem iPhone, damit der Stundenplan übertragen wird.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 10)
    }

}

private struct EntrySummaryCard: View {
    let entry: WatchScheduleEntry
    let isCurrent: Bool
    let now: Date

    /// „Als Nächstes“ kann morgen oder später sein – ohne Tag wäre die Uhrzeit irreführend.
    private var isOnAnotherDay: Bool {
        entry.day != WatchScheduleSnapshot.dayKey(for: now)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            Label(isCurrent ? "Jetzt" : "Als Nächstes", systemImage: isCurrent ? "play.circle.fill" : "arrow.right.circle")
                .font(.caption2)
                .foregroundStyle(isCurrent ? .red : .secondary)

            Text(entry.title)
                .font(.headline)
                .lineLimit(2)

            if !entry.lecturer.isEmpty {
                Text(entry.lecturer)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            HStack(spacing: 8) {
                Text(entry.startDate, style: .time)
                    .font(.caption.monospacedDigit())
                Text("–")
                    .foregroundStyle(.secondary)
                Text(entry.endDate, style: .time)
                    .font(.caption.monospacedDigit())
            }

            if isOnAnotherDay {
                Text(entry.startDate.formatted(.dateTime.weekday(.wide).day().month()))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            if isCurrent {
                Text(timerInterval: now...entry.endDate, countsDown: true)
                    .font(.title3.monospacedDigit().weight(.semibold))
                    .foregroundStyle(.red)
            }

            if !entry.room.isEmpty {
                Label(entry.room, systemImage: "mappin.and.ellipse")
                    .font(.caption)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 5)
    }
}

private struct WatchEntryDetailView: View {
    let entry: WatchScheduleEntry

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text(entry.title)
                    .font(.headline)
                    .fixedSize(horizontal: false, vertical: true)

                Label {
                    Text(entry.startDate, style: .time) + Text(" – ") + Text(entry.endDate, style: .time)
                } icon: {
                    Image(systemName: "clock")
                }

                if !entry.room.isEmpty {
                    Label(entry.room, systemImage: "mappin.and.ellipse")
                }
                if !entry.lecturer.isEmpty {
                    Label(entry.lecturer, systemImage: "person")
                }
                if !entry.extra.isEmpty {
                    Text(entry.extra)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .font(.caption)
        }
        .navigationTitle("Termin")
    }
}
