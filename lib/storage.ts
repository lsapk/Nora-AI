import * as SecureStore from 'expo-secure-store';

/**
 * Persistent sync-like storage adapter using SecureStore for persistence.
 * While SecureStore is async, we can pre-load values or use it as a persistent backup.
 * For Nora AI, we use this primarily for the 'remember_me' flag and other small preferences.
 */
const memoryStorage = new Map<string, string>();

// Pre-load common keys if necessary (optional improvement)

export const mmkvStorage = {
  setItem: (key: string, value: string) => {
    memoryStorage.set(key, value);
    SecureStore.setItemAsync(key, value).catch(err => console.error('Storage Error:', err));
  },
  getItem: (key: string) => {
    // This is synchronous for the interface, but we might miss the very first load
    // if not pre-loaded. For 'remember_me', we'll handle the async check in AuthContext.
    return memoryStorage.get(key) ?? null;
  },
  removeItem: (key: string) => {
    memoryStorage.delete(key);
    SecureStore.deleteItemAsync(key).catch(err => console.error('Storage Error:', err));
  },
  // Added a helper for the initial load
  loadInitial: async (key: string) => {
    const val = await SecureStore.getItemAsync(key);
    if (val !== null) memoryStorage.set(key, val);
    return val;
  }
};
