import AsyncStorage from '@react-native-async-storage/async-storage';
import { clientQueueStore } from '../src/storage/clientQueueStore';
import { serverAcceptedStore } from '../src/storage/serverAcceptedStore';
import { entitlementStore } from '../src/storage/entitlementStore';
import { purchaseStore } from '../src/storage/purchaseStore';
import { networkSimulator } from '../src/mock/networkSimulator';

export async function resetAllState(): Promise<void> {
  await AsyncStorage.clear();
  clientQueueStore.invalidateCache();
  serverAcceptedStore.invalidateCache();
  entitlementStore.invalidateCache();
  purchaseStore.invalidateCache();
  networkSimulator.setOnline(true);
}

export function simulateAppRestart(): void {
  clientQueueStore.invalidateCache();
  serverAcceptedStore.invalidateCache();
  entitlementStore.invalidateCache();
  purchaseStore.invalidateCache();
}
