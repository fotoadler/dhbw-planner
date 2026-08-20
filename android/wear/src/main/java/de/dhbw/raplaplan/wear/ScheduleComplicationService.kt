package de.dhbw.raplaplan.wear

import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.NoDataComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest

/** Kurze Startzeit bzw. aktueller Titel für kompatible Wear-OS-Zifferblätter. */
class ScheduleComplicationService : ComplicationDataSourceService() {
    override fun onComplicationRequest(
        request: ComplicationRequest,
        listener: ComplicationRequestListener,
    ) {
        if (request.complicationType != ComplicationType.SHORT_TEXT) {
            listener.onComplicationData(NoDataComplicationData())
            return
        }

        val now = System.currentTimeMillis()
        val snapshot = WatchSnapshotStore.load(this)
        val entry = snapshot?.let { it.currentEntry(now) ?: it.nextEntry(now) }
        listener.onComplicationData(entry?.let { shortText(it, now) } ?: NoDataComplicationData())
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type == ComplicationType.SHORT_TEXT) {
            val now = System.currentTimeMillis()
            shortText(
                WatchEntry(
                    id = "preview",
                    title = "Nächster Termin",
                    startTime = now,
                    endTime = now,
                    room = "WS17-0.13",
                    lecturer = "",
                    extra = "",
                    type = "lecture",
                    day = berlinDayKey(now),
                ),
                now,
            )
        } else {
            null
        }

    private fun shortText(entry: WatchEntry, now: Long): ShortTextComplicationData {
        // Liegt der Termin an einem anderen Tag, zeigt der Titel den Wochentag statt
        // des Veranstaltungsnamens – die Uhrzeit allein wäre sonst irreführend.
        val title = if (entry.day != berlinDayKey(now)) {
            formatDayLabel(entry.startTime).take(24)
        } else {
            entry.title.take(24)
        }
        return ShortTextComplicationData.Builder(
            PlainComplicationText.Builder(formatTime(entry.startTime)).build(),
            PlainComplicationText.Builder(title).build(),
        ).build()
    }
}
