import {
  NoPurchaseToRestoreError,
  ProductId,
  PurchaseCancelledError,
  PurchaseFailedError,
  PurchaseFlowState,
} from '../types';
import { mockPurchaseService, PurchaseOverride } from '../mock/mockPurchaseService';
import { mockBillingBackend } from '../mock/mockBillingBackend';
import { purchaseStore } from '../storage/purchaseStore';

export interface PaywallState {
  status: PurchaseFlowState;
  entitled: boolean;
  error?: string;
}

const BUSY_STATES: PurchaseFlowState[] = ['purchasing', 'purchased_pending_confirmation', 'restoring'];

export class PaywallController {
  private state: PaywallState = { status: 'idle', entitled: false };
  private listeners = new Set<() => void>();

  constructor(private readonly productId: ProductId) {}

  getState(): PaywallState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<PaywallState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  async hydrate(): Promise<void> {
    const entitled = await mockBillingBackend.isEntitled(this.productId);
    this.setState({ entitled, status: entitled ? 'confirmed' : 'idle' });
  }

  isBusy(): boolean {
    return BUSY_STATES.includes(this.state.status);
  }

  async purchase(override?: PurchaseOverride, opts?: { purchaseDelayMs?: number; confirmDelayMs?: number }): Promise<void> {
    if (this.isBusy()) return;

    this.setState({ status: 'purchasing', error: undefined });
    try {
      const record = await mockPurchaseService.purchase(this.productId, override, opts?.purchaseDelayMs);
      this.setState({ status: 'purchased_pending_confirmation' });
      const entitlement = await mockBillingBackend.confirmPurchase(this.productId, record.purchaseToken, opts?.confirmDelayMs);
      this.setState({ status: 'confirmed', entitled: entitlement.active });
    } catch (err) {
      this.handlePurchaseError(err);
    }
  }

  async restore(opts?: { restoreDelayMs?: number; confirmDelayMs?: number }): Promise<void> {
    if (this.isBusy()) return;

    this.setState({ status: 'restoring', error: undefined });
    try {
      const record = await mockPurchaseService.restore(this.productId, opts?.restoreDelayMs);
      const existing = await mockBillingBackend.getEntitlement(this.productId);
      if (existing?.active && existing.purchaseToken === record.purchaseToken) {
        this.setState({ status: 'confirmed', entitled: true });
        return;
      }
      this.setState({ status: 'purchased_pending_confirmation' });
      const entitlement = await mockBillingBackend.confirmPurchase(this.productId, record.purchaseToken, opts?.confirmDelayMs);
      this.setState({ status: 'confirmed', entitled: entitlement.active });
    } catch (err) {
      if (err instanceof NoPurchaseToRestoreError) {
        this.setState({ status: this.state.entitled ? 'confirmed' : 'failed', error: 'No previous purchase found on this account' });
      } else {
        this.setState({ status: this.state.entitled ? 'confirmed' : 'failed', error: 'Restore failed' });
      }
    }
  }

  private handlePurchaseError(err: unknown): void {
    const fallbackStatus: PurchaseFlowState = this.state.entitled ? 'confirmed' : 'idle';
    if (err instanceof PurchaseCancelledError) {
      this.setState({ status: fallbackStatus === 'confirmed' ? 'confirmed' : 'cancelled' });
    } else if (err instanceof PurchaseFailedError) {
      this.setState({ status: fallbackStatus === 'confirmed' ? 'confirmed' : 'failed', error: err.message });
    } else {
      this.setState({ status: fallbackStatus === 'confirmed' ? 'confirmed' : 'failed', error: 'Unexpected error' });
    }
  }

  async reset(): Promise<void> {
    await purchaseStore.reset();
    await mockBillingBackend.reset();
    this.setState({ status: 'idle', entitled: false, error: undefined });
  }
}
