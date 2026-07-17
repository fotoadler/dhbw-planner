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
            CourseLiveLockScreenView(state: context.state)
                .activityBackgroundTint(Color(red: 0.08, green: 0.09, blue: 0.11))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(context.state.title)
                            .font(.headline)
                            .foregroundStyle(Color.white)
                            .lineLimit(2)
                            .minimumScaleFactor(0.8)
                    }
                }
                DynamicIslandExpandedRegion(.trailing) {
                    HStack(spacing: 4) {
                        Text("Noch")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(Color.white.opacity(0.72))
                        CourseLiveCountdown(state: context.state, showsHours: true)
                            .font(.headline.monospacedDigit().weight(.semibold))
                            .foregroundStyle(Color.white)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        CourseLiveProgressView(state: context.state)
                        if !context.state.room.isEmpty {
                            Label(context.state.room, systemImage: "mappin.and.ellipse")
                                .font(.caption)
                                .foregroundStyle(Color.white.opacity(0.76))
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
                            .foregroundStyle(Color.white.opacity(0.76))
                        }
                    }
                }
            } compactLeading: {
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(CourseLiveStyle.accent)
            } compactTrailing: {
                CourseLiveCountdown(state: context.state, showsHours: true)
                    .font(.caption2.monospacedDigit())
                    .frame(maxWidth: 44)
            } minimal: {
                Image(systemName: "calendar.badge.clock")
                    .foregroundStyle(CourseLiveStyle.accent)
            }
        }
    }
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

    var body: some View {
        // Lock-screen Live Activities have a limited vertical presentation.
        // Keep the hierarchy intentionally compact: title, remaining time,
        // progress, then the practical course details.
        VStack(alignment: .leading, spacing: 8) {
            Text(state.title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(.white)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)

            HStack(alignment: .firstTextBaseline) {
                HStack(spacing: 4) {
                    Text("Noch")
                        .font(.caption.weight(.medium))
                        .foregroundStyle(.white.opacity(0.7))
                    CourseLiveCountdown(state: state, showsHours: true)
                        .font(.title3.monospacedDigit().weight(.semibold))
                        .foregroundStyle(.white)
                }
                Spacer(minLength: 12)
                Text("Endet \(state.endTime, style: .time)")
                    .font(.caption.weight(.medium))
                    .foregroundStyle(.white.opacity(0.7))
            }

            CourseLiveProgressView(state: state)

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
            .foregroundStyle(.white.opacity(0.76))

            if !state.lecturer.isEmpty {
                Label(state.lecturer, systemImage: "person")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.76))
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

struct CourseLiveCountdown: View {
    let state: CourseLectureAttributes.ContentState
    let showsHours: Bool

    var body: some View {
        // `Text(timerInterval:)` on iOS 16 counts down from the beginning of
        // this range. Starting at the current moment (rather than at the
        // course start) therefore always yields the remaining time.
        Text(
            timerInterval: countdownStart...state.endTime,
            pauseTime: state.endTime,
            countsDown: true,
            showsHours: showsHours
        )
    }

    private var countdownStart: Date {
        min(max(Date(), state.startTime), state.endTime)
    }
}

struct CourseLiveProgressView: View {
    let state: CourseLectureAttributes.ContentState

    var body: some View {
        // The convenience initializer adds its own elapsed-time label in the
        // Dynamic Island. Supplying empty labels leaves only the progress bar;
        // the explicit "Noch …" countdown remains the sole timer.
        ProgressView(timerInterval: state.startTime...state.endTime, countsDown: false) {
            EmptyView()
        } currentValueLabel: {
            EmptyView()
        }
            .progressViewStyle(.linear)
            .tint(CourseLiveStyle.accent)
    }
}
