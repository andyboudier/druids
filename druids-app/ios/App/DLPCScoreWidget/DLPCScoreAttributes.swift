import ActivityKit

/// Static + dynamic data for the DLPC live-score Live Activity.
///
/// Shared between the app (which starts / updates / ends the activity via
/// ActivityKit) and the widget extension (which renders it). The web app
/// already computes the head-start-adjusted display score, so the values here
/// are pre-formatted strings and the widget stays purely presentational.
///
/// Requires ActivityKit (iOS 16.1+); the app only ever touches it inside
/// `#available` guards.
@available(iOS 16.2, *)
struct DLPCScoreAttributes: ActivityAttributes {
    /// The parts that change while a match is in play.
    public struct ContentState: Codable, Hashable {
        /// Head-start-adjusted display score for each side, pre-formatted
        /// (e.g. "5", "3½").
        var scoreA: String
        var scoreB: String
        /// e.g. "3rd chukka", "Full time", "Not started".
        var status: String
        /// True while a chukka is under way — drives the live dot.
        var isLive: Bool
    }

    /// Fixed for the life of the activity — set when the match starts.
    var teamAName: String   // Blue side
    var teamBName: String   // White side
    var matchLabel: String  // fixture / match name
}
