import UIKit
import React

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
