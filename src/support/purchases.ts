import { Capacitor } from '@capacitor/core';
import { NativePurchases, PURCHASE_TYPE, type Product, type Transaction } from '@capgo/native-purchases';
import { markSupported, updateSupportState } from './state';

import { SUPPORT_PRODUCTS, GOLD_SUPPORT_PRODUCTS, RECOVERABLE_SUPPORT_PRODUCTS, type SupportProductId, type PurchaseResult } from './products';
export { SUPPORT_PRODUCTS, GOLD_SUPPORT_PRODUCTS, SUPPORT_COPY, type SupportProductId, type PurchaseResult } from './products';

export const nativeSupportAvailable = () => Capacitor.isNativePlatform();
export const isGoldProduct = (id: string) => (GOLD_SUPPORT_PRODUCTS as readonly string[]).includes(id);

// The native Android plugin owns a single billing connection; never overlap calls.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> {
  const result = queue.then(action);
  queue = result.catch(() => undefined);
  return result;
}
export function loadSupportProducts(): Promise<Product[]> {
  return serial(async () => {
    if (!nativeSupportAvailable()) return [];
    if (!(await NativePurchases.isBillingSupported()).isBillingSupported) return [];
    const state = await updateSupportState(s => s);
    const ids = state.goldUnlocked ? SUPPORT_PRODUCTS : GOLD_SUPPORT_PRODUCTS;
    const { products } = await NativePurchases.getProducts({ productIdentifiers: [...ids], productType: PURCHASE_TYPE.INAPP });
    return ids.flatMap(id => products.filter(p => p.identifier === id && p.price > 0 && Boolean(p.priceString)));
  });
}

function completed(transaction: Transaction): boolean {
  return RECOVERABLE_SUPPORT_PRODUCTS.includes(transaction.productIdentifier) && !transaction.revocationDate &&
    (Capacitor.getPlatform() !== 'android' || transaction.purchaseState === '1');
}
export async function recordSupportTransaction(transaction: Transaction): Promise<boolean> {
  if (!nativeSupportAvailable() || !completed(transaction)) return false;
  await markSupported(isGoldProduct(transaction.productIdentifier));
  return true;
}

async function finish(transaction: Transaction): Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    if (!transaction.purchaseToken) throw new Error('Kaufbestätigung fehlt.');
    if (isGoldProduct(transaction.productIdentifier)) {
      if (!transaction.isAcknowledged) await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.purchaseToken });
    } else {
      await NativePurchases.consumePurchase({ purchaseToken: transaction.purchaseToken });
    }
  } else {
    await NativePurchases.acknowledgePurchase({ purchaseToken: transaction.transactionId });
  }
}
async function recover(): Promise<boolean> {
  const { purchases } = await NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP });
  const gold = purchases.some(p => completed(p) && isGoldProduct(p.productIdentifier));
  const pending = purchases.some(p => RECOVERABLE_SUPPORT_PRODUCTS.includes(p.productIdentifier) && p.purchaseState === '2');
  for (const purchase of purchases) {
    if (await recordSupportTransaction(purchase)) await finish(purchase);
  }
  const state = await updateSupportState(s => ({ ...s, goldUnlocked: gold, pending }));
  return gold || state.legacySupported;
}
export function recoverSupportPurchases(): Promise<boolean> {
  return serial(async () => nativeSupportAvailable() ? recover() : false);
}
export function restoreSupportPurchases(): Promise<boolean> {
  return serial(async () => {
    if (!nativeSupportAvailable()) throw new Error('Bitte in der installierten App wiederherstellen.');
    // iOS may ask the user to authenticate; only call sync from this explicit action.
    if (Capacitor.getPlatform() === 'ios') await NativePurchases.restorePurchases();
    return recover();
  });
}

export function purchaseSupport(product: SupportProductId, onConfirmed?: () => void): Promise<PurchaseResult> {
  return serial(async () => {
    if (!nativeSupportAvailable() || !(RECOVERABLE_SUPPORT_PRODUCTS.filter(id => id !== 'support_2')).includes(product)) {
      throw new Error('Käufe sind nur in der installierten App verfügbar.');
    }
    let confirmed = false;
    try {
      const transaction = await NativePurchases.purchaseProduct({ productIdentifier: product,
        // Explicitly finish after persistence: this plugin auto-consumes when isConsumable=true.
        productType: PURCHASE_TYPE.INAPP, isConsumable: false, autoAcknowledgePurchases: false });
      if (transaction.productIdentifier !== product) throw new Error('Unerwartete Kaufbestätigung.');
      if (!await recordSupportTransaction(transaction)) {
        if (transaction.revocationDate) throw new Error('Kauf wurde widerrufen.');
        await updateSupportState(s => ({ ...s, pending: true }));
        return 'pending';
      }
      confirmed = true;
      // Show thanks immediately after the verified result, while store finalization runs.
      onConfirmed?.();
      await finish(transaction);
      return 'success';
    } catch (error) {
      // A verified paid purchase stays successful. Recovery retries finishing on next launch.
      if (confirmed) return 'success';
      const message = error instanceof Error ? error.message : String(error);
      if (/cancel|abgebrochen/i.test(message)) return 'cancelled';
      if (/pending/i.test(message)) {
        await updateSupportState(s => ({ ...s, pending: true }));
        return 'pending';
      }
      throw error;
    }
  });
}
