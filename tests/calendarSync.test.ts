import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { DEFAULT_SETTINGS } from '../src/store/preferences';
import type { ScheduleEntry } from '../src/types';
const { native, getStatus, sync } = vi.hoisted(() => ({ native: vi.fn(), getStatus: vi.fn(), sync: vi.fn() }));
const savedRange = new Map<string, string>();
vi.mock('@capacitor/preferences', () => ({ Preferences: {
  get: vi.fn(async ({ key }: { key: string }) => ({ value: savedRange.get(key) ?? null })),
  set: vi.fn(async ({ key, value }: { key: string; value: string }) => { savedRange.set(key, value); }),
} }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: native } }));
vi.mock('@dhbw/capacitor-calendar-sync', () => ({ CalendarSync: { getStatus, sync } }));
import { calendarEvent, calendarSyncRange, syncDeviceCalendar } from '../src/calendar/sync';
const now = new Date('2026-10-11T10:00:00Z');
const enabled = { ...DEFAULT_SETTINGS, calendarSyncEnabled: true };
function entry(start = '2026-10-12T08:00:00+02:00', end = '2026-10-12T10:00:00+02:00'): ScheduleEntry {
  return { start: new Date(start), end: new Date(end), title: 'Vorlesung', rooms: ['A1'], lecturers: ['Dozent Beispiel'], course: 'TINF', type: 'lecture' };
}
beforeEach(() => {
  savedRange.clear();
  vi.stubGlobal('crypto', webcrypto); native.mockReturnValue(true);
  getStatus.mockResolvedValue({ available: true, permission: 'granted' });
  sync.mockResolvedValue({ count: 1 }); sync.mockClear(); getStatus.mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe('Gerätekalender-Abgleich', () => {
  it('fordert beim Refresh niemals Berechtigungen an und schreibt nur nach Aktivierung', async () => {
    await syncDeviceCalendar([entry()], DEFAULT_SETTINGS, true, now);
    expect(getStatus).not.toHaveBeenCalled(); expect(sync).not.toHaveBeenCalled();
    native.mockReturnValue(false);
    await syncDeviceCalendar([entry()], enabled, true, now); expect(getStatus).not.toHaveBeenCalled();
    native.mockReturnValue(true); getStatus.mockResolvedValue({ available: true, permission: 'denied' });
    await syncDeviceCalendar([entry()], enabled, true, now); expect(sync).not.toHaveBeenCalled();
  });
  it('dedupliziert Termine und übernimmt auch die in der App geladenen historischen Termine', async () => {
    await syncDeviceCalendar([entry(), entry(), entry('2026-01-01T08:00:00Z', '2026-01-01T09:00:00Z')], enabled, true, now);
    expect(sync).toHaveBeenCalledOnce();
    expect(sync.mock.calls[0][0].events).toHaveLength(2);
    expect(sync.mock.calls[0][0]).toMatchObject({ allowDelete: true, ...calendarSyncRange(now, [entry(), entry('2026-01-01T08:00:00Z', '2026-01-01T09:00:00Z')]) });
  });
  it('erlaubt bei Cache- und Teilabrufen keine Löschungen', async () => {
    await syncDeviceCalendar([], enabled, false, now);
    expect(sync.mock.calls[0][0].allowDelete).toBe(false);
  });
  it('überspringt überholte Snapshots und schützt den Stundenplan bei nativen Fehlern', async () => {
    const first = syncDeviceCalendar([entry()], enabled, true, now);
    const second = syncDeviceCalendar([], DEFAULT_SETTINGS, false, now);
    await Promise.all([first, second]); expect(sync).not.toHaveBeenCalled();
    sync.mockRejectedValueOnce(new Error('Calendar unavailable'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(syncDeviceCalendar([entry()], enabled, true, now)).resolves.toBeUndefined();
    warn.mockRestore();
  });
  it('nutzt für geänderte Räume dieselbe Identität; Verschiebungen ersetzen den alten Termin im bestätigten Snapshot', async () => {
    const original = await calendarEvent(entry());
    const changed = await calendarEvent({ ...entry(), rooms: ['B2'] });
    expect(changed.key).toBe(original.key); expect(changed.location).toBe('B2');
    expect((await calendarEvent(entry('2026-10-12T09:00:00+02:00'))).key).not.toBe(original.key);
    expect(original.notes).toContain('Dozent: Dozent Beispiel');
  });
  it('bildet ganztägige Termine am Sommerzeitwechsel als Datum statt als UTC-Dauer ab', async () => {
    const event = await calendarEvent(entry('2026-03-29T00:00:00+01:00', '2026-03-30T00:00:00+02:00'));
    expect(event.allDay).toBe(true);
    expect(event.start).toBe(Date.parse('2026-03-29T00:00:00Z'));
    expect(event.end).toBe(Date.parse('2026-03-30T00:00:00Z'));
  });
  it('begrenzt das Zeitfenster auf Berliner Mitternacht auch über den Winterzeitwechsel', () => {
    expect(calendarSyncRange(new Date('2026-10-25T12:00:00Z'))).toEqual({
      rangeStart: Date.parse('2026-10-17T22:00:00Z'),
      rangeEnd: Date.parse('2027-01-22T23:00:00Z'),
    });
  });
  it('behält bei punktuellen Deadlines die Uhrzeit und liefert eine gültige Endzeit', async () => {
    const deadline = await calendarEvent(entry('2026-10-12T10:00:00+02:00', '2026-10-12T10:00:00+02:00'));
    expect(deadline.allDay).toBe(false); expect(deadline.end - deadline.start).toBe(60_000);
  });
});

it('bereinigt beim Kurswechsel auch frühere Kursdaten außerhalb des neuen Zeitbereichs', async () => {
  const old = entry('2025-06-01T08:00:00Z', '2025-06-01T09:00:00Z');
  await syncDeviceCalendar([old], enabled, true, now);
  const firstRange = sync.mock.calls[0][0].rangeStart;
  await syncDeviceCalendar([entry()], enabled, true, now);
  expect(sync.mock.calls[1][0].rangeStart).toBe(firstRange);
  expect(sync.mock.calls[1][0].events).toHaveLength(1);
  expect(sync.mock.calls[1][0].allowDelete).toBe(true);
});
