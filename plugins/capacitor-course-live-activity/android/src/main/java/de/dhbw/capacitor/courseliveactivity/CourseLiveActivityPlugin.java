package de.dhbw.capacitor.courseliveactivity;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "CourseLiveActivity")
public class CourseLiveActivityPlugin extends Plugin {
    private static final String CHANNEL_ID = "course_live_activity";
    private static final String PREFS = "course_live_activity";
    private static final String ACTIVE_IDS = "active_ids";
    private static final int REQUEST_CODE = 48170;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", notificationsAllowed());
        result.put("platform", "android");
        if (!notificationsAllowed()) {
            result.put("reason", "Notifications are not allowed.");
        }
        call.resolve(result);
    }

    @PluginMethod
    public void start(PluginCall call) {
        post(call);
    }

    @PluginMethod
    public void update(PluginCall call) {
        post(call);
    }

    @PluginMethod
    public void end(PluginCall call) {
        String id = call.getString("id");
        if (id == null || id.trim().isEmpty()) {
            call.reject("Missing id");
            return;
        }
        NotificationManagerCompat.from(getContext()).cancel(notificationId(id));
        removeActiveId(id);
        call.resolve();
    }

    @PluginMethod
    public void endAll(PluginCall call) {
        for (String id : getActiveIds()) {
            NotificationManagerCompat.from(getContext()).cancel(notificationId(id));
        }
        saveActiveIds(new HashSet<>());
        call.resolve();
    }

    private void post(PluginCall call) {
        String id = call.getString("id");
        String title = call.getString("title");
        Long startTime = call.getLong("startTime");
        Long endTime = call.getLong("endTime");

        if (id == null || id.trim().isEmpty() || title == null || title.trim().isEmpty() || startTime == null || endTime == null) {
            call.reject("Missing id, title, startTime or endTime");
            return;
        }

        if (!notificationsAllowed()) {
            call.reject("Notifications are not allowed.");
            return;
        }

        createChannel();

        String room = call.getString("room", "");
        String lecturer = call.getString("lecturer", "");
        String nextTitle = call.getString("nextTitle", "");
        Long nextStartTime = call.getLong("nextStartTime");
        long now = System.currentTimeMillis();
        int progress = progress(startTime, endTime, now);

        Intent launchIntent = getContext().getPackageManager().getLaunchIntentForPackage(getContext().getPackageName());
        PendingIntent contentIntent = null;
        if (launchIntent != null) {
            launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            contentIntent = PendingIntent.getActivity(
                getContext(),
                REQUEST_CODE,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );
        }

        String timeLeft = remainingLabel(endTime - now);
        String content = joinNonEmpty(room, lecturer, timeLeft);
        String bigText = content;
        if (!nextTitle.isEmpty() && nextStartTime != null) {
            bigText = bigText + "\nDanach: " + formatTime(nextStartTime) + " " + nextTitle;
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(getContext(), CHANNEL_ID)
            .setSmallIcon(resolveSmallIcon())
            .setContentTitle(title)
            .setContentText(content)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(true)
            .setWhen(endTime)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .setProgress(100, progress, false)
            .setCategory(NotificationCompat.CATEGORY_STATUS)
            .setPriority(NotificationCompat.PRIORITY_HIGH);

        if (contentIntent != null) {
            builder.setContentIntent(contentIntent);
        }

        builder.getExtras().putBoolean("android.requestPromotedOngoing", true);
        Notification notification = builder.build();
        notification.flags |= Notification.FLAG_ONGOING_EVENT;

        NotificationManagerCompat.from(getContext()).notify(notificationId(id), notification);
        addActiveId(id);
        call.resolve();
    }

    private boolean notificationsAllowed() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(getContext(), Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = new NotificationChannel(
            CHANNEL_ID,
            "Live-Vorlesung",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Laufende Vorlesung mit Restzeit");
        channel.setSound(null, null);
        channel.enableVibration(false);
        manager.createNotificationChannel(channel);
    }

    private int resolveSmallIcon() {
        int id = getContext().getResources().getIdentifier("ic_stat_notify", "drawable", getContext().getPackageName());
        if (id != 0) return id;
        return getContext().getApplicationInfo().icon;
    }

    private int notificationId(String id) {
        return 300_000_000 + Math.abs(id.hashCode() % 100_000_000);
    }

    private int progress(long startTime, long endTime, long now) {
        if (endTime <= startTime) return 0;
        double value = (double) (now - startTime) / (double) (endTime - startTime);
        return Math.max(0, Math.min(100, (int) Math.round(value * 100)));
    }

    private String remainingLabel(long remainingMs) {
        long minutes = Math.max(0, (long) Math.ceil(remainingMs / 60_000.0));
        if (minutes <= 1) return "endet gleich";
        return "noch " + minutes + " min";
    }

    private String formatTime(long timestamp) {
        java.text.SimpleDateFormat format = new java.text.SimpleDateFormat("HH:mm", java.util.Locale.GERMANY);
        format.setTimeZone(java.util.TimeZone.getTimeZone("Europe/Berlin"));
        return format.format(new java.util.Date(timestamp));
    }

    private String joinNonEmpty(String... values) {
        StringBuilder builder = new StringBuilder();
        for (String value : values) {
            if (value == null || value.trim().isEmpty()) continue;
            if (builder.length() > 0) builder.append(" · ");
            builder.append(value.trim());
        }
        return builder.toString();
    }

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private Set<String> getActiveIds() {
        return new HashSet<>(prefs().getStringSet(ACTIVE_IDS, new HashSet<>()));
    }

    private void saveActiveIds(Set<String> ids) {
        prefs().edit().putStringSet(ACTIVE_IDS, ids).apply();
    }

    private void addActiveId(String id) {
        Set<String> ids = getActiveIds();
        ids.add(id);
        saveActiveIds(ids);
    }

    private void removeActiveId(String id) {
        Set<String> ids = getActiveIds();
        ids.remove(id);
        saveActiveIds(ids);
    }
}
