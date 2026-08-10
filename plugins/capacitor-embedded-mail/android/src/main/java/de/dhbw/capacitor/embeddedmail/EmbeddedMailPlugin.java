package de.dhbw.capacitor.embeddedmail;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EmbeddedMail")
public class EmbeddedMailPlugin extends Plugin {
    private static final int DEFAULT_BOTTOM_INSET_DP = 58;

    private WebView mailWebView;
    private int bottomInsetDp = DEFAULT_BOTTOM_INSET_DP;

    @PluginMethod
    public void open(PluginCall call) {
        String rawUrl = call.getString("url");
        if (rawUrl == null || rawUrl.trim().isEmpty()) {
            call.reject("Missing mail URL");
            return;
        }

        Double requestedInset = call.getDouble("bottomInset");
        if (requestedInset != null && requestedInset >= 0) {
            bottomInsetDp = requestedInset.intValue();
        }

        getActivity().runOnUiThread(() -> {
            ViewGroup host = hostView();
            if (host == null) {
                call.reject("Unable to attach embedded mail view");
                return;
            }

            if (mailWebView == null) {
                mailWebView = createWebView();
            }

            if (mailWebView.getParent() != host) {
                if (mailWebView.getParent() instanceof ViewGroup) {
                    ((ViewGroup) mailWebView.getParent()).removeView(mailWebView);
                }
                host.addView(mailWebView);
            }

            positionWebView(host);
            mailWebView.loadUrl(rawUrl);
            call.resolve();
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (mailWebView != null && mailWebView.getParent() instanceof ViewGroup) {
                ((ViewGroup) mailWebView.getParent()).removeView(mailWebView);
            }
            // WebView schreibt Cookies asynchron. Android dokumentiert flush()
            // als explizite Sicherung in den persistenten Cookie-Speicher.
            flushCookies();
            call.resolve();
        });
    }

    @Override
    protected void handleOnPause() {
        flushCookies();
        super.handleOnPause();
    }

    @Override
    protected void handleOnDestroy() {
        flushCookies();
        if (mailWebView != null) {
            mailWebView.stopLoading();
            mailWebView.destroy();
            mailWebView = null;
        }
        super.handleOnDestroy();
    }

    private void flushCookies() {
        CookieManager.getInstance().flush();
    }

    private WebView createWebView() {
        WebView view = new WebView(getContext());
        view.setBackgroundColor(Color.WHITE);
        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, String url) {
                return false;
            }
        });
        view.setWebChromeClient(new WebChromeClient());

        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(view, true);
        return view;
    }

    private ViewGroup hostView() {
        if (getBridge() == null || getBridge().getWebView() == null) return null;
        if (getBridge().getWebView().getParent() instanceof ViewGroup) {
            return (ViewGroup) getBridge().getWebView().getParent();
        }
        return null;
    }

    private void positionWebView(ViewGroup host) {
        int statusInset = 0;
        int navigationInset = 0;
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(host);
        if (insets != null) {
            statusInset = insets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            ).top;
            navigationInset = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        }

        CoordinatorLayout.LayoutParams params = new CoordinatorLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        );
        // Die Mail-WebView liegt als native View über der Capacitor-WebView und
        // erbt deshalb nicht deren CSS-safe-area-inset-top.
        params.topMargin = statusInset;
        params.bottomMargin = dpToPx(bottomInsetDp) + navigationInset;
        mailWebView.setLayoutParams(params);
        mailWebView.bringToFront();
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getContext().getResources().getDisplayMetrics().density);
    }
}
