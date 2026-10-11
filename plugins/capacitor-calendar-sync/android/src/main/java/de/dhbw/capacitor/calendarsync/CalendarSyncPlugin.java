package de.dhbw.capacitor.calendarsync;

import android.Manifest;
import android.content.ContentProviderOperation;
import android.content.ContentUris;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.provider.CalendarContract.Calendars;
import android.provider.CalendarContract.Events;
import com.getcapacitor.*;
import com.getcapacitor.annotation.*;
import org.json.JSONObject;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "CalendarSync", permissions = {
    @Permission(alias = "calendar", strings = {Manifest.permission.READ_CALENDAR, Manifest.permission.WRITE_CALENDAR})
})
public class CalendarSyncPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private static final String ACCOUNT = "de.dhbw.raplaplan";
    private static final String NAME = "dhbw-planner-owned-v1";
    private static final String PREFIX = "dhbw-planner://calendar/";

    @PluginMethod public void getStatus(PluginCall call) { status(call); }
    private void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", true);
        PermissionState state = getPermissionState("calendar");
        result.put("permission", state == PermissionState.GRANTED ? "granted" : state == PermissionState.DENIED ? "denied" : "prompt");
        call.resolve(result);
    }
    @PluginMethod public void requestAccess(PluginCall call) {
        if (getPermissionState("calendar") == PermissionState.GRANTED) status(call);
        else requestPermissionForAlias("calendar", call, "accessResult");
    }
    @PermissionCallback private void accessResult(PluginCall call) { status(call); }

    private Uri calendarWriter() {
        return Calendars.CONTENT_URI.buildUpon()
            .appendQueryParameter(CalendarContract.CALLER_IS_SYNCADAPTER, "true")
            .appendQueryParameter(Calendars.ACCOUNT_NAME, ACCOUNT)
            .appendQueryParameter(Calendars.ACCOUNT_TYPE, CalendarContract.ACCOUNT_TYPE_LOCAL).build();
    }
    private long ownCalendar() throws Exception {
        try (Cursor cursor = getContext().getContentResolver().query(Calendars.CONTENT_URI,
                new String[]{Calendars._ID}, Calendars.ACCOUNT_NAME + "=? AND " + Calendars.ACCOUNT_TYPE + "=? AND " + Calendars.NAME + "=?",
                new String[]{ACCOUNT, CalendarContract.ACCOUNT_TYPE_LOCAL, NAME}, null)) {
            if (cursor == null) throw new Exception("Kalender konnte nicht gelesen werden.");
            if (cursor.moveToFirst()) return cursor.getLong(0);
        }
        ContentValues values = new ContentValues();
        values.put(Calendars.ACCOUNT_NAME, ACCOUNT);
        values.put(Calendars.ACCOUNT_TYPE, CalendarContract.ACCOUNT_TYPE_LOCAL);
        values.put(Calendars.NAME, NAME);
        values.put(Calendars.CALENDAR_DISPLAY_NAME, "DHBW Planner");
        values.put(Calendars.OWNER_ACCOUNT, ACCOUNT);
        values.put(Calendars.CALENDAR_COLOR, 0xffe2001a);
        values.put(Calendars.CALENDAR_ACCESS_LEVEL, Calendars.CAL_ACCESS_OWNER);
        values.put(Calendars.CALENDAR_TIME_ZONE, "Europe/Berlin");
        values.put(Calendars.VISIBLE, 1);
        values.put(Calendars.SYNC_EVENTS, 1);
        Uri calendar = getContext().getContentResolver().insert(calendarWriter(), values);
        if (calendar == null) throw new Exception("Kalender konnte nicht angelegt werden.");
        return ContentUris.parseId(calendar);
    }

    @PluginMethod public void sync(PluginCall call) {
        if (getPermissionState("calendar") != PermissionState.GRANTED) { call.reject("Kalenderzugriff fehlt."); return; }
        worker.execute(() -> {
            try {
                JSArray payload = call.getArray("events");
                Long rangeStart = call.getLong("rangeStart"), rangeEnd = call.getLong("rangeEnd");
                if (payload == null || rangeStart == null || rangeEnd == null || rangeEnd <= rangeStart) throw new Exception("Ungültiger Kalenderbereich.");
                // Validate the entire snapshot before performing any native writes.
                Map<String, JSONObject> desired = new LinkedHashMap<>();
                for (int i = 0; i < payload.length(); i++) {
                    JSONObject event = payload.getJSONObject(i);
                    String key = event.getString("key");
                    if (!key.matches("[a-f0-9]{64}") || event.getString("title").isEmpty() || event.getLong("end") <= event.getLong("start")) throw new Exception("Ungültiger Termin.");
                    event.getBoolean("allDay"); event.getString("location"); event.getString("notes");
                    desired.put(key, event);
                }
                long calendar = ownCalendar();
                Map<String, Long> existing = new HashMap<>();
                ArrayList<Long> duplicates = new ArrayList<>();
                String selection = Events.CALENDAR_ID + "=? AND " + Events.CUSTOM_APP_PACKAGE + "=? AND " + Events.DELETED + "=0 AND " + Events.DTSTART + ">=? AND " + Events.DTSTART + "<?";
                try (Cursor cursor = getContext().getContentResolver().query(Events.CONTENT_URI,
                        new String[]{Events._ID, Events.CUSTOM_APP_URI}, selection,
                        new String[]{String.valueOf(calendar), getContext().getPackageName(), String.valueOf(rangeStart), String.valueOf(rangeEnd)}, null)) {
                    if (cursor == null) throw new Exception("Termine konnten nicht gelesen werden.");
                    while (cursor.moveToNext()) {
                        String marker = cursor.getString(1);
                        if (marker == null || !marker.startsWith(PREFIX) || !marker.substring(PREFIX.length()).matches("[a-f0-9]{64}")) continue;
                        String key = marker.substring(PREFIX.length());
                        Long old = existing.putIfAbsent(key, cursor.getLong(0));
                        if (old != null) duplicates.add(cursor.getLong(0));
                    }
                }
                ArrayList<ContentProviderOperation> writes = new ArrayList<>();
                for (Map.Entry<String, JSONObject> item : desired.entrySet()) {
                    JSONObject event = item.getValue();
                    ContentValues values = new ContentValues();
                    values.put(Events.CALENDAR_ID, calendar); values.put(Events.TITLE, event.getString("title"));
                    values.put(Events.DTSTART, event.getLong("start")); values.put(Events.DTEND, event.getLong("end"));
                    values.put(Events.ALL_DAY, event.getBoolean("allDay") ? 1 : 0);
                    values.put(Events.EVENT_TIMEZONE, event.getBoolean("allDay") ? "UTC" : "Europe/Berlin");
                    values.put(Events.EVENT_LOCATION, event.getString("location")); values.put(Events.DESCRIPTION, event.getString("notes"));
                    values.put(Events.CUSTOM_APP_PACKAGE, getContext().getPackageName()); values.put(Events.CUSTOM_APP_URI, PREFIX + item.getKey());
                    Long id = existing.get(item.getKey());
                    writes.add((id == null ? ContentProviderOperation.newInsert(Events.CONTENT_URI) : ContentProviderOperation.newUpdate(ContentUris.withAppendedId(Events.CONTENT_URI, id))).withValues(values).build());
                    if (writes.size() == 100) { getContext().getContentResolver().applyBatch(CalendarContract.AUTHORITY, writes); writes.clear(); }
                }
                if (!writes.isEmpty()) getContext().getContentResolver().applyBatch(CalendarContract.AUTHORITY, writes);
                // Delete only app-marked events in the confirmed window, after all upserts succeed.
                if (Boolean.TRUE.equals(call.getBoolean("allowDelete", false))) {
                    for (Map.Entry<String, Long> item : existing.entrySet()) if (!desired.containsKey(item.getKey())) duplicates.add(item.getValue());
                    // Use the collection URI for guarded selection; ID URIs reject selection on some providers.
                    for (long id : duplicates) getContext().getContentResolver().delete(Events.CONTENT_URI, Events._ID + "=? AND " + Events.CALENDAR_ID + "=? AND " + Events.CUSTOM_APP_PACKAGE + "=?", new String[]{String.valueOf(id), String.valueOf(calendar), getContext().getPackageName()});
                }
                JSObject result = new JSObject(); result.put("count", desired.size()); call.resolve(result);
            } catch (Exception error) { call.reject("Kalender konnte nicht synchronisiert werden.", error); }
        });
    }
    @Override protected void handleOnDestroy() { worker.shutdown(); super.handleOnDestroy(); }
}
