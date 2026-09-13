import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        let rootViewController = CAPBridgeViewController()
        // Colors the native strip behind the status bar/Dynamic Island — that
        // area sits outside the WebView (Capacitor insets the WebView below
        // it), so CSS can't reach it. Cream matches the app's majority
        // background (every screen except login) so it blends in rather than
        // reading as a distinct bar; only the bottom tab bar is navy.
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
