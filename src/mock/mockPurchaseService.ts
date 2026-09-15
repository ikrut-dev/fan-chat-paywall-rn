import {
  NoPurchaseToRestoreError,
  ProductId,
  PurchaseCancelledError,
  PurchaseFailedError,
  PurchaseRecord,
} from '../types';
import { purchaseStore } from '../storage/purchaseStore';
import { newPurchaseToken } from '../utils/id';
import { delay } from '../utils/seededRandom';

export type PurchaseOverride = 'success' | 'cancelled' | 'failed' | undefined;

const PURCHASE_DELAY_MS = 900;

const inFlight = new Map<ProductId, Promise<PurchaseRecord>>();

export const mockPurchaseService = {
  isPurchasing(productId: ProductId): boolean {
    return inFlight.has(productId);
  },

  async purchase(productId: ProductId, override: PurchaseOverride = 'success', delayMs = PURCHASE_DELAY_MS): Promise<PurchaseRecord> {
    const existing = inFlight.get(productId);
    if (existing) return existing;

    const attempt = (async () => {
      await delay(delayMs);
      if (override === 'cancelled') throw new PurchaseCancelledError();
      if (override === 'failed') throw new PurchaseFailedError();

      const record: PurchaseRecord = { productId, purchaseToken: newPurchaseToken(), purchasedAt: Date.now() };
      await purchaseStore.add(record);
      return record;
    })();

    inFlight.set(productId, attempt);
    try {
      return await attempt;
    } finally {
      inFlight.delete(productId);
    }
  },

  async restore(productId: ProductId, delayMs = PURCHASE_DELAY_MS / 2): Promise<PurchaseRecord> {
    await delay(delayMs);
    const record = await purchaseStore.latestFor(productId);
    if (!record) throw new NoPurchaseToRestoreError();
    return record;
  },
};
