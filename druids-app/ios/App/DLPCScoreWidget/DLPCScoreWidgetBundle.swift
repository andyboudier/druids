import WidgetKit
import SwiftUI

/// Entry point for the DLPC widget extension. Hosts the live-score Live
/// Activity. (The extension's deployment target is iOS 16.2, so no further
/// availability gating is needed here.)
@main
struct DLPCScoreWidgetBundle: WidgetBundle {
    var body: some Widget {
        DLPCScoreLiveActivity()
    }
}
