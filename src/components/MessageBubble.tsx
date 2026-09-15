import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { ChatMessage } from '../types';
import { useReducedMotion } from '../utils/useReducedMotion';

interface Props {
  message: ChatMessage;
  onRetry: (clientId: string) => void;
}

function statusLabel(message: ChatMessage): string | null {
  switch (message.status) {
    case 'queued':
      return message.lastError ?? 'Waiting to send...';
    case 'sending':
      return 'Sending...';
    case 'failed':
      return message.errorKind === 'action-required' ? message.lastError ?? 'Action needed' : 'Failed - tap to retry';
    case 'sent':
    default:
      return null;
  }
}

function MessageBubbleImpl({ message, onRetry }: Props) {
  const isMe = message.authorId === 'me';
  const label = isMe ? statusLabel(message) : null;
  const canRetry = message.status === 'failed' && message.errorKind !== 'action-required';
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(180)}
      style={[styles.row, isMe ? styles.rowMe : styles.rowFan]}
    >
      <View
        style={[
          styles.bubble,
          isMe ? styles.bubbleMe : styles.bubbleFan,
          message.status === 'failed' && styles.bubbleFailed,
        ]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${isMe ? 'You' : 'Fan'}: ${message.text}${label ? `. ${label}` : ''}`}
      >
        <Text style={[styles.text, isMe ? styles.textMe : styles.textFan]}>{message.text}</Text>
      </View>
      {label && (
        <Text
          style={[styles.status, message.status === 'failed' && styles.statusError]}
          onPress={canRetry ? () => onRetry(message.clientId) : undefined}
          accessibilityRole={canRetry ? 'button' : undefined}
        >
          {label}
        </Text>
      )}
    </Animated.View>
  );
}

export const MessageBubble = memo(MessageBubbleImpl, (prev, next) => {
  const a = prev.message;
  const b = next.message;
  return (
    a.clientId === b.clientId &&
    a.status === b.status &&
    a.text === b.text &&
    a.lastError === b.lastError &&
    a.order === b.order
  );
});

const styles = StyleSheet.create({
  row: { marginVertical: 3, marginHorizontal: 12, maxWidth: '80%' },
  rowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowFan: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { backgroundColor: '#4F46E5', borderBottomRightRadius: 4 },
  bubbleFan: { backgroundColor: '#E5E7EB', borderBottomLeftRadius: 4 },
  bubbleFailed: { opacity: 0.6, borderWidth: 1, borderColor: '#DC2626' },
  text: { fontSize: 15, lineHeight: 20 },
  textMe: { color: '#FFFFFF' },
  textFan: { color: '#111827' },
  status: { fontSize: 11, color: '#6B7280', marginTop: 2, marginRight: 4 },
  statusError: { color: '#DC2626', textDecorationLine: 'underline' },
});
