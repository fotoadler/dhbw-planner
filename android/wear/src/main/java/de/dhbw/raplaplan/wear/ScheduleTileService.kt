package de.dhbw.raplaplan.wear

import androidx.wear.protolayout.LayoutElementBuilders.Column
import androidx.wear.protolayout.ResourceBuilders.Resources
import androidx.wear.protolayout.TimelineBuilders.Timeline
import androidx.wear.protolayout.material3.Typography.BODY_LARGE
import androidx.wear.protolayout.material3.Typography.BODY_MEDIUM
import androidx.wear.protolayout.material3.materialScope
import androidx.wear.protolayout.material3.primaryLayout
import androidx.wear.protolayout.material3.text
import androidx.wear.protolayout.types.layoutString
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders.Tile
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private const val RESOURCES_VERSION = "1"

/** Read-only Tile mit genau dem einen Kontext, den man beim kurzen Blick braucht. */
class ScheduleTileService : TileService() {
    override fun onTileRequest(requestParams: RequestBuilders.TileRequest) =
        Futures.immediateFuture(
            Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                .setTileTimeline(
                    Timeline.fromLayoutElement(
                        materialScope(this, requestParams.deviceConfiguration) {
                            val entry = WatchSnapshotStore.load(this@ScheduleTileService)?.let {
                                it.currentEntry ?: it.nextEntry
                            }
                            primaryLayout(
                                titleSlot = { text("DHBW Planner".layoutString, typography = BODY_MEDIUM) },
                                mainSlot = {
                                    Column.Builder()
                                        .addContent(
                                            text(
                                                (entry?.title ?: "Keine Vorlesung").take(36).layoutString,
                                                typography = BODY_LARGE,
                                            ),
                                        )
                                        .addContent(
                                            text(
                                                entry?.let { "${formatTime(it.startTime)} · ${it.room}" }
                                                    ?.take(36)
                                                    ?.layoutString
                                                    ?: "Heute ist nichts mehr geplant.".layoutString,
                                                typography = BODY_MEDIUM,
                                            ),
                                        )
                                        .build()
                                },
                            )
                        },
                    ),
                )
                .setFreshnessIntervalMillis(15 * 60 * 1000L)
                .build(),
        )

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest) =
        Futures.immediateFuture(Resources.Builder().setVersion(RESOURCES_VERSION).build())
}

private fun formatTime(timestamp: Long): String =
    SimpleDateFormat("HH:mm", Locale.GERMANY).apply {
        timeZone = TimeZone.getTimeZone("Europe/Berlin")
    }.format(Date(timestamp))
