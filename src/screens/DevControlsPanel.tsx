import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

interface Props {
  online: boolean;
  onToggleOnline: (value: boolean) => void;
  onSendLostResponse: () => void;
  onSendRejected: () => void;
  onSimulateOfflineIncoming: () => void;
  onReconnect: () => void;
  onReset: () => void;
  onRunPerfProbe: () => void;
  perfResult: string | null;
}

export function DevControlsPanel(props: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={() => setExpanded((v) => !v)} style={styles.header} accessibilityRole="button">
        <Text style={styles.headerText}>Dev controls {expanded ? '▲' : '▼'}</Text>
        <View style={styles.onlineRow}>
          <View style={[styles.dot, { backgroundColor: props.online ? '#16A34A' : '#DC2626' }]} />
          <Text style={styles.onlineLabel}>{props.online ? 'Online' : 'Offline'}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <ScrollView style={styles.body} horizontal={false}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Network</Text>
            <Switch value={props.online} onValueChange={props.onToggleOnline} />
          </View>

          <Button label="Send (simulate lost response)" onPress={props.onSendLostResponse} />
          <Button label="Send (simulate rejected)" onPress={props.onSendRejected} />
          <Button label="Simulate 4 incoming (while offline)" onPress={props.onSimulateOfflineIncoming} />
          <Button label="Reconnect now" onPress={props.onReconnect} />
          <Button label="Run scroll+type perf probe" onPress={props.onRunPerfProbe} />
          {props.perfResult && <Text style={styles.perfResult}>{props.perfResult}</Text>}
          <Button label="Reset everything" onPress={props.onReset} destructive />
        </ScrollView>
      )}
    </View>
  );
}

function Button({ label, onPress, destructive }: { label: string; onPress: () => void; destructive?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.button, destructive && styles.buttonDestructive]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <Text style={[styles.buttonLabel, destructive && styles.buttonLabelDestructive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#111827', maxHeight: 320 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerText: { color: '#F9FAFB', fontWeight: '600', fontSize: 13 },
  onlineRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  onlineLabel: { color: '#D1D5DB', fontSize: 12 },
  body: { paddingHorizontal: 14, paddingBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { color: '#F9FAFB', fontSize: 13 },
  button: { backgroundColor: '#374151', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10, marginTop: 6 },
  buttonDestructive: { backgroundColor: '#7F1D1D' },
  buttonLabel: { color: '#F9FAFB', fontSize: 13, textAlign: 'center' },
  buttonLabelDestructive: { color: '#FECACA' },
  perfResult: { color: '#A7F3D0', fontSize: 11, marginTop: 8, fontFamily: 'Courier' },
});
