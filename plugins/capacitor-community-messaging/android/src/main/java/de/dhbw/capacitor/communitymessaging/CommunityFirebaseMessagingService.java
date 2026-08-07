package de.dhbw.capacitor.communitymessaging;

import android.content.Intent;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class CommunityFirebaseMessagingService extends FirebaseMessagingService {
    static final String ACTION_EVENT = "de.dhbw.capacitor.communitymessaging.EVENT";
    static final String EXTRA_EVENT = "event";
    static final String EXTRA_PAYLOAD = "payload";
    static final String EVENT_TOKEN = "tokenReceived";
    static final String EVENT_NOTIFICATION = "notificationReceived";

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        getSharedPreferences(CommunityMessagingPlugin.PREFERENCES, MODE_PRIVATE)
            .edit()
            .putString(CommunityMessagingPlugin.CURRENT_TOKEN, token)
            .apply();
        broadcast(EVENT_TOKEN, token);
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        super.onMessageReceived(message);
        broadcast(EVENT_NOTIFICATION, CommunityMessagingPayload.fromRemoteMessage(message).toString());
    }

    private void broadcast(String event, String payload) {
        Intent intent = new Intent(ACTION_EVENT)
            .setPackage(getPackageName())
            .putExtra(EXTRA_EVENT, event)
            .putExtra(EXTRA_PAYLOAD, payload);
        sendBroadcast(intent);
    }
}
