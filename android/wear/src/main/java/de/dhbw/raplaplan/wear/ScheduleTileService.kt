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
                            val now = System.currentTimeMillis()
                            val snapshot = WatchSnapshotStore.load(this@ScheduleTileService)
                            val current = snapshot?.currentEntry(now)
                            val entry = current ?: snapshot?.nextEntry(now)
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
                                                (entry?.let { subtitle(it, now) } ?: "Kein weiterer Termin bekannt.")
                                                    .take(36)
                                                    .layoutString,
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

/**
 * Ein Termin an einem anderen Kalendertag bekommt den Tag statt des Raums – eine
 * nackte Uhrzeit läse sich sonst wie „heute“.
 */
private fun subtitle(entry: WatchEntry, now: Long): String {
    if (entry.day != berlinDayKey(now)) {
        return "${formatDayLabel(entry.startTime)} · ${formatTime(entry.startTime)}"
    }
    return listOf(formatTime(entry.startTime), entry.room)
        .filter { it.isNotBlank() }
        .joinToString(" · ")
}
