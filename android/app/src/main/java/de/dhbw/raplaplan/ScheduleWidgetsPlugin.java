package de.dhbw.raplaplan;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;

@CapacitorPlugin(name = "ScheduleWidgets")
public class ScheduleWidgetsPlugin extends Plugin {
    @PluginMethod public void update(PluginCall call) {
        String json = call.getString("snapshot");
        try {
            if (json == null || json.length() > 524288 || new JSONObject(json).optInt("version") != 1) {
                call.reject("Invalid widget snapshot"); return;
            }
            android.content.SharedPreferences prefs = getContext().getSharedPreferences("schedule_widgets", 0);
            if (!json.equals(prefs.getString("schedule.v1", ""))) {
                if (!prefs.edit().putString("schedule.v1", json).commit()) { call.reject("Widget snapshot could not be saved"); return; }
                ScheduleWidgetProvider.updateAll(getContext());
            }
            call.resolve();
        } catch (Exception error) { call.reject("Widget update failed", error); }
    }
}
