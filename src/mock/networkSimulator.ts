import { OfflineError } from '../types';

type Listener = (online: boolean) => void;

class NetworkSimulator {
  private online = true;
  private listeners = new Set<Listener>();

  isOnline(): boolean {
    return this.online;
  }

  setOnline(next: boolean): void {
    if (this.online === next) return;
    this.online = next;
    this.listeners.forEach((l) => l(next));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async guard<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.online) throw new OfflineError();
    return fn();
  }
}

export const networkSimulator = new NetworkSimulator();
