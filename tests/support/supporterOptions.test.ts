import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ getIcon: vi.fn(), setIcon: vi.fn(), restore: vi.fn() }));
vi.mock('../../src/support/icon', () => ({ getSupporterIcon: mocks.getIcon, setSupporterIcon: mocks.setIcon }));
vi.mock('../../src/support/purchases', () => ({ restoreSupportPurchases: mocks.restore }));
import { SupporterOptions } from '../../src/support/ui/SupporterOptions';
import { SupportIconPreview } from '../../src/support/ui/SupportIconPreview';
let root: Root, container: HTMLDivElement;
const refresh = vi.fn().mockResolvedValue(undefined);
async function render(_unlocked: boolean) { await act(async () => { root.render(createElement(SupporterOptions, { onRestored: refresh })); }); }
beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); mocks.getIcon.mockResolvedValue({ gold:false, available:true }); mocks.setIcon.mockResolvedValue(undefined);
  container=document.createElement('div'); document.body.append(container); root=createRoot(container);
});
afterEach(()=>{act(()=>root.unmount());container.remove();});
it('offers restoration but no locked icon choice before support', async()=>{
  await render(false); expect(container.querySelector('.support-icon-options')).toBeNull();
  expect(container.textContent).toContain('Käufe wiederherstellen');
});
it('opens icon choices in a popup instead of displaying them on the settings page', async()=>{
  await act(async()=>root.render(createElement(SupportIconPreview,{unlocked:true,onClose:()=>root.render(null)})));
  expect(container.querySelector('.support-icon-choice')).toBeNull();
  await act(async()=>[...document.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.textContent==='App-Symbol ändern')!.click());
  const dialog=document.querySelector('[role="dialog"]')!;
  const buttons=dialog.querySelectorAll<HTMLButtonElement>('.support-icon-choice');
  await act(async()=>buttons[1].click()); expect(mocks.setIcon).toHaveBeenLastCalledWith(true); expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
  await act(async()=>buttons[0].click()); expect(mocks.setIcon).toHaveBeenLastCalledWith(false);
  await act(async()=>dialog.querySelector<HTMLButtonElement>('[aria-label="Vorschau schließen"]')!.click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it('refreshes entitlement state after restoring from the store', async()=>{
  mocks.restore.mockResolvedValue(true); await render(false);
  await act(async()=>container.querySelector<HTMLButtonElement>('.sheet__textbtn')!.click());
  expect(refresh).toHaveBeenCalledOnce(); expect(container.textContent).toContain('freigeschaltet');
});
it('does not claim restoration when the store fails', async()=>{
  mocks.restore.mockRejectedValue(new Error('offline')); await render(false);
  await act(async()=>container.querySelector<HTMLButtonElement>('.sheet__textbtn')!.click());
  expect(refresh).not.toHaveBeenCalled(); expect(container.textContent).toContain('gerade nicht möglich');
});
