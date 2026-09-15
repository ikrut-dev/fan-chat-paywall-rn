import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatController } from '../chat/useChatController';
import { ChatMessage } from '../types';
import { MessageBubble } from '../components/MessageBubble';
import { ChatInputBar } from '../components/ChatInputBar';
import { DevControlsPanel } from './DevControlsPanel';
import { networkSimulator } from '../mock/networkSimulator';
import { FrameMonitor, formatFrameReport } from '../perf/frameMonitor';
import { useReducedMotion } from '../utils/useReducedMotion';

export function ChatScreen() {
  const { controller, messages, ready } = useChatController();
  const [online, setOnline] = useState(networkSimulator.isOnline());
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [perfResult, setPerfResult] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();
  const listRef = useRef<FlashListRef<ChatMessage>>(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    return networkSimulator.subscribe(setOnline);
  }, []);

  useEffect(() => {
    if (messages.length > lastCountRef.current && !loadingOlder) {
      listRef.current?.scrollToEnd({ animated: !reduceMotion });
    }
    lastCountRef.current = messages.length;
  }, [messages.length, loadingOlder, reduceMotion]);

  const handleLoadOlder = useCallback(async () => {
    if (!controller.hasMoreHistory() || loadingOlder) return;
    setLoadingOlder(true);
    await controller.loadOlderHistory();
    setLoadingOlder(false);
  }, [controller, loadingOlder]);

  const handleSend = useCallback((text: string) => void controller.sendMessage(text), [controller]);
  const handleRetry = useCallback((clientId: string) => void controller.retry(clientId), [controller]);

  const runPerfProbe = useCallback(async () => {
    setPerfResult('Running...');
    const monitor = new FrameMonitor();
    monitor.start();
    for (let i = 0; i < 6; i += 1) {
      await new Promise((resolve) => setTimeout(resolve, 220));
      const offset = i % 2 === 0 ? 4000 : 0;
      listRef.current?.scrollToOffset({ offset, animated: true });
    }
    const report = monitor.stop();
    setPerfResult(formatFrameReport(report));
  }, []);

  if (!ready) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <DevControlsPanel
        online={online}
        onToggleOnline={networkSimulator.setOnline.bind(networkSimulator)}
        onSendLostResponse={() => void controller.sendMessage('Testing a lost response...', 'lost-response')}
        onSendRejected={() => void controller.sendMessage('!banned some blocked phrase', 'rejected')}
        onSimulateOfflineIncoming={() => void mockCreateOfflineIncoming()}
        onReconnect={() => void controller.reconnect()}
        onReset={() => void controller.reset()}
        onRunPerfProbe={runPerfProbe}
        perfResult={perfResult}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loadingOlder && (
          <View style={styles.loadingOlder}>
            <ActivityIndicator size="small" />
          </View>
        )}
        <FlashList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.clientId}
          renderItem={({ item }) => <MessageBubble message={item} onRetry={handleRetry} />}
          onStartReached={handleLoadOlder}
          onStartReachedThreshold={2}
          maintainVisibleContentPosition={{ startRenderingFromBottom: true }}
          contentContainerStyle={styles.listContent}
        />
        <ChatInputBar onSend={handleSend} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

async function mockCreateOfflineIncoming() {
  const { mockChatServer } = await import('../mock/mockChatServer');
  await mockChatServer.createOfflineFanMessages(4);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingVertical: 10 },
  loadingOlder: { paddingVertical: 6, alignItems: 'center' },
});
