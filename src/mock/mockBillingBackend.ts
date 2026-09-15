import { EntitlementRecord, ProductId } from '../types';
import { entitlementStore } from '../storage/entitlementStore';
import { delay } from '../utils/seededRandom';

const DEFAULT_CONFIRM_DELAY_MS = 1500;

export const mockBillingBackend = {
  async confirmPurchase(productId: ProductId, purchaseToken: string, delayMs = DEFAULT_CONFIRM_DELAY_MS): Promise<EntitlementRecord> {
    await delay(delayMs);
    return entitlementStore.confirm(productId, purchaseToken);
  },

  async getEntitlement(productId: ProductId) {
    return entitlementStore.get(productId);
  },

  async isEntitled(productId: ProductId): Promise<boolean> {
    return entitlementStore.isActive(productId);
  },

  async reset(): Promise<void> {
    await entitlementStore.reset();
  },
};
