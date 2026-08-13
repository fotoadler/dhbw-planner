package de.dhbw.raplaplan.wear

import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.NoDataComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceService
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

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

        val entry = WatchSnapshotStore.load(this)?.let { it.currentEntry ?: it.nextEntry }
        listener.onComplicationData(entry?.let(::shortText) ?: NoDataComplicationData())
    }

    override fun getPreviewData(type: ComplicationType): ComplicationData? =
        if (type == ComplicationType.SHORT_TEXT) {
            shortText(
                WatchEntry(
                    id = "preview",
                    title = "Nächster Termin",
                    startTime = System.currentTimeMillis(),
                    endTime = System.currentTimeMillis(),
                    room = "WS17-0.13",
                    lecturer = "",
                    extra = "",
                    type = "lecture",
                ),
            )
        } else {
            NoDataComplicationData()
    }

    private fun shortText(entry: WatchEntry): ShortTextComplicationData {
        return ShortTextComplicationData.Builder(
            PlainComplicationText.Builder(formatTime(entry.startTime)).build(),
            PlainComplicationText.Builder(entry.title.take(24)).build(),
        ).build()
    }
}

private fun formatTime(timestamp: Long): String =
    SimpleDateFormat("HH:mm", Locale.GERMANY).apply {
        timeZone = TimeZone.getTimeZone("Europe/Berlin")
    }.format(Date(timestamp))
