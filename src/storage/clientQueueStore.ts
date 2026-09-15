import { KVStore } from './kvStore';
import { ChatMessage } from '../types';

const store = new KVStore<ChatMessage[]>('chat:client-queue:v1', []);

export const clientQueueStore = {
  async all(): Promise<ChatMessage[]> {
    return store.read();
  },

  async upsert(message: ChatMessage): Promise<ChatMessage[]> {
    return store.update((current) => {
      const idx = current.findIndex((m) => m.clientId === message.clientId);
      if (idx === -1) return [...current, message];
      const next = current.slice();
      next[idx] = message;
      return next;
    });
  },

  async reset(): Promise<void> {
    await store.clear();
  },

  invalidateCache(): void {
    store.invalidateCache();
  },
};
