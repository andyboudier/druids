import UIKit
import Capacitor

// iOS 27 stops any app built with its SDK that has not adopted the scene
// lifecycle, at launch (UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption).
// Info.plist's UIApplicationSceneManifest names this class and Main.storyboard,
// so UIKit builds the window and the CAPBridgeViewController from the
// storyboard as before. With scenes, a URL or link that opens the app comes
// here rather than to the AppDelegate, so this hands it to Capacitor's
// ApplicationDelegateProxy, as the AppDelegate's openURL and
// continueUserActivity do. (TPPC uses Capacitor 8.5's SceneDelegateProxy for
// the same; this app's Capacitor predates it.)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        if !connectionOptions.urlContexts.isEmpty {
            self.scene(scene, openURLContexts: connectionOptions.urlContexts)
        }
        for userActivity in connectionOptions.userActivities {
            self.scene(scene, continue: userActivity)
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            var options: [UIApplication.OpenURLOptionsKey: Any] = [:]
            if let sourceApplication = context.options.sourceApplication {
                options[.sourceApplication] = sourceApplication
            }
            if let annotation = context.options.annotation {
                options[.annotation] = annotation
            }
            options[.openInPlace] = context.options.openInPlace
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: options)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
