import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { native, requestAccess } = vi.hoisted(() => ({ native: vi.fn(), requestAccess: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: native } }));
vi.mock('@dhbw/capacitor-calendar-sync', () => ({ CalendarSync: { requestAccess } }));
import { CalendarSyncSettings } from '../src/ui/CalendarSyncSettings';
let root: Root;
let container: HTMLDivElement;
const onChange = vi.fn();
beforeEach(() => {
  native.mockReturnValue(true); requestAccess.mockReset(); onChange.mockReset();
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
function render(enabled = false, demo = false) { act(() => root.render(createElement(CalendarSyncSettings, { enabled, demo, onChange }))); }
async function click() { await act(async () => { container.querySelector<HTMLButtonElement>('button')!.click(); }); }
it('fragt nur bei ausdrücklicher Aktivierung nach Zugriff und aktiviert erst nach Freigabe', async () => {
  render(); expect(requestAccess).not.toHaveBeenCalled();
  requestAccess.mockResolvedValue({ available: true, permission: 'denied' }); await click();
  expect(onChange).not.toHaveBeenCalled(); expect(container.textContent).toContain('Kalenderzugriff wurde nicht erteilt');
  requestAccess.mockResolvedValue({ available: true, permission: 'granted' }); await click();
  expect(onChange).toHaveBeenCalledWith(true);
});
it('pausiert ohne weitere Berechtigungsanfrage und erklärt verbleibende Termine', async () => {
  render(true); await click(); expect(onChange).toHaveBeenCalledWith(false);
  expect(requestAccess).not.toHaveBeenCalled(); expect(container.textContent).toContain('bleiben bereits übertragene Termine erhalten');
});
it('sperrt Kalenderzugriff im Browser und im Demomodus', async () => {
  native.mockReturnValue(false); render(); await click(); expect(requestAccess).not.toHaveBeenCalled();
  native.mockReturnValue(true); render(false, true); await click(); expect(requestAccess).not.toHaveBeenCalled();
});
it('meldet Synchronisierungsfehler und anschließend einen erfolgreichen Abgleich', () => {
  render(true);
  act(() => window.dispatchEvent(new CustomEvent('device-calendar-sync', { detail: { success: false } })));
  expect(container.querySelector('[role="status"]')?.textContent).toContain('konnte nicht aktualisiert werden');
  act(() => window.dispatchEvent(new CustomEvent('device-calendar-sync', { detail: { success: true } })));
  expect(container.querySelector('[role="status"]')?.textContent).toBe('Kalender aktualisiert.');
});
