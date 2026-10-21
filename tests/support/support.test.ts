import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  storage: new Map<string, string>(), platform: 'android',
  getProducts: vi.fn(), purchaseProduct: vi.fn(), getPurchases: vi.fn(),
  consumePurchase: vi.fn(), acknowledgePurchase: vi.fn(), restorePurchases: vi.fn(),
}));
vi.mock('@capacitor/preferences', () => ({ Preferences: {
  get: vi.fn(async ({ key }: { key: string }) => ({ value: mocks.storage.get(key) ?? null })),
  set: vi.fn(async ({ key, value }: { key: string; value: string }) => { mocks.storage.set(key, value); }),
} }));
vi.mock('@capacitor/core', () => ({ Capacitor: {
  getPlatform: () => mocks.platform, isNativePlatform: () => mocks.platform !== 'web',
} }));
vi.mock('@capgo/native-purchases', () => ({ PURCHASE_TYPE: { INAPP: 'inapp' }, NativePurchases: {
  ...mocks, isBillingSupported: async () => ({ isBillingSupported: true }),
} }));
import { DAY, initialSupportState, shouldPrompt, SUPPORT_STATE_KEY, updateSupportState, markSupported, startSupportSession, resumeSupportSession, nextSupportSession, recordSupportOffer } from '../../src/support/state';
import { loadSupportProducts, purchaseSupport, recoverSupportPurchases, restoreSupportPurchases } from '../../src/support/purchases';

beforeEach(() => {
  mocks.storage.clear(); mocks.platform = 'android'; vi.clearAllMocks();
  mocks.consumePurchase.mockResolvedValue(undefined); mocks.acknowledgePurchase.mockResolvedValue(undefined);
  mocks.getPurchases.mockResolvedValue({ purchases: [] });
});
const state = () => JSON.parse(mocks.storage.get(SUPPORT_STATE_KEY)!);
const purchase = { transactionId: 'tx1', productIdentifier: 'support_gold_3', purchaseToken: 'token1', purchaseState: '1' };

describe('support reminder', () => {
  it('counts initial mount once and ignores short resumes', async () => {
    const a = await startSupportSession(true);
    const b = await startSupportSession(true);
    expect(a.sessions).toBe(1); expect(b.sessions).toBe(1);
    expect((await resumeSupportSession(a.lastSessionAt + 29 * 60_000)).sessions).toBe(1);
    expect((await resumeSupportSession(a.lastSessionAt + 30 * 60_000)).sessions).toBe(2);
  });
  it('requires both the waiting period and actual sessions', () => {
    const s = { ...initialSupportState(false, DAY), sessions: 10 };
    expect(shouldPrompt(s, 15 * DAY - 1)).toBe(false);
    expect(shouldPrompt(s, 15 * DAY)).toBe(true);
    expect(shouldPrompt({ ...s, sessions: 9 }, 30 * DAY)).toBe(false);
    expect(initialSupportState(true, DAY).eligibleAt).toBe(8 * DAY);
  });
  it('waits 90 days without a lifetime cap and respects dismissal, payment or pending payment', () => {
    const s = { ...initialSupportState(false, DAY), sessions: 10, promptCount: 1, lastPromptAt: 15 * DAY };
    expect(shouldPrompt(s, 105 * DAY - 1)).toBe(false);
    expect(shouldPrompt(s, 105 * DAY)).toBe(true);
    expect(shouldPrompt({ ...s, promptCount: 20 }, 200 * DAY)).toBe(true);
    for (const patch of [{ dismissed: true }, { hasSupported: true }, { pending: true }]) {
      expect(shouldPrompt({ ...s, ...patch }, 200 * DAY)).toBe(false);
    }
  });
  it('preserves purchase state when writes overlap', async () => {
    await Promise.all([markSupported(), updateSupportState(s => ({ ...s, promptCount: 1 }))]);
    expect(state()).toMatchObject({ hasSupported: true, promptCount: 1 });
  });
  it('does not restart prompts for corrupt local data', async () => {
    mocks.storage.set(SUPPORT_STATE_KEY, '{broken');
    expect((await updateSupportState(s => s)).dismissed).toBe(true);
  });
});

describe('store purchases', () => {
  it('never calls the web plugin mock for products, recovery or purchases', async () => {
    mocks.platform = 'web';
    expect(await loadSupportProducts()).toEqual([]);
    await recoverSupportPurchases();
    await expect(purchaseSupport('support_1')).rejects.toThrow('installierten App');
    expect(mocks.getProducts).not.toHaveBeenCalled();
    expect(mocks.getPurchases).not.toHaveBeenCalled();
    expect(mocks.purchaseProduct).not.toHaveBeenCalled();
  });
  it('uses store prices and only the configured product IDs', async () => {
    mocks.getProducts.mockResolvedValue({ products: [
      { identifier: 'support_gold_10', price: 10, priceString: '10,00 €' },
      { identifier: 'support_gold_5', price: 5, priceString: '5,00 €' },
      { identifier: 'support_2', price: 2, priceString: '2,00 €' },
      { identifier: 'support_gold_3', price: 3, priceString: '3,00 €' },
      { identifier: 'unrelated', price: 20, priceString: '$20' },
      { identifier: 'support_gold_1', price: 1, priceString: '$1.00' },
    ] });
    expect((await loadSupportProducts()).map(p => p.priceString)).toEqual(['$1.00', '3,00 €', '5,00 €', '10,00 €']);
    expect(mocks.getProducts).toHaveBeenCalledWith(expect.objectContaining({ productIdentifiers: ['support_gold_1', 'support_gold_3', 'support_gold_5', 'support_gold_10'] }));
  });
  it('recovers retired two-euro transactions without allowing new purchases', async () => {
    mocks.getPurchases.mockResolvedValue({ purchases: [{ ...purchase, productIdentifier: 'support_2' }] });
    await recoverSupportPurchases();
    expect(state().hasSupported).toBe(true);
    expect(mocks.consumePurchase).toHaveBeenCalledWith({ purchaseToken: 'token1' });
    await expect(purchaseSupport('support_2' as Parameters<typeof purchaseSupport>[0])).rejects.toThrow('installierten App');
    expect(mocks.purchaseProduct).not.toHaveBeenCalled();
  });
  it('persists the durable unlock before acknowledging Android, without consuming it', async () => {
    mocks.purchaseProduct.mockResolvedValue(purchase);
    mocks.acknowledgePurchase.mockImplementation(async () => { expect(state()).toMatchObject({hasSupported:true,goldUnlocked:true}); });
    expect(await purchaseSupport('support_gold_3')).toBe('success');
    expect(mocks.purchaseProduct).toHaveBeenCalledWith(expect.objectContaining({ isConsumable: false, autoAcknowledgePurchases: false }));
    expect(mocks.acknowledgePurchase).toHaveBeenCalledExactlyOnceWith({ purchaseToken: 'token1' });
    expect(mocks.consumePurchase).not.toHaveBeenCalled();
  });
  it('finishes a verified iOS purchase without invoking Android consume', async () => {
    mocks.platform = 'ios'; mocks.purchaseProduct.mockResolvedValue(purchase);
    expect(await purchaseSupport('support_gold_3')).toBe('success');
    expect(mocks.acknowledgePurchase).toHaveBeenCalledWith({ purchaseToken: 'tx1' });
    expect(mocks.consumePurchase).not.toHaveBeenCalled();
  });
  it('does not mark pending Android or iOS purchases as supported', async () => {
    mocks.purchaseProduct.mockResolvedValue({ ...purchase, purchaseState: '2' });
    expect(await purchaseSupport('support_gold_3')).toBe('pending');
    expect(state()).toMatchObject({ pending: true, hasSupported: false });
    mocks.platform = 'ios'; mocks.purchaseProduct.mockRejectedValue(new Error('Transaction pending'));
    expect(await purchaseSupport('support_gold_3')).toBe('pending');
    expect(state().hasSupported).toBe(false);
    expect(mocks.consumePurchase).not.toHaveBeenCalled();
  });
  it('handles cancellation without recording support', async () => {
    mocks.purchaseProduct.mockRejectedValue(new Error('User cancelled'));
    expect(await purchaseSupport('support_gold_3')).toBe('cancelled');
    expect(mocks.storage.has(SUPPORT_STATE_KEY)).toBe(false);
  });
  it('rejects mismatched purchase confirmations without consuming them', async () => {
    mocks.purchaseProduct.mockResolvedValue({ ...purchase, productIdentifier: 'another_product' });
    await expect(purchaseSupport('support_gold_3')).rejects.toThrow('Unerwartete');
    expect(mocks.consumePurchase).not.toHaveBeenCalled();
    expect(mocks.storage.has(SUPPORT_STATE_KEY)).toBe(false);
  });
  it('recovers only completed support purchases after restart', async () => {
    mocks.getPurchases.mockResolvedValue({ purchases: [purchase,
      { ...purchase, productIdentifier: 'support_1', purchaseState: '2' },
      { ...purchase, productIdentifier: 'another_product' }] });
    await recoverSupportPurchases();
    expect(state().hasSupported).toBe(true);
    expect(mocks.acknowledgePurchase).toHaveBeenCalledExactlyOnceWith({ purchaseToken: 'token1' });
  });
  it('retries acknowledgement after a store error without losing the support flag', async () => {
    mocks.purchaseProduct.mockResolvedValue(purchase);
    mocks.acknowledgePurchase.mockRejectedValueOnce(new Error('Store offline'));
    expect(await purchaseSupport('support_gold_3')).toBe('success');
    expect(state().hasSupported).toBe(true);
    mocks.getPurchases.mockResolvedValue({ purchases: [purchase] });
    await recoverSupportPurchases();
    expect(mocks.acknowledgePurchase).toHaveBeenCalledTimes(2);
  });
});

it('restores the durable icon with empty local storage and switches to repeatable tips', async () => {
  mocks.getPurchases.mockResolvedValue({ purchases: [{ ...purchase, isAcknowledged: true }] });
  expect(await restoreSupportPurchases()).toBe(true);
  expect(state().goldUnlocked).toBe(true);
  mocks.getProducts.mockResolvedValue({ products: [{ identifier: 'support_3', price:3, priceString:'3,00 €' }] });
  expect((await loadSupportProducts())[0].identifier).toBe('support_3');
  mocks.purchaseProduct.mockResolvedValue({...purchase, productIdentifier:'support_3'});
  await purchaseSupport('support_3'); await purchaseSupport('support_3');
  expect(mocks.consumePurchase).toHaveBeenCalledTimes(2);
  expect(state().goldUnlocked).toBe(true);
});
it('does not restore revoked or pending icon entitlements', async () => {
  mocks.getPurchases.mockResolvedValue({ purchases: [ {...purchase, revocationDate:'2026-10-21'}, {...purchase,purchaseState:'2'} ] });
  expect(await restoreSupportPurchases()).toBe(false);
  expect(state().goldUnlocked).toBe(false);
  expect(mocks.acknowledgePurchase).not.toHaveBeenCalled();
});
it('explicitly syncs iOS purchases only when restore is requested', async () => {
  mocks.platform='ios'; mocks.getPurchases.mockResolvedValue({ purchases: [purchase] });
  await recoverSupportPurchases(); expect(mocks.restorePurchases).not.toHaveBeenCalled();
  mocks.storage.clear();
  expect(await restoreSupportPurchases()).toBe(true);
  expect(mocks.restorePurchases).toHaveBeenCalledOnce(); expect(state().goldUnlocked).toBe(true);
});
it('reports confirmed purchases before store finalization completes', async () => {
  let finish!: () => void;
  mocks.purchaseProduct.mockResolvedValue(purchase);
  mocks.acknowledgePurchase.mockImplementationOnce(()=>new Promise<void>(resolve=>{ finish=resolve; }));
  const confirmed=vi.fn(); const result=purchaseSupport('support_gold_3',confirmed);
  await vi.waitFor(()=>expect(confirmed).toHaveBeenCalledOnce());
  expect(state().goldUnlocked).toBe(true); finish(); expect(await result).toBe('success');
});

it('grandfathers existing local consumable supporters and keeps them unlocked after empty store queries',async()=>{
 const old={...initialSupportState(true,Date.now()),hasSupported:true};
 delete (old as Partial<typeof old>).legacySupported;
 mocks.storage.set(SUPPORT_STATE_KEY,JSON.stringify(old));
 expect((await updateSupportState(s=>s)).legacySupported).toBe(true);
 expect(await restoreSupportPurchases()).toBe(true);
 expect(state().legacySupported).toBe(true);
});
it('restores legacy iOS support amounts including the retired two-euro purchase',async()=>{
 mocks.platform='ios';mocks.getPurchases.mockResolvedValue({purchases:[{...purchase,productIdentifier:'support_2'}]});
 expect(await restoreSupportPurchases()).toBe(true);expect(state()).toMatchObject({legacySupported:true,hasSupported:true});
});

it('manual offer views restart the quiet period without consuming an automatic impression',()=>{
 const s=recordSupportOffer({...initialSupportState(false,0),sessions:10},100*DAY,false);
 expect(s.promptCount).toBe(0);expect(s.lastPromptAt).toBeNull();
 expect(shouldPrompt(s,190*DAY-1)).toBe(false);expect(shouldPrompt(s,190*DAY)).toBe(true);
});
it('protects the first return after a six-month practice phase, even beyond the quarterly due date',()=>{
 const before={...initialSupportState(false,0),sessions:20,lastSessionAt:10*DAY,lastUsedAt:10*DAY,lastPromptAt:5*DAY,promptCount:2};
 const returned=nextSupportSession(before,190*DAY,true);
 expect(returned.sessions).toBe(21);expect(shouldPrompt(returned,190*DAY)).toBe(false);
 const sameDay=nextSupportSession(returned,190*DAY+3600000);
 expect(shouldPrompt(sameDay,190*DAY+3600000)).toBe(false);
 const tomorrow=nextSupportSession(sameDay,191*DAY);
 expect(shouldPrompt(tomorrow,191*DAY)).toBe(true);
});
it('does not postpone ordinary daily use or reset never-ask-again on a return',()=>{
 const s={...initialSupportState(false,0),sessions:20,lastSessionAt:99*DAY,lastUsedAt:99*DAY};
 expect(shouldPrompt(nextSupportSession(s,100*DAY,true),100*DAY)).toBe(true);
 expect(shouldPrompt(nextSupportSession({...s,dismissed:true},300*DAY,true),302*DAY)).toBe(false);
});
it('migrates existing two-prompt state without resetting dismissal, purchase or history',async()=>{
 const s={...initialSupportState(true,0),sessions:20,promptCount:2,lastPromptAt:20*DAY,dismissed:true,hasSupported:true};
 for(const key of ['lastOfferAt','lastUsedAt','returnEligibleAt','returnSession'])delete (s as unknown as Record<string,unknown>)[key];
 mocks.storage.set(SUPPORT_STATE_KEY,JSON.stringify(s));
 const migrated=await updateSupportState(s=>s);
 expect(migrated).toMatchObject({promptCount:2,lastOfferAt:20*DAY,returnSession:0,dismissed:true,hasSupported:true});
});
