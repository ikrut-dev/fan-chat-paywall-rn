import { ChatController } from '../src/chat/chatController';
import { mockChatServer } from '../src/mock/mockChatServer';
import { networkSimulator } from '../src/mock/networkSimulator';
import { resetAllState, simulateAppRestart } from '../test-helpers/testUtils';

describe('offline queueing, restart recovery and reconnect', () => {
  beforeEach(resetAllState);

  test('messages sent offline are shown as queued immediately', async () => {
    networkSimulator.setOnline(false);
    const controller = new ChatController();
    await controller.hydrate();

    await controller.sendMessage('one');
    await controller.sendMessage('two');
    await controller.sendMessage('three');

    const mine = controller.getDisplayMessages().filter((m) => m.status === 'queued');
    expect(mine).toHaveLength(3);

    controller.dispose();
  });

  test('a force-quit and relaunch while offline leaves all three still waiting', async () => {
    networkSimulator.setOnline(false);
    const controllerA = new ChatController();
    await controllerA.hydrate();
    await controllerA.sendMessage('one');
    await controllerA.sendMessage('two');
    await controllerA.sendMessage('three');
    controllerA.dispose();

    simulateAppRestart();
    const controllerB = new ChatController();
    await controllerB.hydrate();

    const mine = controllerB.getDisplayMessages().filter((m) => m.status === 'queued');
    expect(mine).toHaveLength(3);
    expect(mine.map((m) => m.text).sort()).toEqual(['one', 'three', 'two']);

    controllerB.dispose();
  });

  test('reconnecting after a restart delivers offline fan messages and flushes pending sends without duplicates', async () => {
    networkSimulator.setOnline(false);
    const controllerA = new ChatController();
    await controllerA.hydrate();
    await controllerA.sendMessage('one');
    await controllerA.sendMessage('two');
    await controllerA.sendMessage('three');
    controllerA.dispose();

    simulateAppRestart();
    const controllerB = new ChatController();
    await controllerB.hydrate();

    const created = await mockChatServer.createOfflineFanMessages(4);
    expect(created).toHaveLength(4);

    networkSimulator.setOnline(true);
    await controllerB.reconnect();

    const all = controllerB.getDisplayMessages();
    const fanIncoming = all.filter((m) => created.some((c) => c.serverId === m.serverId));
    const mySent = all.filter((m) => m.clientId.startsWith('c_'));

    expect(fanIncoming).toHaveLength(4);
    expect(mySent).toHaveLength(3);
    expect(mySent.every((m) => m.status === 'sent')).toBe(true);
    const serverIds = mySent.map((m) => m.serverId);
    expect(new Set(serverIds).size).toBe(3);

    await controllerB.reconnect();
    const afterSecondReconnect = controllerB.getDisplayMessages();
    expect(afterSecondReconnect.filter((m) => m.clientId.startsWith('c_'))).toHaveLength(3);
    expect(afterSecondReconnect.filter((m) => created.some((c) => c.serverId === m.serverId))).toHaveLength(4);

    controllerB.dispose();
  });
});
