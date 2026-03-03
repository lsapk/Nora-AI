import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';
import { mmkvStorage } from './storage';

const CHUNK_SIZE = 1900;
const CHUNK_META_SUFFIX = '__chunk_count';

// We'll use MMKV for the "Remember Me" preference as it's fast
export const isRememberMeEnabled = () => {
  return mmkvStorage.getItem('remember_me') !== 'false';
};

export const setRememberMePreference = (enabled: boolean) => {
  mmkvStorage.setItem('remember_me', enabled ? 'true' : 'false');
};

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    // If it's an auth token and remember me is disabled, we might want to handle it
    // But Supabase handles the session. We'll control persistence via the client config.
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}${CHUNK_META_SUFFIX}`);

    if (!chunkCountRaw) {
      return SecureStore.getItemAsync(key);
    }

    const chunkCount = Number.parseInt(chunkCountRaw, 10);
    if (Number.isNaN(chunkCount) || chunkCount <= 0) {
      return null;
    }

    const chunks = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) => SecureStore.getItemAsync(`${key}__${index}`))
    );

    if (chunks.some((chunk) => chunk == null)) {
      return null;
    }

    return chunks.join('');
  },
  setItem: async (key: string, value: string) => {
    const totalChunks = Math.ceil(value.length / CHUNK_SIZE);

    await Promise.all(
      Array.from({ length: totalChunks }, (_, index) => {
        const chunk = value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
        return SecureStore.setItemAsync(`${key}__${index}`, chunk);
      })
    );

    await SecureStore.setItemAsync(`${key}${CHUNK_META_SUFFIX}`, String(totalChunks));
  },
  removeItem: async (key: string) => {
    const chunkCountRaw = await SecureStore.getItemAsync(`${key}${CHUNK_META_SUFFIX}`);
    const chunkCount = Number.parseInt(chunkCountRaw ?? '', 10);

    if (!Number.isNaN(chunkCount) && chunkCount > 0) {
      await Promise.all(
        Array.from({ length: chunkCount }, (_, index) => SecureStore.deleteItemAsync(`${key}__${index}`))
      );
      await SecureStore.deleteItemAsync(`${key}${CHUNK_META_SUFFIX}`);
    }

    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true, // We always persist to the adapter, but the adapter can be cleared
    detectSessionInUrl: false,
  },
});
