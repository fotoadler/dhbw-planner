package de.dhbw.raplaplan.wear

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.DataMapItem
import com.google.android.gms.wearable.WearableListenerService

class WatchSyncService : WearableListenerService() {
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        dataEvents.forEach { event ->
            if (event.type != DataEvent.TYPE_CHANGED) return@forEach
            if (event.dataItem.uri.path != "/dhbw-planner/schedule") return@forEach

            val snapshot = DataMapItem.fromDataItem(event.dataItem).dataMap.getString("snapshot")
            if (!snapshot.isNullOrBlank()) {
                WatchSnapshotStore.save(this, snapshot)
            }
        }
    }
}
