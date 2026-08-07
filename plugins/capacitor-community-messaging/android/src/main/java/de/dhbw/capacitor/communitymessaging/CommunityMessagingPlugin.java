package de.dhbw.capacitor.communitymessaging;

import android.Manifest;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;

import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

import org.json.JSONException;
import org.json.JSONObject;

@CapacitorPlugin(
    name = "CommunityMessaging",
    permissions = @Permission(
        strings = { Manifest.permission.POST_NOTIFICATIONS },
        alias = CommunityMessagingPlugin.NOTIFICATIONS
    )
)
public class CommunityMessagingPlugin extends Plugin {
    static final String PREFERENCES = "dhbw_community_messaging";
    static final String CURRENT_TOKEN = "current_fcm_token";
    static final String NOTIFICATIONS = "receive";

    private JSObject initialNotification;
    private final BroadcastReceiver receiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String event = intent.getStringExtra(CommunityFirebaseMessagingService.EXTRA_EVENT);
            String payload = intent.getStringExtra(CommunityFirebaseMessagingService.EXTRA_PAYLOAD);
            if (CommunityFirebaseMessagingService.EVENT_TOKEN.equals(event) && payload != null) {
                notifyListeners("tokenReceived", new JSObject().put("token", payload), true);
            } else if (CommunityFirebaseMessagingService.EVENT_NOTIFICATION.equals(event) && payload != null) {
                try {
                    notifyListeners("notificationReceived", new JSObject(payload), true);
                } catch (JSONException ignored) {
                    // Malformed internal broadcasts are ignored instead of reaching JavaScript.
                }
            }
        }
    };

    @Override
    public void load() {
        super.load();
        initialNotification = CommunityMessagingPayload.fromIntent(getActivity().getIntent());
        ContextCompat.registerReceiver(
            getContext(),
            receiver,
            new IntentFilter(CommunityFirebaseMessagingService.ACTION_EVENT),
            ContextCompat.RECEIVER_NOT_EXPORTED
        );
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        JSObject notification = CommunityMessagingPayload.fromIntent(intent);
        if (notification != null) notifyAction(notification);
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(receiver);
        } catch (IllegalArgumentException ignored) {
            // The receiver was already removed with the bridge.
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        call.resolve(permissionResult());
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(NOTIFICATIONS) == PermissionState.GRANTED) {
            call.resolve(permissionResult());
            return;
        }
        requestPermissionForAlias(NOTIFICATIONS, call, "permissionCallback");
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        call.resolve(permissionResult());
    }

    @PluginMethod
    public void register(PluginCall call) {
        if (firebaseConfigured()) FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        fetchToken(call, true);
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        fetchToken(call, false);
    }

    @PluginMethod
    public void deleteToken(PluginCall call) {
        if (!firebaseConfigured()) {
            call.reject("Firebase Messaging is not configured for this Android build");
            return;
        }
        FirebaseMessaging.getInstance().deleteToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful()) {
                call.reject("Unable to delete Firebase Messaging token", task.getException());
                return;
            }
            getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .remove(CURRENT_TOKEN)
                .apply();
            FirebaseMessaging.getInstance().setAutoInitEnabled(false);
            call.resolve();
        });
    }

    @PluginMethod
    public void getInitialNotification(PluginCall call) {
        JSObject result = new JSObject();
        result.put("notification", initialNotification == null ? JSONObject.NULL : initialNotification);
        initialNotification = null;
        call.resolve(result);
    }

    private void fetchToken(PluginCall call, boolean emit) {
        if (!firebaseConfigured()) {
            call.reject("Firebase Messaging is not configured for this Android build");
            return;
        }
        FirebaseMessaging.getInstance().getToken().addOnCompleteListener(task -> {
            if (!task.isSuccessful() || task.getResult() == null) {
                call.reject("Unable to obtain Firebase Messaging token", task.getException());
                return;
            }
            String token = task.getResult();
            getContext().getSharedPreferences(PREFERENCES, Context.MODE_PRIVATE)
                .edit()
                .putString(CURRENT_TOKEN, token)
                .apply();
            if (emit) notifyListeners("tokenReceived", new JSObject().put("token", token), true);
            call.resolve(new JSObject().put("token", token));
        });
    }

    private boolean firebaseConfigured() {
        return !FirebaseApp.getApps(getContext()).isEmpty();
    }

    private JSObject permissionResult() {
        String state;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            PermissionState permission = getPermissionState(NOTIFICATIONS);
            if (permission == PermissionState.PROMPT || permission == PermissionState.PROMPT_WITH_RATIONALE) {
                state = "prompt";
            } else if (permission == PermissionState.GRANTED
                && NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) {
                state = "granted";
            } else {
                state = "denied";
            }
        } else {
            state = NotificationManagerCompat.from(getContext()).areNotificationsEnabled() ? "granted" : "denied";
        }
        return new JSObject().put("receive", state);
    }

    private void notifyAction(JSObject notification) {
        JSObject result = new JSObject();
        result.put("notification", notification);
        result.put("actionId", "tap");
        notifyListeners("notificationActionPerformed", result, true);
    }
}
