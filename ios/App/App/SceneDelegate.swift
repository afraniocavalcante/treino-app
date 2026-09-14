import UIKit
import Capacitor

/// WatchBridgePlugin isn't an installed npm Capacitor package, so it's not in
/// capacitor.config.json's auto-registration list — it has to be registered
/// by hand once the bridge exists, which capacitorDidLoad() is for.
class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(WatchBridgePlugin())
        // This is a single-page app — there's no real previous page for
        // WKWebView's built-in edge-swipe "go back" gesture to navigate to.
        // Triggering it (easy to do now that the app itself teaches
        // left/right swipes) drops the page into a blank interactive-pop
        // transition with nothing to show. The app has its own JS-level
        // back gesture (src/lib/gestures.ts) — the native one only fights it.
        webView?.allowsBackForwardNavigationGestures = false
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        let rootViewController = MainViewController()
        // Belt-and-suspenders background for the brief moment before the
        // WebView paints (it's the actual full-bleed root view — see
        // CAPBridgeViewController.loadView, view = webView — contentInset is
        // "never", so there's no separate native gutter to color here
        // anymore). Cream matches the app's majority background so it blends
        // in rather than flashing as a distinct color during that gap.
        let cream = UIColor(red: 0xF5 / 255.0, green: 0xEF / 255.0, blue: 0xE3 / 255.0, alpha: 1.0)
        rootViewController.view.backgroundColor = cream
        window?.backgroundColor = cream
        window?.rootViewController = rootViewController
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
