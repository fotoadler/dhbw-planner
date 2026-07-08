/**
 * Notification-Planner (pure, testbar — ohne Plugin-Zugriff).
 *
 * Lokale Notifications müssen zeitbasiert im Voraus geplant werden. Strategie:
 * Bei jedem erfolgreichen Refresh werden die kommenden ~14 Tage rollierend
 * vorgeplant (idempotent, stabile IDs), veraltete Planungen entfernt der
 * Scheduler. iOS erlaubt max. 64 gleichzeitig geplante Notifications — wir
 * bleiben mit MAX_SCHEDULED=55 deutlich darunter: Morgen-Zusammenfassungen
 * haben Priorität (≤ 14), danach Vorab-Notifications chronologisch bis das
 * Budget erschöpft ist.
 *
 * Stabile IDs (Android-int-sicher, < 2^31):
 *   Morgen:  1_000_000 + yymmdd            (z. B. 1260708)
 *   Vorab:  20_000_000 + yymmdd*10 + slot
 */

import { ScheduleEntry } from '../types';
import {
  addDaysYmd,
  berlinDayKey,
  berlinParts,
  berlinToUtc,
  formatTime,
  ymdKey,
  Ymd,
} from '../lib/berlinTime';

export const HORIZON_DAYS = 14;
export const MAX_SCHEDULED = 55; // deutlich unter dem iOS-Limit von 64

export interface NotificationSettings {
  morningEnabled: boolean;
  /** "HH:MM", Default "07:00" */
  morningTime: string;
  liveEnabled: boolean;
  reminderEnabled: boolean;
  reminderMinutes: number;
}

export interface PlannedNotification {
  id: number;
  title: string;
  body: string;
  at: Date;
}

function yymmdd(ymd: Ymd): number {
  return (ymd.y % 100) * 10_000 + ymd.m * 100 + ymd.d;
}

export const morningId = (ymd: Ymd) => 1_000_000 + yymmdd(ymd);
export const reminderId = (ymd: Ymd, slot: number) => 20_000_000 + yymmdd(ymd) * 10 + slot;

/** Kompakte Terminzeile: "09:00–12:15 Geld und Währung · WS17-0.13 · Daniel Blochinger" */
function entryLine(e: ScheduleEntry): string {
  const parts = [`${formatTime(e.start)}–${formatTime(e.end)} ${e.title}`];
  if (e.rooms.length) parts.push(e.rooms.join(', '));
  if (e.lecturers.length) parts.push(e.lecturers.join(', '));
  return parts.join(' · ');
}

function parseTime(time: string): [number, number] {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  return m ? [+m[1], +m[2]] : [7, 0];
}

/**
 * Plant alle Notifications für die nächsten `horizonDays` Tage ab `now`.
 * Pure Funktion: gleiche Eingaben ⇒ gleiche Planung inkl. identischer IDs
 * (Idempotenz). Vergangene Zeitpunkte werden nie geplant.
 */
export function planNotifications(
  entries: ScheduleEntry[],
  settings: NotificationSettings,
  now: Date,
  horizonDays: number = HORIZON_DAYS,
  maxCount: number = MAX_SCHEDULED,
): PlannedNotification[] {
  // Termine nach Berlin-Kalendertag gruppieren.
  const byDay = new Map<string, ScheduleEntry[]>();
  for (const e of entries) {
    const key = berlinDayKey(e.start);
    const list = byDay.get(key);
    if (list) list.push(e);
    else byDay.set(key, [e]);
  }

  const today = berlinParts(now);
  const mornings: PlannedNotification[] = [];
  const reminders: PlannedNotification[] = [];

  for (let offset = 0; offset < horizonDays; offset++) {
    const ymd = addDaysYmd(today, offset);
    const day = byDay.get(ymdKey(ymd));
    if (!day?.length) continue; // Nur an Tagen mit Uni benachrichtigen.
    day.sort((a, b) => a.start.getTime() - b.start.getTime());

    if (settings.morningEnabled) {
      const [hh, mm] = parseTime(settings.morningTime);
      const at = berlinToUtc(ymd.y, ymd.m, ymd.d, hh, mm);
      if (at.getTime() > now.getTime()) {
        mornings.push({
          id: morningId(ymd),
          title: `Heute an der Uni – ${day.length} ${day.length === 1 ? 'Termin' : 'Termine'}`,
          body: day.map(entryLine).join('\n'),
          at,
        });
      }
    }

    day.forEach((e, slot) => {
      if (slot > 9) return; // ID-Schema erlaubt 10 Termine pro Tag — mehr als genug.
      if (settings.reminderEnabled) {
        const at = new Date(e.start.getTime() - settings.reminderMinutes * 60_000);
        if (at.getTime() > now.getTime()) {
          reminders.push({
            id: reminderId(ymd, slot),
            title: `In ${settings.reminderMinutes} Min: ${e.title}`,
            body: entryLine(e),
            at,
          });
        }
      }
    });
  }

  // Budget: Morgen-Zusammenfassungen zuerst, dann Vorab-Erinnerungen chronologisch.
  reminders.sort((a, b) => a.at.getTime() - b.at.getTime());
  const planned = [...mornings, ...reminders.slice(0, Math.max(0, maxCount - mornings.length))];
  planned.sort((a, b) => a.at.getTime() - b.at.getTime());
  return planned;
}
