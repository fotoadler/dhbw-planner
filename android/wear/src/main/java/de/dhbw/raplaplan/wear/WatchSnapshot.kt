package de.dhbw.raplaplan.wear

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

data class WatchEntry(
    val id: String,
    val title: String,
    val startTime: Long,
    val endTime: Long,
    val room: String,
    val lecturer: String,
    val extra: String,
    val type: String,
)

data class WatchSnapshot(
    val updatedAt: Long,
    val currentEntry: WatchEntry?,
    val nextEntry: WatchEntry?,
    val todayEntries: List<WatchEntry>,
)

object WatchSnapshotStore {
    private const val preferences = "watch_schedule"
    private const val snapshotKey = "snapshot"

    fun save(context: Context, raw: String) {
        context.getSharedPreferences(preferences, Context.MODE_PRIVATE)
            .edit()
            .putString(snapshotKey, raw)
            .apply()
    }

    fun load(context: Context): WatchSnapshot? {
        val raw = context.getSharedPreferences(preferences, Context.MODE_PRIVATE)
            .getString(snapshotKey, null)
            ?: return null
        return runCatching { parse(raw) }.getOrNull()
    }

    private fun parse(raw: String): WatchSnapshot {
        val root = JSONObject(raw)
        return WatchSnapshot(
            updatedAt = root.optLong("updatedAt"),
            currentEntry = root.optJSONObject("currentEntry")?.toEntry(),
            nextEntry = root.optJSONObject("nextEntry")?.toEntry(),
            todayEntries = root.optJSONArray("todayEntries").toEntries(),
        )
    }

    private fun JSONObject.toEntry(): WatchEntry = WatchEntry(
        id = optString("id"),
        title = optString("title"),
        startTime = optLong("startTime"),
        endTime = optLong("endTime"),
        room = optString("room"),
        lecturer = optString("lecturer"),
        extra = optString("extra"),
        type = optString("type"),
    )

    private fun JSONArray?.toEntries(): List<WatchEntry> {
        if (this == null) return emptyList()
        return buildList(length()) {
            for (index in 0 until length()) {
                optJSONObject(index)?.let { add(it.toEntry()) }
            }
        }
    }
}
