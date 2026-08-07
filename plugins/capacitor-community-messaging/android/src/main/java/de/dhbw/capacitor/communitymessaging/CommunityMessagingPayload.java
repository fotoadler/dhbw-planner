package de.dhbw.capacitor.communitymessaging;

import android.content.Intent;
import android.os.Bundle;

import com.getcapacitor.JSObject;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

final class CommunityMessagingPayload {
    private CommunityMessagingPayload() {}

    static JSObject fromRemoteMessage(RemoteMessage message) {
        JSObject data = new JSObject();
        for (Map.Entry<String, String> entry : message.getData().entrySet()) {
            data.put(entry.getKey(), entry.getValue());
        }

        JSObject payload = new JSObject();
        payload.put("id", message.getMessageId());
        RemoteMessage.Notification notification = message.getNotification();
        if (notification != null) {
            payload.put("title", notification.getTitle());
            payload.put("body", notification.getBody());
        }
        payload.put("data", data);
        return payload;
    }

    static JSObject fromIntent(Intent intent) {
        if (intent == null) return null;
        Bundle extras = intent.getExtras();
        if (extras == null || !hasCommunityReference(extras)) return null;

        JSObject data = new JSObject();
        for (String key : extras.keySet()) {
            if (isInternalKey(key)) continue;
            Object value = extras.get(key);
            if (value instanceof String || value instanceof Number || value instanceof Boolean) {
                data.put(key, String.valueOf(value));
            }
        }

        JSObject payload = new JSObject();
        payload.put("id", stringValue(extras, "google.message_id", "messageId"));
        payload.put("title", stringValue(extras, "gcm.n.title", "title"));
        payload.put("body", stringValue(extras, "gcm.n.body", "body"));
        payload.put("data", data);
        return payload;
    }

    private static boolean hasCommunityReference(Bundle extras) {
        return extras.containsKey("campaignId")
            || extras.containsKey("contentId")
            || extras.containsKey("revisionId")
            || "community".equals(extras.getString("source"));
    }

    private static boolean isInternalKey(String key) {
        return key.startsWith("google.")
            || key.startsWith("gcm.")
            || "from".equals(key)
            || "collapse_key".equals(key);
    }

    private static String stringValue(Bundle extras, String primary, String fallback) {
        Object value = extras.containsKey(primary) ? extras.get(primary) : extras.get(fallback);
        return value == null ? null : String.valueOf(value);
    }
}
