package de.dhbw.capacitor.appreview;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.play.core.review.ReviewInfo;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;

@CapacitorPlugin(name = "AppReview")
public class AppReviewPlugin extends Plugin {
    private ReviewManager manager;
    private ReviewInfo info;

    @PluginMethod
    public void prepare(PluginCall call) {
        manager = ReviewManagerFactory.create(getContext());
        manager.requestReviewFlow().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) { call.reject("Review unavailable"); return; }
            info = task.getResult();
            call.resolve();
        });
    }

    @PluginMethod
    public void requestReview(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (info == null || getActivity().isFinishing() ||
                !getActivity().getWindow().getDecorView().hasWindowFocus()) {
                call.reject("No prepared review or foreground activity"); return;
            }
            ReviewInfo prepared = info;
            info = null;
            manager.launchReviewFlow(getActivity(), prepared).addOnCompleteListener(task -> {
                // Completion does not imply that a dialog appeared or a rating was submitted.
                call.resolve();
            });
        });
    }
}
