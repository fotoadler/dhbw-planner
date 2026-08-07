import Capacitor
import UIKit
import WebKit

@objc(EmbeddedMailPlugin)
public class EmbeddedMailPlugin: CAPPlugin, CAPBridgedPlugin, WKNavigationDelegate, WKUIDelegate {
    public let identifier = "EmbeddedMailPlugin"
    public let jsName = "EmbeddedMail"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "open", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "close", returnType: CAPPluginReturnPromise)
    ]

    private var mailWebView: WKWebView?
    private var bottomInset: CGFloat = 58

    @objc func open(_ call: CAPPluginCall) {
        guard
            let rawURL = call.getString("url"),
            let url = URL(string: rawURL)
        else {
            call.reject("Missing mail URL")
            return
        }

        if let requestedInset = call.getDouble("bottomInset"), requestedInset >= 0 {
            bottomInset = CGFloat(requestedInset)
        }

        DispatchQueue.main.async {
            guard let host = self.bridge?.viewController?.view else {
                call.reject("Unable to attach embedded mail view")
                return
            }

            if self.mailWebView == nil {
                let configuration = WKWebViewConfiguration()
                // .default() persists cookies and website data across WebView
                // instances and complete app restarts. Never use .nonPersistent().
                configuration.websiteDataStore = .default()
                let webView = WKWebView(frame: .zero, configuration: configuration)
                webView.navigationDelegate = self
                webView.uiDelegate = self
                webView.allowsBackForwardNavigationGestures = true
                webView.backgroundColor = .white
                webView.isOpaque = true
                self.mailWebView = webView
            }

            guard let webView = self.mailWebView else {
                call.reject("Unable to create embedded mail view")
                return
            }

            if webView.superview !== host {
                webView.removeFromSuperview()
                host.addSubview(webView)
            }
            self.position(webView, in: host)
            webView.load(URLRequest(url: url))
            call.resolve()
        }
    }

    @objc func close(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.mailWebView?.removeFromSuperview()
            call.resolve()
        }
    }

    deinit {
        mailWebView?.stopLoading()
        mailWebView?.navigationDelegate = nil
        mailWebView?.uiDelegate = nil
    }

    private func position(_ webView: WKWebView, in host: UIView) {
        let safeTop = host.safeAreaInsets.top
        let safeBottom = host.safeAreaInsets.bottom
        let height = max(0, host.bounds.height - safeTop - safeBottom - bottomInset)
        webView.frame = CGRect(x: 0, y: safeTop, width: host.bounds.width, height: height)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        host.bringSubviewToFront(webView)
    }

    public func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if navigationAction.targetFrame == nil {
            webView.load(navigationAction.request)
        }
        return nil
    }
}
