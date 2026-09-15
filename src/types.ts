export type MessageAuthor = 'me' | 'fan';

export type MessageStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface ChatMessage {
  clientId: string;
  text: string;
  authorId: MessageAuthor;
  createdAt: number;
  status: MessageStatus;
  serverId?: string;
  order?: number;
  lastError?: string;
  errorKind?: 'recoverable' | 'action-required';
  retryCount?: number;
}

export interface AcceptedServerMessage {
  clientId: string;
  serverId: string;
  order: number;
  text: string;
  authorId: MessageAuthor;
  createdAt: number;
}

export class OfflineError extends Error {
  constructor() {
    super('Device is offline');
    this.name = 'OfflineError';
  }
}

export class ResponseLostError extends Error {
  constructor() {
    super('Response lost in transit');
    this.name = 'ResponseLostError';
  }
}

export class RejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RejectedError';
  }
}

export class PurchaseCancelledError extends Error {
  constructor() {
    super('Purchase was cancelled');
    this.name = 'PurchaseCancelledError';
  }
}

export class PurchaseFailedError extends Error {
  constructor(message = 'The store could not complete this purchase') {
    super(message);
    this.name = 'PurchaseFailedError';
  }
}

export class NoPurchaseToRestoreError extends Error {
  constructor() {
    super('No previous purchase found to restore');
    this.name = 'NoPurchaseToRestoreError';
  }
}

export type ProductId = 'fan_monthly_subscription';

export interface Product {
  id: ProductId;
  title: string;
  description: string;
  priceLabel: string;
}

export type PurchaseFlowState =
  | 'idle'
  | 'purchasing'
  | 'purchased_pending_confirmation'
  | 'confirmed'
  | 'failed'
  | 'cancelled'
  | 'restoring';

export interface PurchaseRecord {
  productId: ProductId;
  purchaseToken: string;
  purchasedAt: number;
}

export interface EntitlementRecord {
  productId: ProductId;
  active: boolean;
  purchaseToken: string;
  confirmedAt: number;
}
