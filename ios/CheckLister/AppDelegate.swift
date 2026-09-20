import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    return true
  }

}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard
      let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window

    let launchOptions = connectionOptions.urlContexts.first.map {
      [UIApplication.LaunchOptionsKey.url: $0.url]
    }
    factory.startReactNative(
      withModuleName: "CheckLister",
      in: window,
      launchOptions: launchOptions
    )
  }

  func scene(_ scene: UIScene, openURLContexts urlContexts: Set<UIOpenURLContext>) {
    ExternalRunLinking.receive(urlContexts.map(\.url))
  }
}

@objc(ExternalRunLinking)
class ExternalRunLinking: NSObject {
  private static var isActive = false
  private static var pendingURLs: [URL] = []

  @objc
  var methodQueue: DispatchQueue {
    DispatchQueue.main
  }

  static func receive(_ urls: [URL]) {
    dispatchPrecondition(condition: .onQueue(.main))
    guard isActive else {
      pendingURLs.append(contentsOf: urls)
      return
    }

    urls.forEach(deliver)
  }

  private static func deliver(_ url: URL) {
    RCTLinkingManager.application(
      UIApplication.shared,
      open: url,
      options: [:]
    )
  }

  @objc(activate:rejecter:)
  func activate(
    _ resolve: RCTPromiseResolveBlock,
    rejecter _: RCTPromiseRejectBlock
  ) {
    ExternalRunLinking.isActive = true
    let urls = ExternalRunLinking.pendingURLs.map(\.absoluteString)
    ExternalRunLinking.pendingURLs.removeAll()
    resolve(urls)
  }

  @objc
  func deactivate() {
    ExternalRunLinking.isActive = false
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
