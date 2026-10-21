import { createElement, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Product } from '@capgo/native-purchases';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ purchase: vi.fn(), load: vi.fn() }));
vi.mock('../../src/support/purchases', () => ({
  SUPPORT_COPY: 'Gefällt dir die App? Um die mit der App verbundenen Kosten etwas abzufangen, freue ich mich über eine kleine, freiwillige Unterstützung.',
  loadSupportProducts: mocks.load, purchaseSupport: mocks.purchase, nativeSupportAvailable: () => true,
  isGoldProduct: (id: string) => id.startsWith('support_gold_'),
}));
import { SupportDialog } from '../../src/support/ui/SupportDialog';
const products = [1, 3, 5, 10].map(n => ({ identifier: `support_gold_${n}`, priceString: `${n},00 €`, price: n })) as Product[];
let root: Root, container: HTMLDivElement;
let busy: boolean;
let onClose: ReturnType<typeof vi.fn>;
const render = () => root.render(createElement(SupportDialog, {
  automatic: true, products, busy, onBusy: value => { busy = value; render(); },
  onProducts: () => {}, onClose, onSupported: async () => {},
}));
const buy = () => container.querySelector<HTMLButtonElement>('[aria-label="Mit 3,00 € unterstützen"]')!;
beforeEach(async () => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.clearAllMocks(); mocks.load.mockResolvedValue(products); busy = false;
  onClose = vi.fn();
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { render(); });
});
afterEach(() => { act(() => root.unmount()); container.remove(); });
it('offers four store prices and one reminder action without a permanent opt-out', async () => {
  expect(container.querySelectorAll('.support-prices button')).toHaveLength(4);
  expect(container.textContent).not.toContain('Nicht mehr fragen');
  expect(container.textContent).not.toContain('Nein danke');
  await act(async () => { [...container.querySelectorAll('button')].find(b => b.textContent === 'Später erinnern')!.click(); });
  expect(onClose).toHaveBeenCalledOnce();
});
it('prevents double purchases and disables dismissal while the payment is running', async () => {
  let finish!: (value: string) => void;
  mocks.purchase.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  await act(async () => { buy().click(); buy().click(); });
  expect(mocks.purchase).toHaveBeenCalledOnce();
  expect([...container.querySelectorAll('button')].every(b => b.disabled)).toBe(true);
  await act(async () => { finish('success'); });
  expect(container.textContent).toContain('Ein großes Dankeschön an dich!');
  expect(container.textContent).not.toContain('Gefällt dir die App?');
  expect(container.querySelector('.support-confetti')?.getAttribute('aria-hidden')).toBe('true');
  expect(container.querySelectorAll('.support-prices')).toHaveLength(0);
  expect(container.querySelector('.support-dismiss')).toBeNull();
  expect(document.activeElement).toBe(container.querySelector('.support-dialog'));
});
it('does not show success for a pending purchase and prevents another purchase', async () => {
  mocks.purchase.mockResolvedValue('pending');
  await act(async () => { buy().click(); });
  expect(container.textContent).toContain('wartet noch auf Bestätigung');
  expect(container.textContent).not.toContain('Vielen Dank');
  expect(container.querySelector('.support-thanks')).toBeNull();
  expect(buy().disabled).toBe(true);
});
it('keeps the dialog usable after cancellation', async () => {
  mocks.purchase.mockResolvedValue('cancelled');
  await act(async () => { buy().click(); });
  expect(container.textContent).toContain('Kauf abgebrochen');
  expect(container.textContent).not.toContain('Vielen Dank');
  expect(container.querySelector('.support-thanks')).toBeNull();
  expect(buy().disabled).toBe(false);
});
it('does not celebrate a failed purchase', async () => {
  mocks.purchase.mockRejectedValue(new Error('Store unavailable'));
  await act(async () => { buy().click(); });
  expect(container.querySelector('.support-thanks')).toBeNull();
  expect(container.textContent).toContain('nicht vollständig bestätigt');
  expect(buy().disabled).toBe(false);
});
it('shows loading until verification and thanks while finalization is still running', async () => {
  let confirm!: () => void;
  let finish!: (result: string) => void;
  mocks.purchase.mockImplementation((_id, onConfirmed) => {
    confirm = onConfirmed;
    return new Promise(resolve => { finish = resolve; });
  });
  await act(async () => { buy().click(); });
  expect(container.querySelector('.support-spinner')).not.toBeNull();
  expect(container.textContent).toContain('Dein Kauf wird bestätigt.');
  expect(container.textContent).not.toContain('Gefällt dir die App?');
  expect(container.querySelector('.support-prices')).toBeNull();
  await act(async () => { confirm(); });
  expect(container.querySelector('.support-spinner')).toBeNull();
  expect(container.querySelector('.support-thanks')).not.toBeNull();
  await act(async () => { finish('success'); });
  expect(container.textContent).toContain('Ein großes Dankeschön an dich!');
});

it('closes a benefit preview before the purchase dialog without triggering a purchase',async()=>{
  await act(async()=>container.querySelector<HTMLButtonElement>('.support-gold-benefit')!.click());
  expect(document.querySelector('.support-widget-carousel')).not.toBeNull();
  await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));
  expect(document.querySelector('.support-widget-carousel')).toBeNull();
  expect(onClose).not.toHaveBeenCalled();expect(mocks.purchase).not.toHaveBeenCalled();
  expect(container.querySelectorAll('.support-prices button')).toHaveLength(4);
});

it('shows two gold benefit previews without a personal sign-off or external profile',()=>{
 expect(container.querySelectorAll('.support-gold-benefit')).toHaveLength(2);
 expect(container.querySelector('.support-gold-benefits h4')?.textContent).toBe('Als Dankeschön erhältst du:');
 expect(container.textContent).not.toContain('Liebe Grüße');
 expect(container.querySelector('a[href*="linkedin"]')).toBeNull();
});

it('clearly identifies repeat tips without implying another feature unlock',async()=>{
 const tips=products.map(product=>({...product,identifier:product.identifier.replace('support_gold_','support_')}));
 await act(async()=>root.render(createElement(SupportDialog,{automatic:false,products:tips,busy:false,onBusy:()=>{},onProducts:()=>{},onClose,onSupported:async()=>{}})));
 expect(container.textContent).toContain('Erneut unterstützen');expect(container.textContent).toContain('Deine Extras bleiben freigeschaltet.');
 expect(container.querySelector('.support-gold-benefits h4')?.textContent).toBe('Bereits für dich freigeschaltet:');
 expect(container.textContent).not.toContain('Als Dankeschön erhältst du:');
});
