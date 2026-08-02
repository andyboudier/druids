import ActivityKit
import WidgetKit
import SwiftUI

// DLPC brand palette (matches the app icon / web app).
private enum Brand {
    static let burgundy = Color(red: 0x6b / 255.0, green: 0x1f / 255.0, blue: 0x2a / 255.0)
    static let cream    = Color(red: 0xf4 / 255.0, green: 0xec / 255.0, blue: 0xd8 / 255.0)
    static let gold     = Color(red: 0xd4 / 255.0, green: 0xa8 / 255.0, blue: 0x5a / 255.0)
    static let teamA    = Color(red: 0x12 / 255.0, green: 0x7c / 255.0, blue: 0xc0 / 255.0) // Blue side
}

/// Live Activity: live polo score on the Lock Screen and in the Dynamic Island.
struct DLPCScoreLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DLPCScoreAttributes.self) { context in
            // Lock Screen / notification banner
            LockScreenLiveView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    ScoreChip(name: context.attributes.teamAName,
                              score: context.state.scoreA,
                              tint: Brand.teamA)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    ScoreChip(name: context.attributes.teamBName,
                              score: context.state.scoreB,
                              tint: .white)
                }
                DynamicIslandExpandedRegion(.center) {
                    StatusPill(status: context.state.status, isLive: context.state.isLive)
                }
            } compactLeading: {
                Text(context.state.scoreA).font(.caption2).bold().foregroundColor(Brand.teamA)
            } compactTrailing: {
                Text(context.state.scoreB).font(.caption2).bold().foregroundColor(.white)
            } minimal: {
                Text("\(context.state.scoreA)–\(context.state.scoreB)")
                    .font(.caption2).bold().foregroundColor(Brand.gold)
            }
            .keylineTint(Brand.burgundy)
            .widgetURL(URL(string: "dlpc://live"))
        }
    }
}

// MARK: - Lock screen / banner

private struct LockScreenLiveView: View {
    let context: ActivityViewContext<DLPCScoreAttributes>

    var body: some View {
        HStack(alignment: .center) {
            teamColumn(context.attributes.teamAName, context.state.scoreA, tint: Brand.teamA)
            Spacer(minLength: 8)
            VStack(spacing: 3) {
                if context.state.isLive {
                    HStack(spacing: 4) {
                        Circle().fill(.red).frame(width: 7, height: 7)
                        Text("LIVE").font(.caption2.bold()).foregroundColor(.red)
                    }
                }
                Text(context.state.status)
                    .font(.footnote.weight(.semibold))
                    .foregroundColor(Brand.cream.opacity(0.9))
                    .lineLimit(1)
                Text(context.attributes.matchLabel)
                    .font(.caption2)
                    .foregroundColor(Brand.cream.opacity(0.6))
                    .lineLimit(1)
            }
            Spacer(minLength: 8)
            teamColumn(context.attributes.teamBName, context.state.scoreB, tint: .white)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .activityBackgroundTint(Brand.burgundy)
        .activitySystemActionForegroundColor(Brand.cream)
    }

    private func teamColumn(_ name: String, _ score: String, tint: Color) -> some View {
        VStack(spacing: 2) {
            Text(name)
                .font(.caption)
                .foregroundColor(Brand.cream.opacity(0.9))
                .lineLimit(1)
            Text(score)
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundColor(tint)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Dynamic Island pieces

private struct ScoreChip: View {
    let name: String
    let score: String
    let tint: Color

    var body: some View {
        VStack(spacing: 1) {
            Text(name).font(.caption2).foregroundColor(.secondary).lineLimit(1)
            Text(score).font(.title3.bold()).foregroundColor(tint)
        }
    }
}

private struct StatusPill: View {
    let status: String
    let isLive: Bool

    var body: some View {
        VStack(spacing: 2) {
            if isLive {
                HStack(spacing: 3) {
                    Circle().fill(.red).frame(width: 6, height: 6)
                    Text("LIVE").font(.system(size: 10, weight: .bold)).foregroundColor(.red)
                }
            }
            Text(status).font(.caption2).foregroundColor(.secondary).lineLimit(1)
        }
    }
}
