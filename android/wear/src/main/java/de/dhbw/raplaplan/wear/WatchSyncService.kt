package de.dhbw.raplaplan.wear

import android.content.ComponentName
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester
import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

class WatchSyncService : WearableListenerService() {
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        var updated = false

        dataEvents.forEach { event ->
            if (event.type != DataEvent.TYPE_CHANGED) return@forEach
            if (event.dataItem.uri.path != "/dhbw-planner/schedule") return@forEach

            val snapshot = DataMapItem.fromDataItem(event.dataItem).dataMap.getString("snapshot")
            if (!snapshot.isNullOrBlank()) {
                WatchSnapshotStore.save(this, snapshot)
                updated = true
            }
        }

        // Ohne diese beiden Anstöße zeigen Tile und Komplikation die neuen Daten erst,
        // wenn das System sie von sich aus neu anfordert (Tile 15 Min., Komplikation 15 Min.).
        if (updated) requestSurfaceUpdates()
    }

    private fun requestSurfaceUpdates() {
        runCatching {
            TileService.getUpdater(this).requestUpdate(ScheduleTileService::class.java)
        }
        runCatching {
            ComplicationDataSourceUpdateRequester
                .create(this, ComponentName(this, ScheduleComplicationService::class.java))
                .requestUpdateAll()
        }
    }
}
