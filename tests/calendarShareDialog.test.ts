import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const { native, requestAccess } = vi.hoisted(() => ({ native: vi.fn(), requestAccess: vi.fn() }));
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: native } }));
vi.mock('@dhbw/capacitor-calendar-sync', () => ({ CalendarSync: { requestAccess } }));
import { CalendarShareDialog } from '../src/ui/CalendarShareDialog';
let root: Root; let container: HTMLDivElement;
const onEnable = vi.fn(), onRefresh = vi.fn(), onDisable = vi.fn(), onClose = vi.fn();
beforeEach(() => {
  native.mockReturnValue(true); requestAccess.mockReset();
  requestAccess.mockResolvedValue({ available: true, permission: 'granted' });
  for (const fn of [onEnable, onRefresh, onDisable]) { fn.mockReset(); fn.mockResolvedValue(undefined); }
  onClose.mockReset();
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
function render(enabled = false, demo = false) { act(() => root.render(createElement(CalendarShareDialog, { enabled, demo, onEnable, onRefresh, onDisable, onClose }))); }
async function confirm() { await act(async () => { container.querySelector<HTMLButtonElement>('.dialog-btn--primary')!.click(); }); }
it('erklärt im gemeinsamen Android-/iOS-Ablauf den Abgleich vor der Anfrage und aktiviert erst nach Freigabe', async () => {
  render(); expect(container.textContent).toContain('Mit Kalenderzugriff'); expect(requestAccess).not.toHaveBeenCalled();
  requestAccess.mockResolvedValueOnce({ available: true, permission: 'denied' }); await confirm();
  expect(onEnable).not.toHaveBeenCalled(); expect(container.textContent).toContain('Kalenderzugriff wurde nicht erteilt');
  await confirm(); expect(onEnable).toHaveBeenCalledOnce(); expect(onRefresh).not.toHaveBeenCalled();
});
it('fordert beim Schließen oder Escape keine Berechtigung an', () => {
  render(); act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
  expect(onClose).toHaveBeenCalledOnce(); expect(requestAccess).not.toHaveBeenCalled();
});
it('sperrt Web und Demo', async () => {
  native.mockReturnValue(false); render(); await confirm();
  native.mockReturnValue(true); render(false, true); await confirm(); expect(requestAccess).not.toHaveBeenCalled();
});
it('aktualisiert bestehende Verbindungen und erlaubt Pausieren ohne Berechtigungsanfrage', async () => {
  render(true); await confirm(); expect(onRefresh).toHaveBeenCalledOnce(); expect(onEnable).not.toHaveBeenCalled();
  requestAccess.mockClear();
  await act(async () => { [...container.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Synchronisierung pausieren')!.click(); });
  expect(onDisable).toHaveBeenCalledOnce(); expect(requestAccess).not.toHaveBeenCalled(); expect(onClose).toHaveBeenCalled();
});
it('verhindert doppelte Anfragen während des Systemdialogs und meldet Fehler', async () => {
  let resolve!: (value: unknown) => void;
  requestAccess.mockReturnValue(new Promise(r => { resolve = r; })); render(); await confirm(); await confirm();
  expect(requestAccess).toHaveBeenCalledOnce();
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); expect(onClose).not.toHaveBeenCalled();
  await act(async () => resolve({ available: true, permission: 'granted' }));
  act(() => window.dispatchEvent(new CustomEvent('device-calendar-sync', { detail: { success: false } })));
  expect(container.querySelector('[role="status"]')?.textContent).toContain('konnte nicht aktualisiert werden');
});
