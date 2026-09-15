import { KVStore } from './kvStore';
import { EntitlementRecord, ProductId } from '../types';

const store = new KVStore<Record<ProductId, EntitlementRecord | undefined>>('backend:entitlements:v1', {
  fan_monthly_subscription: undefined,
});

export const entitlementStore = {
  async get(productId: ProductId): Promise<EntitlementRecord | undefined> {
    const state = await store.read();
    return state[productId];
  },

  async isActive(productId: ProductId): Promise<boolean> {
    const record = await this.get(productId);
    return !!record?.active;
  },

  async confirm(productId: ProductId, purchaseToken: string): Promise<EntitlementRecord> {
    const state = await store.read();
    const existing = state[productId];
    if (existing && existing.purchaseToken === purchaseToken && existing.active) return existing;

    const record: EntitlementRecord = { productId, active: true, purchaseToken, confirmedAt: Date.now() };
    await store.write({ ...state, [productId]: record });
    return record;
  },

  async reset(): Promise<void> {
    await store.clear();
  },

  invalidateCache(): void {
    store.invalidateCache();
  },
};
