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
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.wear.compose.material.Card
import androidx.wear.compose.material.MaterialTheme
import androidx.wear.compose.material.ScalingLazyColumn
import androidx.wear.compose.material.Text as WearText
import androidx.wear.compose.material.TimeText
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WearPlannerScreen(WatchSnapshotStore.load(this))
        }
    }
}

@Composable
private fun WearPlannerScreen(snapshot: WatchSnapshot?) {
    MaterialTheme {
        ScalingLazyColumn(
            modifier = Modifier.fillMaxSize().padding(horizontal = 8.dp),
        ) {
            item { TimeText() }
            if (snapshot == null) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        WearText("Noch nicht synchronisiert", fontWeight = FontWeight.Bold)
                        WearText("Öffne DHBW Planner auf dem Smartphone.", fontSize = 12.sp)
                    }
                }
            } else {
                item { SummaryCard(snapshot) }
                item {
                    WearText(
                        "Heute",
                        modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
                        fontSize = 12.sp,
                    )
                }
                items(snapshot.todayEntries.size) { index ->
                    EntryRow(snapshot.todayEntries[index])
                }
                item {
                    WearText(
                        "Stand ${formatRelative(snapshot.updatedAt)}",
                        modifier = Modifier.padding(top = 8.dp),
                        fontSize = 11.sp,
                    )
                }
            }
        }
    }
}

@Composable
private fun SummaryCard(snapshot: WatchSnapshot) {
    val entry = snapshot.currentEntry ?: snapshot.nextEntry
    if (entry == null) {
        Card(onClick = {}) {
            WearText("Keine Vorlesung")
        }
        return
    }

    Card(onClick = {}) {
        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
            WearText(
                if (snapshot.currentEntry != null) "Jetzt" else "Als Nächstes",
                fontSize = 12.sp,
                color = MaterialTheme.colors.secondary,
            )
            WearText(entry.title, fontWeight = FontWeight.Bold, maxLines = 2)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                WearText(formatTime(entry.startTime), fontSize = 12.sp)
                WearText("–", fontSize = 12.sp)
                WearText(formatTime(entry.endTime), fontSize = 12.sp)
            }
            if (snapshot.currentEntry != null) {
                CountdownLabel(entry.endTime)
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
private fun CountdownLabel(endTime: Long) {
    var remaining by remember(endTime) { mutableLongStateOf((endTime - System.currentTimeMillis()).coerceAtLeast(0)) }
    LaunchedEffect(endTime) {
        while (remaining > 0) {
            remaining = (endTime - System.currentTimeMillis()).coerceAtLeast(0)
            delay(1_000)
        }
    }
    WearText(formatDuration(remaining), fontWeight = FontWeight.Bold, fontSize = 18.sp)
}

private fun formatTime(timestamp: Long): String =
    java.text.SimpleDateFormat("HH:mm", java.util.Locale.GERMANY).apply {
        timeZone = java.util.TimeZone.getTimeZone("Europe/Berlin")
    }.format(java.util.Date(timestamp))

private fun formatDuration(milliseconds: Long): String {
    val totalMinutes = (milliseconds / 60_000).coerceAtLeast(0)
    val hours = totalMinutes / 60
    val minutes = totalMinutes % 60
    return if (hours > 0) "noch ${hours} h ${minutes.toString().padStart(2, '0')} min" else "noch ${minutes} min"
}

private fun formatRelative(timestamp: Long): String {
    val minutes = ((System.currentTimeMillis() - timestamp) / 60_000).coerceAtLeast(0)
    return if (minutes == 0L) "gerade eben" else "vor $minutes Min."
}
