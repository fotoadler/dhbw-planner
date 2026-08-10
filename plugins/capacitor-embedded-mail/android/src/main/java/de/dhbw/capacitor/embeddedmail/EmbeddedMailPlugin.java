package de.dhbw.capacitor.embeddedmail;

import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
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

    /**
     * Sicherheitsnetz: Bleibt das erste Zeichnen aus — etwa weil die Anmeldeseite
     * hängt — wird die WebView trotzdem eingeblendet. Sonst bliebe der Ladehinweis
     * der App stehen, obwohl die Seite vielleicht längst eine Meldung anzeigt.
     */
    private static final long REVEAL_TIMEOUT_MS = 8000;

    private WebView mailWebView;
    private int bottomInsetDp = DEFAULT_BOTTOM_INSET_DP;

    private final Runnable revealTimeout = this::revealWebView;

    private final View.OnLayoutChangeListener hostLayoutListener = (
        view, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom
    ) -> {
        if (view instanceof ViewGroup) positionWebView((ViewGroup) view);
    };

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

            // Rotation, Split-Screen oder eine eingeblendete Tastatur ändern die
            // Insets, ohne die WebView neu zu öffnen. positionWebView() bricht bei
            // unveränderten Rändern ab und löst deshalb keine Layout-Schleife aus.
            host.removeOnLayoutChangeListener(hostLayoutListener);
            host.addOnLayoutChangeListener(hostLayoutListener);

            positionWebView(host);
            mailWebView.bringToFront();

            // Bis zum ersten Zeichnen bliebe die WebView weiß und würde den
            // Ladehinweis der App verdecken — sie bleibt deshalb unsichtbar.
            hideWebView();
            mailWebView.loadUrl(rawUrl);
            call.resolve();
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (mailWebView != null) {
                mailWebView.removeCallbacks(revealTimeout);
                if (mailWebView.getParent() instanceof ViewGroup) {
                    ViewGroup host = (ViewGroup) mailWebView.getParent();
                    host.removeOnLayoutChangeListener(hostLayoutListener);
                    host.removeView(mailWebView);
                }
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
            mailWebView.removeCallbacks(revealTimeout);
            if (mailWebView.getParent() instanceof ViewGroup) {
                ((ViewGroup) mailWebView.getParent()).removeOnLayoutChangeListener(hostLayoutListener);
            }
            mailWebView.stopLoading();
            mailWebView.destroy();
            mailWebView = null;
        }
        super.handleOnDestroy();
    }

    private void flushCookies() {
        CookieManager.getInstance().flush();
    }

    private void hideWebView() {
        if (mailWebView == null) return;
        mailWebView.setVisibility(View.INVISIBLE);
        mailWebView.removeCallbacks(revealTimeout);
        mailWebView.postDelayed(revealTimeout, REVEAL_TIMEOUT_MS);
    }

    private void revealWebView() {
        if (mailWebView == null) return;
        mailWebView.removeCallbacks(revealTimeout);
        if (mailWebView.getVisibility() != View.VISIBLE) {
            mailWebView.setVisibility(View.VISIBLE);
        }
    }

    private WebView createWebView() {
        WebView view = new WebView(getContext());
        view.setBackgroundColor(Color.WHITE);
        view.setVisibility(View.INVISIBLE);
        view.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, WebResourceRequest request) {
                return false;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView webView, String url) {
                return false;
            }

            // Bewusst onPageFinished statt onPageCommitVisible: Letzteres meldet
            // schon den ersten Frame, und der ist bei den Webmail-Anmeldeseiten
            // noch leer — die WebView wurde dadurch weiß sichtbar, also genau der
            // Zustand, den der Ladehinweis ersetzen soll. Der Fehlerfall und die
            // Zeitgrenze sind Rückfallebenen, damit nichts unsichtbar hängt.
            @Override
            public void onPageFinished(WebView webView, String url) {
                revealWebView();
            }

            @Override
            public void onReceivedError(
                WebView webView,
                WebResourceRequest request,
                WebResourceError error
            ) {
                if (request.isForMainFrame()) revealWebView();
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
        if (mailWebView == null) return;

        int statusInset = 0;
        int navigationInset = 0;
        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(host);
        if (insets != null) {
            statusInset = insets.getInsets(
                WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout()
            ).top;
            navigationInset = insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom;
        }

        // Die Mail-WebView liegt als native View über der Capacitor-WebView und
        // erbt deshalb nicht deren CSS-safe-area-insets.
        //
        // getRootWindowInsets() meldet die Insets des Fensters unabhängig davon, ob
        // das DecorView sie bereits verrechnet hat. Erzwungenes Edge-to-Edge gilt
        // aber erst ab Android 15; auf älteren Systemen beginnt der Host bereits
        // unterhalb der Statusleiste und endet oberhalb der Navigationsleiste. Ein
        // ungeprüfter Rand wäre dort ein zweiter, sichtbarer Abstand. Deshalb wird
        // nur der Anteil ergänzt, den der Host tatsächlich noch überdeckt.
        int[] hostPosition = new int[2];
        host.getLocationInWindow(hostPosition);
        int gapAboveHost = hostPosition[1];
        int gapBelowHost = Math.max(0, host.getRootView().getHeight() - (hostPosition[1] + host.getHeight()));

        int topMargin = Math.max(0, statusInset - gapAboveHost);
        int bottomMargin = dpToPx(bottomInsetDp) + Math.max(0, navigationInset - gapBelowHost);

        ViewGroup.LayoutParams current = mailWebView.getLayoutParams();
        if (current instanceof CoordinatorLayout.LayoutParams) {
            CoordinatorLayout.LayoutParams existing = (CoordinatorLayout.LayoutParams) current;
            if (existing.topMargin == topMargin && existing.bottomMargin == bottomMargin) return;
        }

        CoordinatorLayout.LayoutParams params = new CoordinatorLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        );
        params.topMargin = topMargin;
        params.bottomMargin = bottomMargin;
        mailWebView.setLayoutParams(params);
    }

    private int dpToPx(int dp) {
        return Math.round(dp * getContext().getResources().getDisplayMetrics().density);
    }
}
