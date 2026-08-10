import ActivityKit
import SwiftUI
import WidgetKit

@main
struct CourseLiveActivityWidgetBundle: WidgetBundle {
    var body: some Widget {
        CourseLiveActivityWidget()
    }
}

struct CourseLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: CourseLectureAttributes.self) { context in
            CourseLiveLockScreenView(state: context.state, isStale: activityIsStale(context))
                .activityBackgroundTint(Color(uiColor: .systemBackground))
                .activitySystemActionForegroundColor(.primary)
        } dynamicIsland: { context in
            let isStale = activityIsStale(context)
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundStyle(CourseLiveStyle.accent)
                }
                .contentMargins(.leading, 16)
                DynamicIslandExpandedRegion(.trailing) {
                    if isStale {
                        Image(systemName: "checkmark")
                            .foregroundStyle(Color.secondary)
                    } else {
                        Text(context.state.endTime, style: .time)
                            .font(.caption.monospacedDigit().weight(.semibold))
                            .foregroundStyle(Color.secondary)
                            .lineLimit(1)
                    }
                }
                .contentMargins(.trailing, 16)
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(context.state.title)
                            .font(.headline)
                            .foregroundStyle(Color.primary)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)

                        if isStale {
                            Label("Vorlesung beendet", systemImage: "checkmark.circle")
                                .font(.caption)
                                .foregroundStyle(Color.secondary)
                        } else {
                            CourseLiveProgressView(state: context.state)
                            if !context.state.room.isEmpty {
                                Label(context.state.room, systemImage: "mappin.and.ellipse")
                                    .font(.caption)
                                    .foregroundStyle(Color.secondary)
                                    .lineLimit(1)
                            }
                            if !context.state.nextTitle.isEmpty, let nextStartTime = context.state.nextStartTime {
                                Label {
                                    Text("Als Nächstes · \(nextStartLabel(nextStartTime))  \(context.state.nextTitle)")
                                        .lineLimit(1)
                                } icon: {
                                    Image(systemName: "arrow.right.circle.fill")
                                }
                                .font(.caption)
                                .foregroundStyle(Color.secondary)
                            }
                        }
                    }
                }
                .contentMargins(.horizontal, 16)
            } compactLeading: {
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(CourseLiveStyle.accent)
            } compactTrailing: {
                if isStale {
                    Image(systemName: "checkmark")
                } else {
                    Text(context.state.endTime, style: .time)
                        .font(.caption2.monospacedDigit())
                        .frame(maxWidth: 44)
                }
            } minimal: {
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(CourseLiveStyle.accent)
            }
        }
    }
}

private func activityIsStale(_ context: ActivityViewContext<CourseLectureAttributes>) -> Bool {
    if #available(iOS 16.2, *) {
        return context.isStale
    }
    return false
}

private func nextStartLabel(_ date: Date) -> String {
    let calendar = Calendar.autoupdatingCurrent
    if calendar.isDateInToday(date) {
        return "Heute, \(date.formatted(date: .omitted, time: .shortened))"
    }
    if calendar.isDateInTomorrow(date) {
        return "Morgen, \(date.formatted(date: .omitted, time: .shortened))"
    }
    return date.formatted(.dateTime.weekday(.abbreviated).hour().minute())
}

struct CourseLiveLockScreenView: View {
    let state: CourseLectureAttributes.ContentState
    let isStale: Bool

    var body: some View {
        // Lock-screen Live Activities have a limited vertical presentation.
        // Keep the hierarchy intentionally compact: title, remaining time,
        // progress, then the practical course details.
        VStack(alignment: .leading, spacing: 8) {
            Text(state.title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(Color.primary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            if isStale {
                Label("Vorlesung beendet", systemImage: "checkmark.circle")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color.secondary)
            } else {
                HStack(alignment: .firstTextBaseline) {
                    Spacer(minLength: 12)
                    Text("Endet \(state.endTime, style: .time)")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.white.opacity(0.7))
                }

                CourseLiveProgressView(state: state)
            }

            HStack(spacing: 12) {
                Label {
                    Text("Seit \(state.startTime, style: .time)")
                } icon: {
                    Image(systemName: "clock")
                }
                .lineLimit(1)
                if !state.room.isEmpty {
                    Label(state.room, systemImage: "mappin.and.ellipse")
                        .lineLimit(1)
                }
            }
            .font(.caption)
            .foregroundStyle(Color.secondary)

            if !state.lecturer.isEmpty {
                Label(state.lecturer, systemImage: "person")
                    .font(.caption)
                    .foregroundStyle(Color.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }
}

private enum CourseLiveStyle {
    static let accent = Color(red: 0.89, green: 0.0, blue: 0.1)
}

struct CourseLiveProgressView: View {
    let state: CourseLectureAttributes.ContentState

    var body: some View {
        // Supplying empty labels leaves the bar unobtrusive; the end time is
        // presented separately as static, reliable text.
        ProgressView(timerInterval: state.startTime...state.endTime, countsDown: false) {
            EmptyView()
        } currentValueLabel: {
            EmptyView()
        }
            .progressViewStyle(.linear)
            .tint(CourseLiveStyle.accent)
    }
}
