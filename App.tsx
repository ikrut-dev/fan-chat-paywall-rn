import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ChatScreen } from './src/screens/ChatScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';

type Tab = 'chat' | 'paywall';

export default function App() {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <View style={styles.flex}>
          {tab === 'chat' ? <ChatScreen /> : <PaywallScreen />}

          <SafeAreaView edges={['bottom']} style={styles.tabBar}>
            <TabButton label="Chat" active={tab === 'chat'} onPress={() => setTab('chat')} />
            <TabButton label="Subscription" active={tab === 'paywall'} onPress={() => setTab('paywall')} />
          </SafeAreaView>
        </View>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, active && styles.tabButtonActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabButtonActive: { borderTopWidth: 2, borderTopColor: '#4F46E5', marginTop: -StyleSheet.hairlineWidth },
  tabLabel: { color: '#9CA3AF', fontWeight: '600', fontSize: 13 },
  tabLabelActive: { color: '#4F46E5' },
});
