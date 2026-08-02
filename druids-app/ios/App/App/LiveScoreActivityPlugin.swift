import Foundation
import Capacitor
import ActivityKit

/// Bridges the (remote-loaded) web app to the live-score Live Activity.
///
/// JS calls `start` when a match goes live, `update` on each score/chukka
/// change, and `end` at full time. All ActivityKit use is guarded to iOS 16.2+
/// (the app itself still supports iOS 15). Registered automatically via
/// `CAPBridgedPlugin` — no manual registration needed.
@objc(LiveScoreActivityPlugin)
public class LiveScoreActivityPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveScoreActivityPlugin"
    public let jsName = "LiveScoreActivity"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "start",       returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update",      returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end",         returnType: CAPPluginReturnPromise),
    ]

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.2, *) {
            call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false])
        }
    }

    @available(iOS 16.2, *)
    private func state(from call: CAPPluginCall, defaultStatus: String, defaultLive: Bool)
        -> DLPCScoreAttributes.ContentState {
        DLPCScoreAttributes.ContentState(
            scoreA: call.getString("scoreA") ?? "0",
            scoreB: call.getString("scoreB") ?? "0",
            status: call.getString("status") ?? defaultStatus,
            isLive: call.getBool("isLive") ?? defaultLive)
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.reject("Live Activities require iOS 16.2+"); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.reject("Live Activities are turned off in Settings"); return
        }
        let attributes = DLPCScoreAttributes(
            teamAName: call.getString("teamAName") ?? "Blue",
            teamBName: call.getString("teamBName") ?? "White",
            matchLabel: call.getString("matchLabel") ?? "DLPC")
        let content = ActivityContent(state: state(from: call, defaultStatus: "", defaultLive: true),
                                      staleDate: nil)
        do {
            let activity = try Activity.request(attributes: attributes, content: content, pushType: nil)
            call.resolve(["id": activity.id])
        } catch {
            call.reject("Could not start Live Activity: \(error.localizedDescription)")
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.reject("unsupported"); return }
        let content = ActivityContent(state: state(from: call, defaultStatus: "", defaultLive: true),
                                      staleDate: nil)
        let id = call.getString("id")
        Task {
            for activity in Activity<DLPCScoreAttributes>.activities where id == nil || activity.id == id {
                await activity.update(content)
            }
            call.resolve()
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.reject("unsupported"); return }
        let content = ActivityContent(state: state(from: call, defaultStatus: "Full time", defaultLive: false),
                                      staleDate: nil)
        let id = call.getString("id")
        Task {
            for activity in Activity<DLPCScoreAttributes>.activities where id == nil || activity.id == id {
                await activity.end(content, dismissalPolicy: .default)
            }
            call.resolve()
        }
    }
}
