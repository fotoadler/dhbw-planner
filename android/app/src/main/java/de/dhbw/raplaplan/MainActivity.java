package de.dhbw.raplaplan;

import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import java.net.CookieHandler;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    /**
     * Die Webseite lädt asynchron. Ein einmaliger Push der Insets ginge verloren,
     * wenn er ankommt, bevor die App gerendert hat — deshalb wird der Wert nach
     * jeder Änderung mehrfach nachgereicht. publishSafeAreaInsets() ist idempotent.
     */
    private static final long[] PUBLISH_DELAYS_MS = { 400, 1200, 2500 };

    private final Runnable publishInsets = this::publishSafeAreaInsets;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        disableAutomaticHttpCookies();
        syncSystemBars(getResources().getConfiguration());
        observeSafeAreaInsets();
    }

    /**
     * CapacitorCookies installiert beim Start einen prozessweiten CookieHandler
     * fuer HttpURLConnection. Dualis kann diesen Speicher nicht verwenden: Der
     * Server sendet seinen Sitzungscookie als "cnsc =..." (Leerzeichen vor dem
     * Gleichheitszeichen). Der Android CookieManager bewahrt diese ungueltige
     * Schreibweise auf und haengt sie spaeter zusaetzlich an den vom
     * DualisClient korrekt gesetzten Cookie-Header. CampusNet verwirft die dann
     * mehrdeutige Sitzung.
     *
     * DualisClient verwaltet seine Cookies bewusst selbst im Arbeitsspeicher;
     * alle anderen CapacitorHttp-Aufrufe der App sind zustandslose GETs. Die
     * WebView-Cookies (unter anderem fuer den Mail-Tab) liegen im separaten
     * android.webkit.CookieManager und bleiben hiervon unberuehrt.
     */
    private void disableAutomaticHttpCookies() {
        CookieHandler.setDefault(null);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        syncSystemBars(newConfig);
        scheduleSafeAreaPublish();
    }

    @Override
    public void onResume() {
        super.onResume();
        scheduleSafeAreaPublish();
    }

    private void syncSystemBars(Configuration configuration) {
        boolean dark = (configuration.uiMode & Configuration.UI_MODE_NIGHT_MASK)
                == Configuration.UI_MODE_NIGHT_YES;
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
                getWindow(),
                getWindow().getDecorView()
        );
        controller.setAppearanceLightStatusBars(!dark);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            controller.setAppearanceLightNavigationBars(!dark);
        }
        getWindow().setStatusBarColor(ContextCompat.getColor(this, R.color.app_background));
        getWindow().setNavigationBarColor(ContextCompat.getColor(this, R.color.app_background));
    }

    /**
     * Android-WebViews melden über CSS-env(safe-area-inset-*) nur Display-Cutouts,
     * nicht Status- und Navigationsleiste. Die Leisten überdecken dadurch Kopfzeile
     * und Tab-Beschriftungen. Die tatsächlichen Insets werden deshalb nativ gelesen
     * und als --inset-top/--inset-bottom in die Seite geschrieben; das CSS nimmt
     * jeweils den größeren Wert aus env() und Variable, sodass iOS unverändert bleibt.
     */
    private void observeSafeAreaInsets() {
        WebView webView = webView();
        if (webView == null) return;

        ViewCompat.setOnApplyWindowInsetsListener(webView, (view, insets) -> {
            scheduleSafeAreaPublish();
            return insets;
        });
        webView.addOnLayoutChangeListener(
                (view, l, t, r, b, ol, ot, or, ob) -> scheduleSafeAreaPublish()
        );
        scheduleSafeAreaPublish();
    }

    private void scheduleSafeAreaPublish() {
        WebView webView = webView();
        if (webView == null) return;

        webView.removeCallbacks(publishInsets);
        webView.post(publishInsets);
        for (long delay : PUBLISH_DELAYS_MS) {
            webView.postDelayed(publishInsets, delay);
        }
    }

    private void publishSafeAreaInsets() {
        WebView webView = webView();
        if (webView == null || webView.getHeight() == 0) return;

        WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(webView);
        if (insets == null) return;

        Insets bars = insets.getInsets(
                WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout()
        );

        // Ohne erzwungenes Edge-to-Edge (Android 14 und älter) liegt die WebView
        // bereits innerhalb der Leisten. Übergeben wird deshalb nur der Anteil, den
        // die Leisten die WebView tatsächlich noch überdecken.
        int[] position = new int[2];
        webView.getLocationInWindow(position);
        int gapBelow = Math.max(0, webView.getRootView().getHeight() - (position[1] + webView.getHeight()));
        float top = Math.max(0, bars.top - position[1]);
        float bottom = Math.max(0, bars.bottom - gapBelow);

        float density = getResources().getDisplayMetrics().density;
        String script = String.format(
                Locale.US,
                "document.documentElement.style.setProperty('--inset-top','%.2fpx');"
                        + "document.documentElement.style.setProperty('--inset-bottom','%.2fpx');",
                top / density,
                bottom / density
        );
        webView.evaluateJavascript(script, null);
    }

    private WebView webView() {
        return getBridge() == null ? null : getBridge().getWebView();
    }
}
