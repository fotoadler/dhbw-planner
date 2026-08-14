package de.dhbw.raplaplan.wear

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class WatchEntry(
    val id: String,
    val title: String,
    val startTime: Long,
    val endTime: Long,
    val room: String,
    val lecturer: String,
    val extra: String,
    val type: String,
    val day: String,
)

data class WatchSnapshot(
    val updatedAt: Long,
    val today: String,
    val todayEntries: List<WatchEntry>,
    val upcomingEntries: List<WatchEntry>,
) {
    /** Alle bekannten Termine, dedupliziert und chronologisch. */
    val knownEntries: List<WatchEntry> =
        (todayEntries + upcomingEntries).distinctBy { it.id }.sortedBy { it.startTime }

    /**
     * `currentEntry`/`nextEntry`/`todayEntries` im Snapshot sind nur der Stand des
     * Sync-Zeitpunkts. Zwischen zwei Syncs – und über Mitternacht hinweg erst recht –
     * wäre das falsch, deshalb leitet die Uhr die Werte selbst aus den Zeitstempeln ab.
     */
    fun currentEntry(now: Long = System.currentTimeMillis()): WatchEntry? =
        knownEntries.firstOrNull { it.startTime <= now && it.endTime > now }

    /** Nächster Termin – auch wenn er direkt an den laufenden anschließt. */
    fun nextEntry(now: Long = System.currentTimeMillis()): WatchEntry? {
        val current = currentEntry(now)
        val from = current?.endTime ?: now
        return knownEntries.firstOrNull { it.id != current?.id && it.startTime >= from }
    }

    /** Termine des Kalendertags, in dem `now` liegt. */
    fun entriesForDay(now: Long = System.currentTimeMillis()): List<WatchEntry> {
        val key = berlinDayKey(now)
        return knownEntries.filter { it.day == key }
    }

    /** True, sobald der Snapshot nicht mehr den laufenden Kalendertag abdeckt. */
    fun isOutdated(now: Long = System.currentTimeMillis()): Boolean = berlinDayKey(now) > today
}

private val berlinTimeZone: TimeZone = TimeZone.getTimeZone("Europe/Berlin")

private fun berlinFormat(pattern: String, locale: Locale, timestamp: Long): String =
    SimpleDateFormat(pattern, locale).apply { timeZone = berlinTimeZone }.format(Date(timestamp))

internal fun berlinDayKey(timestamp: Long): String = berlinFormat("yyyy-MM-dd", Locale.US, timestamp)

/** z. B. „09:30“ */
internal fun formatTime(timestamp: Long): String =
    berlinFormat("HH:mm", Locale.GERMANY, timestamp)

/** z. B. „Mo, 6. Juli“ – nötig, sobald ein Termin nicht am laufenden Tag liegt. */
internal fun formatDayLabel(timestamp: Long): String =
    berlinFormat("EEE, d. MMMM", Locale.GERMANY, timestamp)

object WatchSnapshotStore {
    private const val preferences = "watch_schedule"
    private const val snapshotKey = "snapshot"

    fun save(context: Context, raw: String) {
        context.getSharedPreferences(preferences, Context.MODE_PRIVATE)
            .edit()
            .putString(snapshotKey, raw)
            .apply()
    }

    /**
     * Bewusst komplett abgesichert: Tile und Komplikation fragen auch in Zuständen
     * an, in denen der verschlüsselte App-Speicher noch nicht verfügbar ist.
     */
    fun load(context: Context): WatchSnapshot? = runCatching {
        val raw = context.getSharedPreferences(preferences, Context.MODE_PRIVATE)
            .getString(snapshotKey, null)
            ?: return null
        parse(raw)
    }.getOrNull()

    private fun parse(raw: String): WatchSnapshot {
        val root = JSONObject(raw)
        return WatchSnapshot(
            updatedAt = root.optLong("updatedAt"),
            today = root.optString("today"),
            todayEntries = root.optJSONArray("todayEntries").toEntries(),
            upcomingEntries = root.optJSONArray("upcomingEntries").toEntries(),
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
        day = optString("day"),
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
