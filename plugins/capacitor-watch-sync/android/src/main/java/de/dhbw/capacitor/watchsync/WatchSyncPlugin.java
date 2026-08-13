package de.dhbw.capacitor.watchsync;

import android.content.Context;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.ConnectionResult;
import com.google.android.gms.common.GoogleApiAvailability;
import com.google.android.gms.wearable.CapabilityClient;
import com.google.android.gms.wearable.CapabilityInfo;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

@CapacitorPlugin(name = "WatchSync")
public class WatchSyncPlugin extends Plugin {
    private static final String DATA_PATH = "/dhbw-planner/schedule";
    private static final String SNAPSHOT_KEY = "snapshot";
    private static final String CAPABILITY = "dhbw_planner_wear";

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("platform", "android");

        if (!googlePlayServicesAvailable()) {
            result.put("available", false);
            result.put("watchInstalled", false);
            result.put("reason", "Google Play services for Wear OS are unavailable.");
            call.resolve(result);
            return;
        }

        Wearable.getCapabilityClient(getContext())
            .getCapability(CAPABILITY, CapabilityClient.FILTER_REACHABLE)
            .addOnSuccessListener(info -> resolveAvailability(call, info))
            .addOnFailureListener(error -> {
                result.put("available", true);
                result.put("watchInstalled", false);
                result.put("reason", "The Wear OS capability could not be queried.");
                call.resolve(result);
            });
    }

    @PluginMethod
    public void sync(PluginCall call) {
        String snapshot = call.getString(SNAPSHOT_KEY);
        if (snapshot == null || snapshot.trim().isEmpty()) {
            call.reject("Missing snapshot");
            return;
        }

        if (!googlePlayServicesAvailable()) {
            call.resolve(new JSObject().put("queued", false));
            return;
        }

        PutDataMapRequest request = PutDataMapRequest.create(DATA_PATH);
        request.getDataMap().putString(SNAPSHOT_KEY, snapshot);
        request.getDataMap().putLong("updatedAt", System.currentTimeMillis());
        PutDataRequest dataRequest = request.asPutDataRequest();
        dataRequest.setUrgent();

        Wearable.getDataClient(getContext())
            .putDataItem(dataRequest)
            .addOnSuccessListener(item -> call.resolve(new JSObject().put("queued", true)))
            .addOnFailureListener(error -> call.reject("Unable to sync the schedule to Wear OS", error));
    }

    private boolean googlePlayServicesAvailable() {
        Context context = getContext();
        return GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS;
    }

    private void resolveAvailability(@NonNull PluginCall call, @NonNull CapabilityInfo info) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("watchInstalled", !info.getNodes().isEmpty());
        call.resolve(result);
    }
}
