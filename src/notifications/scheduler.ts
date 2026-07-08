/**
 * Notification-Scheduler: dünner Wrapper um @capacitor/local-notifications.
 *
 * Die eigentliche Planungslogik lebt als pure Funktion in planner.ts (dort
 * getestet). Dieser Wrapper kümmert sich um Berechtigungen (iOS explizit,
 * Android 13+ POST_NOTIFICATIONS-Runtime-Permission — beides über dieselbe
 * Plugin-API), den Android-Notification-Channel und das idempotente
 * Neu-Planen: pending Notifications werden komplett verworfen und aus dem
 * frischen Plan neu aufgebaut — veraltete/obsolete Planungen verschwinden
 * dadurch automatisch.
 */

import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { ScheduleEntry } from '../types';
import { NotificationSettings, planNotifications } from './planner';

const CHANNEL_ID = 'schedule';

/** Fragt die Notification-Berechtigung an (falls noch offen). */
export async function ensurePermission(): Promise<boolean> {
  try {
    let status = await LocalNotifications.checkPermissions();
    if (status.display === 'prompt' || status.display === 'prompt-with-rationale') {
      status = await LocalNotifications.requestPermissions();
    }
    return status.display === 'granted';
  } catch {
    return false; // z. B. Web ohne Notification-Support — App bleibt nutzbar.
  }
}

/** Android: Channel einmalig anlegen (no-op auf iOS/Web). */
export async function initNotifications(): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') return;
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Stundenplan',
      description: 'Morgen-Zusammenfassung und Vorlesungs-Erinnerungen',
      importance: 4,
    });
  } catch {
    /* Channel existiert bereits o. Ä. — unkritisch */
  }
}

/**
 * Plant alle Notifications neu (nach jedem erfolgreichen Refresh und beim
 * App-Resume). Idempotent: alle pending Notifications werden storniert und
 * aus dem aktuellen Plan (stabile IDs) neu geplant.
 */
export async function syncNotifications(
  entries: ScheduleEntry[],
  settings: NotificationSettings,
  now: Date = new Date(),
): Promise<void> {
  const anyEnabled = settings.morningEnabled || settings.reminderEnabled;

  try {
    const pending = await LocalNotifications.getPending();
    if (pending.notifications.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((n) => ({ id: n.id })),
      });
    }

    if (!anyEnabled || !(await ensurePermission())) return;

    const plan = planNotifications(entries, settings, now);
    if (!plan.length) return;

    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        schedule: { at: p.at, allowWhileIdle: true },
        channelId: CHANNEL_ID,
      })),
    });
  } catch (err) {
    // Notifications sind ein Komfort-Feature — Fehler dürfen die App nie brechen.
    if (import.meta.env?.DEV) console.warn('[notifications]', err);
  }
}
