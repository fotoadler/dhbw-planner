// First support: durable icon entitlement. Later support: repeatable consumable tips.
export const SUPPORT_PRODUCTS = ['support_1', 'support_3', 'support_5', 'support_10'] as const;
export const GOLD_SUPPORT_PRODUCTS = ['support_gold_1', 'support_gold_3', 'support_gold_5', 'support_gold_10'] as const;
export const RECOVERABLE_SUPPORT_PRODUCTS: readonly string[] = [...SUPPORT_PRODUCTS, ...GOLD_SUPPORT_PRODUCTS, 'support_2'];
export type SupportProductId = typeof SUPPORT_PRODUCTS[number] | typeof GOLD_SUPPORT_PRODUCTS[number];
export type PurchaseResult = 'success' | 'cancelled' | 'pending';
export const SUPPORT_COPY = 'Gefällt dir die App? Um die mit der App verbundenen Kosten etwas abzufangen, freue ich mich über eine kleine, freiwillige Unterstützung.';
