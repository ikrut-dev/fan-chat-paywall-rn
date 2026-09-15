let counter = 0;

export function newClientId(prefix = 'c'): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${counter}_${random}`;
}

export function newServerId(): string {
  return `srv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function newPurchaseToken(): string {
  return `tok_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
