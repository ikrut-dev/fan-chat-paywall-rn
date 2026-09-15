import { AcceptedServerMessage, MessageAuthor, RejectedError, ResponseLostError } from '../types';
import { serverAcceptedStore } from '../storage/serverAcceptedStore';
import { networkSimulator } from './networkSimulator';
import { delay, mulberry32 } from '../utils/seededRandom';
import { FAN_PHRASES, CREATOR_PHRASES } from './historyPhrases';

export const HISTORY_SIZE = 50_000;
const HISTORY_SEED = 20260101;
const MIN_LATENCY_MS = 250;
const MAX_LATENCY_MS = 650;

export type SendOverride = 'lost-response' | 'rejected' | undefined;

let historyCache: AcceptedServerMessage[] | null = null;

function buildHistory(): AcceptedServerMessage[] {
  const rand = mulberry32(HISTORY_SEED);
  const messages: AcceptedServerMessage[] = [];
  const spacingMs = 12_000;
  const start = Date.now() - HISTORY_SIZE * spacingMs;
  for (let i = 0; i < HISTORY_SIZE; i++) {
    const isFan = rand() > 0.42;
    const authorId: MessageAuthor = isFan ? 'fan' : 'me';
    const pool = isFan ? FAN_PHRASES : CREATOR_PHRASES;
    const text = pool[Math.floor(rand() * pool.length)];
    const order = i + 1;
    messages.push({
      clientId: `hist_${order}`,
      serverId: `hist_srv_${order}`,
      order,
      text,
      authorId,
      createdAt: start + i * spacingMs,
    });
  }
  return messages;
}

function getHistory(): AcceptedServerMessage[] {
  if (!historyCache) historyCache = buildHistory();
  return historyCache;
}

function randomLatency(): number {
  return MIN_LATENCY_MS + Math.random() * (MAX_LATENCY_MS - MIN_LATENCY_MS);
}

export const mockChatServer = {
  async ensureHistorySeeded(): Promise<void> {
    await serverAcceptedStore.reserveOrderRangeForHistory(HISTORY_SIZE);
  },

  getHistoryTotalCount(): number {
    return HISTORY_SIZE;
  },

  async getHistoryPage(opts: { beforeOrder?: number; limit?: number } = {}): Promise<{ items: AcceptedServerMessage[]; hasMore: boolean }> {
    const limit = opts.limit ?? 40;
    const history = getHistory();
    const upperExclusive = opts.beforeOrder ?? HISTORY_SIZE + 1;
    const items: AcceptedServerMessage[] = [];
    for (let order = upperExclusive - 1; order >= 1 && items.length < limit; order--) {
      items.push(history[order - 1]);
    }
    const hasMore = upperExclusive - 1 - limit >= 1;
    return { items, hasMore };
  },

  async send(clientId: string, text: string, authorId: MessageAuthor, override?: SendOverride): Promise<AcceptedServerMessage> {
    return networkSimulator.guard(async () => {
      await delay(randomLatency());

      const existing = await serverAcceptedStore.getByClientId(clientId);
      if (existing) {
        if (override === 'lost-response') throw new ResponseLostError();
        return existing;
      }

      if (override === 'rejected') {
        throw new RejectedError('Message blocked by the creator\'s word filter. Edit the text and try again.');
      }

      const accepted = await serverAcceptedStore.accept(clientId, text, authorId, Date.now());

      if (override === 'lost-response') {
        throw new ResponseLostError();
      }

      return accepted;
    });
  },

  async createOfflineFanMessages(count = 4): Promise<AcceptedServerMessage[]> {
    await this.ensureHistorySeeded();
    const rand = mulberry32(Date.now() % 1_000_000);
    const texts = Array.from({ length: count }, () => FAN_PHRASES[Math.floor(rand() * FAN_PHRASES.length)]);
    return serverAcceptedStore.createOfflineFanMessages(texts);
  },

  async drainOfflineInbox(): Promise<AcceptedServerMessage[]> {
    return networkSimulator.guard(() => serverAcceptedStore.drainOfflineInbox());
  },

  async reset(): Promise<void> {
    await serverAcceptedStore.reset();
  },
};
