import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePaywallController } from '../payments/usePaywallController';
import { FAN_SUBSCRIPTION } from '../payments/product';
import { PurchaseOverride } from '../mock/mockPurchaseService';

const STATUS_COPY: Record<string, string> = {
  idle: 'Not subscribed',
  purchasing: 'Contacting the store...',
  purchased_pending_confirmation: 'Payment received - confirming your access...',
  confirmed: 'Subscribed',
  failed: 'Something went wrong',
  cancelled: 'Purchase cancelled',
  restoring: 'Restoring your purchase...',
};

export function PaywallScreen() {
  const { controller, state, ready } = usePaywallController(FAN_SUBSCRIPTION.id);
  const [devOverride, setDevOverride] = useState<PurchaseOverride>('success');
  const busy = controller.isBusy();

  if (!ready) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{FAN_SUBSCRIPTION.title}</Text>
          <Text style={styles.description}>{FAN_SUBSCRIPTION.description}</Text>
          <Text style={styles.price}>{FAN_SUBSCRIPTION.priceLabel}</Text>

          <View style={styles.statusRow}>
            {busy && <ActivityIndicator size="small" style={styles.statusSpinner} />}
            <Text style={[styles.statusText, state.entitled && styles.statusTextActive]}>
              {STATUS_COPY[state.status] ?? state.status}
            </Text>
          </View>
          {state.error && <Text style={styles.error}>{state.error}</Text>}
          <Text style={styles.billingNote}>Simulated billing - no real store or card is used.</Text>

          <TouchableOpacity
            style={[styles.primaryButton, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={() => void controller.purchase(devOverride)}
            accessibilityRole="button"
            accessibilityLabel={state.entitled ? 'Already subscribed' : 'Subscribe'}
          >
            <Text style={styles.primaryButtonLabel}>{state.entitled ? 'Subscribed ✓' : 'Subscribe'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={() => void controller.restore()}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonLabel}>Restore purchase</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.devPanel}>
          <Text style={styles.devTitle}>Dev controls - simulate store outcome</Text>
          {(['success', 'cancelled', 'failed'] as const).map((option) => (
            <View key={option} style={styles.devRow}>
              <Text style={styles.devLabel}>{option}</Text>
              <Switch value={devOverride === option} onValueChange={() => setDevOverride(option)} />
            </View>
          ))}
          <TouchableOpacity style={styles.resetButton} onPress={() => void controller.reset()}>
            <Text style={styles.resetLabel}>Reset purchases &amp; entitlement</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  description: { fontSize: 14, color: '#6B7280', marginTop: 6 },
  price: { fontSize: 18, fontWeight: '600', color: '#4F46E5', marginTop: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
  statusSpinner: { marginRight: 8 },
  statusText: { fontSize: 14, color: '#374151' },
  statusTextActive: { color: '#16A34A', fontWeight: '600' },
  error: { color: '#DC2626', fontSize: 13, marginTop: 6 },
  billingNote: { color: '#9CA3AF', fontSize: 11, marginTop: 4 },
  primaryButton: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, marginTop: 20 },
  primaryButtonLabel: { color: '#FFFFFF', textAlign: 'center', fontWeight: '700', fontSize: 15 },
  secondaryButton: { paddingVertical: 12, marginTop: 8 },
  secondaryButtonLabel: { color: '#4F46E5', textAlign: 'center', fontWeight: '600' },
  buttonDisabled: { opacity: 0.5 },
  devPanel: { marginTop: 24, backgroundColor: '#111827', borderRadius: 12, padding: 16 },
  devTitle: { color: '#F9FAFB', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  devRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  devLabel: { color: '#D1D5DB', fontSize: 13, textTransform: 'capitalize' },
  resetButton: { marginTop: 10, paddingVertical: 8 },
  resetLabel: { color: '#FCA5A5', fontSize: 12, textAlign: 'center' },
});
