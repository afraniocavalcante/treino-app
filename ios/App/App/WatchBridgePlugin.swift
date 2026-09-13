import Foundation
import Capacitor
import WatchConnectivity

/// Bridges the JS app (WorkoutApp.tsx / Hub.tsx) to the paired Apple Watch via
/// WatchConnectivity. Two directions:
///  - iPhone -> Watch: `sendTodayWorkout` pushes the computed "today's workout"
///    payload via `updateApplicationContext` (always reflects the latest state,
///    delivered even if the watch app isn't foreground).
///  - Watch -> iPhone: a completed session arrives via `didReceiveUserInfo`
///    (queued delivery, survives the phone being unreachable/backgrounded).
///    WCSessionDelegate callbacks run in this app's own process, so a plain
///    UserDefaults queue is enough — no App Group / shared container needed.
@objc(WatchBridgePlugin)
public class WatchBridgePlugin: CAPPlugin, CAPBridgedPlugin, WCSessionDelegate {
    public let identifier = "WatchBridgePlugin"
    public let jsName = "WatchBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sendTodayWorkout", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainPendingSessions", returnType: CAPPluginReturnPromise)
    ]

    private let pendingSessionsKey = "watchBridge.pendingSessions"

    override public func load() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    @objc func sendTodayWorkout(_ call: CAPPluginCall) {
        guard let workout = call.getObject("workout") else {
            call.reject("Missing 'workout' payload")
            return
        }
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
            // Not paired / no watch app installed yet — not an error, just a no-op.
            call.resolve()
            return
        }
        do {
            try WCSession.default.updateApplicationContext(["todayWorkout": workout])
            call.resolve()
        } catch {
            call.reject("Failed to send today's workout to the Watch: \(error.localizedDescription)")
        }
    }

    @objc func drainPendingSessions(_ call: CAPPluginCall) {
        let defaults = UserDefaults.standard
        let sessions = defaults.array(forKey: pendingSessionsKey) as? [[String: Any]] ?? []
        defaults.removeObject(forKey: pendingSessionsKey)
        call.resolve(["sessions": sessions])
    }

    // MARK: - WCSessionDelegate

    public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        // No action needed — sendTodayWorkout checks activationState itself.
    }

    public func sessionDidBecomeInactive(_ session: WCSession) {}

    public func sessionDidDeactivate(_ session: WCSession) {
        // Required when the paired watch switches (e.g. new device) — reactivate for the new one.
        WCSession.default.activate()
    }

    public func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        guard let completedSession = userInfo["completedSession"] as? [String: Any] else { return }

        let defaults = UserDefaults.standard
        var pending = defaults.array(forKey: pendingSessionsKey) as? [[String: Any]] ?? []
        pending.append(completedSession)
        defaults.set(pending, forKey: pendingSessionsKey)

        // Hint for a live listener; the JS side always resolves via
        // drainPendingSessions() so this fires even if no listener is attached yet.
        notifyListeners("sessionReceived", data: ["pendingCount": pending.count])
    }
}
