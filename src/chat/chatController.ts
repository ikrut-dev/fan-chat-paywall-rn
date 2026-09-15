import { ChatMessage, OfflineError, RejectedError, ResponseLostError } from '../types';
import { clientQueueStore } from '../storage/clientQueueStore';
import { mockChatServer, SendOverride } from '../mock/mockChatServer';
import { networkSimulator } from '../mock/networkSimulator';
import { newClientId } from '../utils/id';

const HISTORY_PAGE_SIZE = 40;

export class ChatController {
  private liveMessages: ChatMessage[] = [];
  private historyMessages: ChatMessage[] = [];
  private historyCursor: number | undefined;
  private historyHasMore = true;
  private listeners = new Set<() => void>();
  private unsubscribeNetwork?: () => void;
  private inFlightSends = new Map<string, Promise<void>>();
  private reconnectInFlight: Promise<void> | null = null;
  private cachedDisplay: ChatMessage[] | null = null;

  async hydrate(): Promise<void> {
    await mockChatServer.ensureHistorySeeded();
    this.liveMessages = await clientQueueStore.all();
    await this.loadOlderHistory();
    this.notify();

    if (networkSimulator.isOnline()) {
      await this.reconnect();
    }
    this.unsubscribeNetwork = networkSimulator.subscribe((online) => {
      if (online) void this.reconnect();
    });
  }

  dispose(): void {
    this.unsubscribeNetwork?.();
    this.listeners.clear();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.cachedDisplay = null;
    this.listeners.forEach((l) => l());
  }

  getDisplayMessages(): ChatMessage[] {
    if (this.cachedDisplay) return this.cachedDisplay;
    const confirmedLive = this.liveMessages
      .filter((m) => m.order !== undefined)
      .sort((a, b) => (a.order as number) - (b.order as number));
    const unconfirmedLive = this.liveMessages
      .filter((m) => m.order === undefined)
      .sort((a, b) => a.createdAt - b.createdAt);
    this.cachedDisplay = [...this.historyMessages, ...confirmedLive, ...unconfirmedLive];
    return this.cachedDisplay;
  }

  hasMoreHistory(): boolean {
    return this.historyHasMore;
  }

  async loadOlderHistory(): Promise<void> {
    if (!this.historyHasMore) return;
    const { items, hasMore } = await mockChatServer.getHistoryPage({
      beforeOrder: this.historyCursor,
      limit: HISTORY_PAGE_SIZE,
    });
    if (items.length === 0) {
      this.historyHasMore = false;
      return;
    }
    const asMessages: ChatMessage[] = items
      .slice()
      .reverse()
      .map((a) => ({
        clientId: a.clientId,
        text: a.text,
        authorId: a.authorId,
        createdAt: a.createdAt,
        status: 'sent',
        serverId: a.serverId,
        order: a.order,
      }));
    this.historyMessages = [...asMessages, ...this.historyMessages];
    this.historyCursor = items[items.length - 1].order;
    this.historyHasMore = hasMore;
    this.notify();
  }

  async sendMessage(text: string, override?: SendOverride): Promise<void> {
    const trimmed = text.trim();
    if (!trimmed) return;
    const message: ChatMessage = {
      clientId: newClientId(),
      text: trimmed,
      authorId: 'me',
      createdAt: Date.now(),
      status: 'queued',
    };
    this.liveMessages.push(message);
    await clientQueueStore.upsert(message);
    this.notify();
    await this.flushOne(message.clientId, override);
  }

  async retry(clientId: string, override?: SendOverride): Promise<void> {
    await this.flushOne(clientId, override);
  }

  async flushQueue(): Promise<void> {
    const pending = this.liveMessages.filter((m) => m.status === 'queued');
    for (const message of pending) {
      await this.flushOne(message.clientId);
    }
  }

  async reconnect(): Promise<void> {
    if (this.reconnectInFlight) return this.reconnectInFlight;
    const attempt = this.reconnectInner();
    this.reconnectInFlight = attempt;
    try {
      await attempt;
    } finally {
      this.reconnectInFlight = null;
    }
  }

  private async reconnectInner(): Promise<void> {
    const incoming = await mockChatServer.drainOfflineInbox().catch(() => []);
    for (const accepted of incoming) {
      const asMessage: ChatMessage = {
        clientId: accepted.clientId,
        text: accepted.text,
        authorId: accepted.authorId,
        createdAt: accepted.createdAt,
        status: 'sent',
        serverId: accepted.serverId,
        order: accepted.order,
      };
      await this.upsertLocal(asMessage);
    }
    await this.flushQueue();
  }

  async reset(): Promise<void> {
    this.liveMessages = [];
    this.historyMessages = [];
    this.historyCursor = undefined;
    this.historyHasMore = true;
    await clientQueueStore.reset();
    await mockChatServer.reset();
    await mockChatServer.ensureHistorySeeded();
    await this.loadOlderHistory();
    this.notify();
  }

  private async flushOne(clientId: string, override?: SendOverride): Promise<void> {
    const existingAttempt = this.inFlightSends.get(clientId);
    if (existingAttempt) return existingAttempt;

    const attempt = this.flushOneInner(clientId, override);
    this.inFlightSends.set(clientId, attempt);
    try {
      await attempt;
    } finally {
      this.inFlightSends.delete(clientId);
    }
  }

  private async flushOneInner(clientId: string, override?: SendOverride): Promise<void> {
    const message = this.liveMessages.find((m) => m.clientId === clientId);
    if (!message || message.status === 'sent') return;

    await this.upsertLocal({ ...message, status: 'sending' });
    try {
      const accepted = await mockChatServer.send(clientId, message.text, message.authorId, override);
      await this.upsertLocal({
        ...message,
        status: 'sent',
        serverId: accepted.serverId,
        order: accepted.order,
        lastError: undefined,
        errorKind: undefined,
      });
    } catch (err) {
      if (err instanceof OfflineError || err instanceof ResponseLostError) {
        await this.upsertLocal({
          ...message,
          status: 'queued',
          lastError: err instanceof ResponseLostError ? 'No confirmation received yet - will retry' : undefined,
          errorKind: 'recoverable',
          retryCount: (message.retryCount ?? 0) + 1,
        });
      } else if (err instanceof RejectedError) {
        await this.upsertLocal({ ...message, status: 'failed', lastError: err.message, errorKind: 'action-required' });
      } else {
        await this.upsertLocal({
          ...message,
          status: 'failed',
          lastError: 'Something went wrong. Tap to retry.',
          errorKind: 'recoverable',
        });
      }
    }
  }

  private upsertLocal(message: ChatMessage): Promise<unknown> {
    const idx = this.liveMessages.findIndex((m) => m.clientId === message.clientId);
    if (idx === -1) this.liveMessages.push(message);
    else this.liveMessages[idx] = message;
    this.notify();
    return clientQueueStore.upsert(message);
  }
}
