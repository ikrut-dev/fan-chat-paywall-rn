import { KVStore } from './kvStore';
import { AcceptedServerMessage, MessageAuthor } from '../types';
import { newServerId } from '../utils/id';

interface ServerState {
  acceptedByClientId: Record<string, AcceptedServerMessage>;
  nextOrder: number;
  offlineInbox: AcceptedServerMessage[];
}

const store = new KVStore<ServerState>('mockserver:state:v1', {
  acceptedByClientId: {},
  nextOrder: 1,
  offlineInbox: [],
});

export const serverAcceptedStore = {
  async getByClientId(clientId: string): Promise<AcceptedServerMessage | undefined> {
    const state = await store.read();
    return state.acceptedByClientId[clientId];
  },

  async accept(clientId: string, text: string, authorId: MessageAuthor, createdAt: number): Promise<AcceptedServerMessage> {
    const next = await store.update((state) => {
      if (state.acceptedByClientId[clientId]) return state;
      const accepted: AcceptedServerMessage = { clientId, serverId: newServerId(), order: state.nextOrder, text, authorId, createdAt };
      return {
        ...state,
        nextOrder: state.nextOrder + 1,
        acceptedByClientId: { ...state.acceptedByClientId, [clientId]: accepted },
      };
    });
    return next.acceptedByClientId[clientId];
  },

  async createOfflineFanMessages(texts: string[]): Promise<AcceptedServerMessage[]> {
    const createdIds: string[] = [];
    const next = await store.update((state) => {
      let nextOrder = state.nextOrder;
      const acceptedByClientId = { ...state.acceptedByClientId };
      const created: AcceptedServerMessage[] = [];
      for (const text of texts) {
        const clientId = `fan_${newServerId()}`;
        const msg: AcceptedServerMessage = { clientId, serverId: newServerId(), order: nextOrder, text, authorId: 'fan', createdAt: Date.now() };
        nextOrder += 1;
        acceptedByClientId[clientId] = msg;
        created.push(msg);
        createdIds.push(clientId);
      }
      return { ...state, nextOrder, acceptedByClientId, offlineInbox: [...state.offlineInbox, ...created] };
    });
    return createdIds.map((id) => next.acceptedByClientId[id]);
  },

  async drainOfflineInbox(): Promise<AcceptedServerMessage[]> {
    let drained: AcceptedServerMessage[] = [];
    await store.update((state) => {
      if (state.offlineInbox.length === 0) return state;
      drained = state.offlineInbox;
      return { ...state, offlineInbox: [] };
    });
    return drained;
  },

  async reserveOrderRangeForHistory(count: number): Promise<void> {
    const state = await store.read();
    if (state.nextOrder > count) return;
    await store.write({ ...state, nextOrder: count + 1 });
  },

  async reset(): Promise<void> {
    await store.clear();
  },

  invalidateCache(): void {
    store.invalidateCache();
  },
};
