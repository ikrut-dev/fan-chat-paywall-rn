import { KVStore } from './kvStore';
import { PurchaseRecord } from '../types';

const store = new KVStore<PurchaseRecord[]>('billing:purchases:v1', []);

export const purchaseStore = {
  async all(): Promise<PurchaseRecord[]> {
    return store.read();
  },
  async add(record: PurchaseRecord): Promise<void> {
    await store.update((current) => {
      if (current.some((r) => r.purchaseToken === record.purchaseToken)) return current;
      return [...current, record];
    });
  },
  async latestFor(productId: PurchaseRecord['productId']): Promise<PurchaseRecord | undefined> {
    const all = await store.read();
    return all.filter((r) => r.productId === productId).sort((a, b) => b.purchasedAt - a.purchasedAt)[0];
  },
  async reset(): Promise<void> {
    await store.clear();
  },
  invalidateCache(): void {
    store.invalidateCache();
  },
};
