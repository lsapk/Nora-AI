const memoryStorage = new Map<string, string>();

/**
 * Expo Go-safe sync storage adapter.
 *
 * We intentionally avoid `react-native-mmkv` here because Expo Go does not load
 * the Nitro native module required by MMKV.
 */
export const mmkvStorage = {
  setItem: (key: string, value: string) => {
    memoryStorage.set(key, value);
  },
  getItem: (key: string) => {
    return memoryStorage.get(key) ?? null;
  },
  removeItem: (key: string) => {
    memoryStorage.delete(key);
  },
};
