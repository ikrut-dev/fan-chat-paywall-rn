import AsyncStorage from '@react-native-async-storage/async-storage';

function clone<T>(value: T): T {
  return value === undefined ? value : JSON.parse(JSON.stringify(value));
}

export class KVStore<T> {
  private cache: T | undefined;
  private writeQueue: Promise<unknown> = Promise.resolve();

  constructor(private readonly key: string, private readonly defaultValue: T) {}

  async read(): Promise<T> {
    if (this.cache === undefined) {
      const raw = await AsyncStorage.getItem(this.key);
      this.cache = raw ? (JSON.parse(raw) as T) : clone(this.defaultValue);
    }
    return clone(this.cache);
  }

  async write(value: T): Promise<void> {
    this.cache = clone(value);
    await AsyncStorage.setItem(this.key, JSON.stringify(value));
  }

  update(mutate: (current: T) => T): Promise<T> {
    const result = this.writeQueue.then(async () => {
      const current = await this.read();
      const next = mutate(current);
      await this.write(next);
      return next;
    });
    this.writeQueue = result.catch(() => undefined);
    return result;
  }

  async clear(): Promise<void> {
    this.cache = clone(this.defaultValue);
    await AsyncStorage.removeItem(this.key);
  }

  invalidateCache(): void {
    this.cache = undefined;
  }
}
