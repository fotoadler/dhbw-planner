package de.dhbw.capacitor.courseliveactivity;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import java.util.HashSet;
import java.util.Set;

public final class CourseLiveActivityDismissedReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String id = intent.getStringExtra(CourseLiveActivityPlugin.EXTRA_ACTIVITY_ID);
        if (id == null || id.trim().isEmpty()) return;

        SharedPreferences preferences =
            context.getSharedPreferences(CourseLiveActivityPlugin.PREFS, Context.MODE_PRIVATE);
        Set<String> activeIds = new HashSet<>(preferences.getStringSet(
            CourseLiveActivityPlugin.ACTIVE_IDS,
            new HashSet<>()
        ));
        activeIds.remove(id);
        preferences.edit()
            .putString(CourseLiveActivityPlugin.DISMISSED_ID, id)
            .putStringSet(CourseLiveActivityPlugin.ACTIVE_IDS, activeIds)
            .apply();
    }
}
