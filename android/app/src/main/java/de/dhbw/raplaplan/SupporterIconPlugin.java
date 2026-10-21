package de.dhbw.raplaplan;

import android.content.ComponentName;
import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SupporterIcon")
public class SupporterIconPlugin extends Plugin {
    private ComponentName launcher(boolean gold) {
        return new ComponentName(getContext(), getContext().getPackageName() + (gold ? ".GoldLauncher" : ".DefaultLauncher"));
    }

    @PluginMethod
    public void getIcon(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        result.put("gold", getContext().getPackageManager().getComponentEnabledSetting(launcher(true)) == PackageManager.COMPONENT_ENABLED_STATE_ENABLED);
        call.resolve(result);
    }

    @PluginMethod
    public void setIcon(PluginCall call) {
        boolean gold = Boolean.TRUE.equals(call.getBoolean("gold", false));
        try {
            PackageManager pm = getContext().getPackageManager();
            // Enable the replacement first so a launcher always remains available.
            pm.setComponentEnabledSetting(launcher(gold), PackageManager.COMPONENT_ENABLED_STATE_ENABLED, PackageManager.DONT_KILL_APP);
            pm.setComponentEnabledSetting(launcher(!gold), PackageManager.COMPONENT_ENABLED_STATE_DISABLED, PackageManager.DONT_KILL_APP);
            call.resolve();
        } catch (Exception error) {
            call.reject("Das App-Symbol konnte nicht geändert werden.", error);
        }
    }
}
