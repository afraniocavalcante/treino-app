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
        // it), so CSS can't reach it. Navy matches the bottom tab bar, so the
        // app reads as navy-framed top and bottom with the cream content
        // in between, rather than a mismatched plain white bar.
        let navy = UIColor(red: 0x0D / 255.0, green: 0x1B / 255.0, blue: 0x2A / 255.0, alpha: 1.0)
        rootViewController.view.backgroundColor = navy
        window?.backgroundColor = navy
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
