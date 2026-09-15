import { mockChatServer } from '../src/mock/mockChatServer';
import { serverAcceptedStore } from '../src/storage/serverAcceptedStore';
import { ChatController } from '../src/chat/chatController';
import { newClientId } from '../src/utils/id';
import { resetAllState } from '../test-helpers/testUtils';

describe('duplicate message bug', () => {
  beforeEach(resetAllState);

  test('reproduces the bug: retrying with a fresh id per attempt creates two messages', async () => {
    const text = 'hey, loved the last post!';

    const firstAttemptId = newClientId();
    await serverAcceptedStore.accept(firstAttemptId, text, 'me', Date.now());

    const retryAttemptId = newClientId();
    await serverAcceptedStore.accept(retryAttemptId, text, 'me', Date.now());

    const first = await serverAcceptedStore.getByClientId(firstAttemptId);
    const retry = await serverAcceptedStore.getByClientId(retryAttemptId);

    expect(first).toBeDefined();
    expect(retry).toBeDefined();
    expect(first!.serverId).not.toBe(retry!.serverId);
  });

  test('fix: retrying an accepted-but-lost send with the SAME client id never duplicates it', async () => {
    const clientId = newClientId();
    const text = 'hey, loved the last post!';

    await expect(mockChatServer.send(clientId, text, 'me', 'lost-response')).rejects.toThrow('Response lost');

    const acceptedDespiteLostResponse = await serverAcceptedStore.getByClientId(clientId);
    expect(acceptedDespiteLostResponse).toBeDefined();

    const retryResult = await mockChatServer.send(clientId, text, 'me');

    expect(retryResult.serverId).toBe(acceptedDespiteLostResponse!.serverId);
    expect(retryResult.order).toBe(acceptedDespiteLostResponse!.order);
  });

  test('end-to-end via ChatController: lost response then retry leaves exactly one message in the thread', async () => {
    const controller = new ChatController();
    await controller.hydrate();

    await controller.sendMessage('will this duplicate?', 'lost-response');
    const afterSend = controller.getDisplayMessages().filter((m) => m.text === 'will this duplicate?');
    expect(afterSend).toHaveLength(1);
    expect(afterSend[0].status).toBe('queued');

    const clientId = afterSend[0].clientId;
    await controller.retry(clientId);

    const afterRetry = controller.getDisplayMessages().filter((m) => m.text === 'will this duplicate?');
    expect(afterRetry).toHaveLength(1);
    expect(afterRetry[0].status).toBe('sent');
    expect(afterRetry[0].serverId).toBeDefined();

    controller.dispose();
  });
});
