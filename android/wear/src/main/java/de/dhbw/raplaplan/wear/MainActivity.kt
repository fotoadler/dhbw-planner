package de.dhbw.raplaplan.wear

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.material.Card
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.Text as WearText
import androidx.wear.compose.material.TimeText
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WearPlannerScreen()
        }
    }
}

@Composable
private fun WearPlannerScreen() {
    val context = LocalContext.current
    var snapshot by remember { mutableStateOf(WatchSnapshotStore.load(context)) }
    // Der Data-Layer schreibt den Snapshot im Hintergrund. Ohne erneutes Laden beim
    // Zurückkehren zeigt die Uhr sonst beliebig lange den Stand des ersten Starts.
    LifecycleResumeEffect(Unit) {
        snapshot = WatchSnapshotStore.load(context)
        onPauseOrDispose {}
    }

    // Minütlich neu auswerten, damit „Jetzt“/„Als Nächstes“ und die Tagesliste auch
    // ohne frischen Sync stimmen – insbesondere über Mitternacht hinweg.
    var now by remember { mutableLongStateOf(System.currentTimeMillis()) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(60_000)
            now = System.currentTimeMillis()
        }
    }

    MaterialTheme {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp),
        ) {
            item { TimeText() }
            val current = snapshot
            if (current == null) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        WearText("Noch nicht synchronisiert", fontWeight = FontWeight.Bold)
                        WearText("Öffne DHBW Planner auf dem Smartphone.", fontSize = 12.sp)
                    }
                }
            } else {
                val dayEntries = current.entriesForDay(now)
                item { SummaryCard(current, now) }
                if (dayEntries.isNotEmpty()) {
                    item {
                        WearText(
                            "Heute",
                            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                            fontSize = 12.sp,
                        )
                    }
                    items(dayEntries.size) { index ->
                        EntryRow(dayEntries[index])
                    }
                }
                item {
                    WearText(
                        "Stand ${formatRelative(current.updatedAt, now)}",
                        modifier = Modifier.padding(top = 8.dp),
                        fontSize = 11.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(snapshot: WatchSnapshot, now: Long) {
    val current = snapshot.currentEntry(now)
    val entry = current ?: snapshot.nextEntry(now)
    if (entry == null) {
        Card(onClick = {}) {
            WearText("Keine Vorlesung")
        }
        return
    }

    Card(onClick = {}) {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            WearText(
                if (current != null) "Jetzt" else "Als Nächstes",
                fontSize = 12.sp,
                color = MaterialTheme.colors.secondary,
            )
            WearText(entry.title, fontWeight = FontWeight.Bold, maxLines = 2)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                WearText(formatTime(entry.startTime), fontSize = 12.sp)
                WearText("–", fontSize = 12.sp)
                WearText(formatTime(entry.endTime), fontSize = 12.sp)
            }
            // Ohne Tagesangabe läse sich ein Termin von morgen wie einer von heute.
            if (entry.day != berlinDayKey(now)) {
                WearText(formatDayLabel(entry.startTime), fontSize = 11.sp, maxLines = 1)
            }
            if (current != null) {
                CountdownLabel(entry.endTime, now)
            }
            if (entry.room.isNotBlank()) {
                WearText(entry.room, fontSize = 12.sp, maxLines = 1)
            }
            if (entry.lecturer.isNotBlank()) {
                WearText(entry.lecturer, fontSize = 11.sp, maxLines = 1)
            }
        }
    }
}

@Composable
private fun EntryRow(entry: WatchEntry) {
    Card(onClick = {}) {
        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            WearText(formatTime(entry.startTime), fontSize = 12.sp)
            Column {
                WearText(entry.title, fontSize = 12.sp, maxLines = 1)
                if (entry.room.isNotBlank()) WearText(entry.room, fontSize = 10.sp, maxLines = 1)
            }
        }
    }
}

@Composable
private fun CountdownLabel(endTime: Long, now: Long) {
    var remaining by remember(endTime) { mutableLongStateOf((endTime - now).coerceAtLeast(0)) }
    LaunchedEffect(endTime) {
        while (remaining > 0) {
            remaining = (endTime - System.currentTimeMillis()).coerceAtLeast(0)
            delay(1_000)
        }
    }
    WearText(formatDuration(remaining), fontWeight = FontWeight.Bold, fontSize = 18.sp)
}

private fun formatDuration(milliseconds: Long): String {
    val totalMinutes = (milliseconds / 60_000).coerceAtLeast(0)
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return if (hours > 0) "noch ${hours} h ${minutes.toString().padStart(2, '0')} min" else "noch ${minutes} min"
}

private fun formatRelative(timestamp: Long, now: Long): String {
    val minutes = ((now - timestamp) / 60_000).coerceAtLeast(0)
    return when {
        minutes == 0L -> "gerade eben"
        minutes < 60 -> "vor $minutes Min."
        minutes < 24 * 60 -> "vor ${minutes / 60} Std."
        else -> "vom ${formatDayLabel(timestamp)}"
    }
}
