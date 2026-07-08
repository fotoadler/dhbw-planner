import { describe, expect, it } from 'vitest';
import {
  MAX_SCHEDULED,
  NotificationSettings,
  planNotifications,
} from '../src/notifications/planner';
import { ScheduleEntry } from '../src/types';
import { berlinToUtc } from '../src/lib/berlinTime';

const SETTINGS: NotificationSettings = {
  morningEnabled: true,
  morningTime: '07:00',
  liveEnabled: true,
  reminderEnabled: true,
  reminderMinutes: 15,
};

/** Termin am Tag y/m/d von sh:smin bis eh:emin (Berlin-Wandzeit). */
function entry(
  y: number,
  m: number,
  d: number,
  sh: number,
  smin: number,
  eh: number,
  emin: number,
  title = 'Geld und Währung',
): ScheduleEntry {
  return {
    start: berlinToUtc(y, m, d, sh, smin),
    end: berlinToUtc(y, m, d, eh, emin),
    title,
    lecturers: ['Daniel Blochinger'],
    course: 'DH-WINF24A',
    rooms: ['WS17-0.13'],
    type: 'lecture',
  };
}

// "Jetzt" = Mo 06.07.2026, 12:00 Berlin (10:00 UTC, CEST)
const NOW = berlinToUtc(2026, 7, 6, 12, 0);

describe('planNotifications', () => {
  it('plant die Morgen-Zusammenfassung nur an Tagen mit Uni', () => {
    const plan = planNotifications([entry(2026, 7, 7, 9, 0, 12, 15)], SETTINGS, NOW);
    const mornings = plan.filter((p) => p.title.startsWith('Heute an der Uni'));
    expect(mornings).toHaveLength(1); // nur der 07.07., nicht die übrigen 13 Tage
  });

  it('plant die Morgen-Zusammenfassung um 07:00 Europe/Berlin', () => {
    const plan = planNotifications([entry(2026, 7, 7, 9, 0, 12, 15)], SETTINGS, NOW);
    const morning = plan.find((p) => p.title.startsWith('Heute an der Uni'))!;
    expect(morning.at.toISOString()).toBe('2026-07-07T05:00:00.000Z'); // 07:00 CEST
    expect(morning.title).toBe('Heute an der Uni – 1 Termin');
    expect(morning.body).toBe('09:00–12:15 Geld und Währung · WS17-0.13 · Daniel Blochinger');
  });

  it('plant keine Morgen-Zusammenfassung, wenn 07:00 heute schon vorbei ist', () => {
    // Termin heute Nachmittag, NOW = 12:00 → Morgen-Notification wäre in der Vergangenheit
    const plan = planNotifications([entry(2026, 7, 6, 14, 0, 15, 30)], SETTINGS, NOW);
    expect(plan.filter((p) => p.title.startsWith('Heute an der Uni'))).toHaveLength(0);
  });

  it('plant die Vorab-Erinnerung X Minuten vor Beginn', () => {
    const plan = planNotifications([entry(2026, 7, 7, 9, 0, 12, 15)], SETTINGS, NOW);
    const reminder = plan.find((p) => p.title.startsWith('In 15 Min'))!;
    expect(reminder.at.toISOString()).toBe('2026-07-07T06:45:00.000Z'); // 08:45 CEST
  });

  it('vergibt stabile IDs (idempotent über mehrere Läufe)', () => {
    const entries = [entry(2026, 7, 7, 9, 0, 12, 15), entry(2026, 7, 8, 10, 0, 11, 30)];
    const a = planNotifications(entries, SETTINGS, NOW);
    const b = planNotifications(entries, SETTINGS, NOW);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    expect(new Set(a.map((p) => p.id)).size).toBe(a.length); // keine Kollisionen
  });

  it('plant keine Notifications für vergangene Zeitpunkte', () => {
    const plan = planNotifications([entry(2026, 7, 6, 8, 0, 11, 0)], SETTINGS, NOW); // heute, vorbei
    expect(plan).toHaveLength(0);
  });

  it('respektiert den Horizont von 14 Tagen', () => {
    const outside = entry(2026, 7, 26, 9, 0, 12, 15); // Tag 20
    const plan = planNotifications([outside], SETTINGS, NOW);
    expect(plan).toHaveLength(0);
  });

  it('bleibt auch bei dichtem Plan deutlich unter dem iOS-Limit von 64', () => {
    // 14 Tage × 4 Termine = 56 Termine ⇒ ungedeckelt wären es 14 + 56 Planungen
    const entries: ScheduleEntry[] = [];
    for (let day = 0; day < 14; day++) {
      for (let slot = 0; slot < 4; slot++) {
        entries.push(entry(2026, 7, 7 + day, 8 + slot * 2, 0, 9 + slot * 2, 30, `V${day}-${slot}`));
      }
    }
    const plan = planNotifications(entries, SETTINGS, NOW);
    expect(plan.length).toBeLessThanOrEqual(MAX_SCHEDULED);
    expect(plan.length).toBeLessThan(64);
    // Morgen-Zusammenfassungen haben Priorität und sind vollständig enthalten
    // (13 statt 14: der letzte Termintag liegt außerhalb des Horizonts ab "heute").
    expect(plan.filter((p) => p.title.startsWith('Heute an der Uni'))).toHaveLength(13);
  });

  it('plant nichts, wenn alle Benachrichtigungstypen deaktiviert sind', () => {
    const off: NotificationSettings = {
      morningEnabled: false,
      morningTime: '07:00',
      liveEnabled: false,
      reminderEnabled: false,
      reminderMinutes: 15,
    };
    expect(planNotifications([entry(2026, 7, 7, 9, 0, 12, 15)], off, NOW)).toHaveLength(0);
  });

  it('zählt Termine im Titel der Morgen-Zusammenfassung', () => {
    const plan = planNotifications(
      [entry(2026, 7, 7, 9, 0, 12, 15, 'A'), entry(2026, 7, 7, 13, 0, 14, 0, 'B'), entry(2026, 7, 7, 15, 0, 16, 0, 'C')],
      SETTINGS,
      NOW,
    );
    const morning = plan.find((p) => p.title.startsWith('Heute an der Uni'))!;
    expect(morning.title).toBe('Heute an der Uni – 3 Termine');
    expect(morning.body.split('\n')).toHaveLength(3);
  });
});
