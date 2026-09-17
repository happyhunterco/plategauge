import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';
import { config, hasAuth } from '../config';

/**
 * Session storage: iOS Keychain / Android Keystore via SecureStore. Sessions can exceed
 * SecureStore's per-item size, so values are split into chunks. Web uses localStorage.
 */
const CHUNK = 1800;
const secureChunked = {
  async getItem(key: string) {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    if (!count) return null;
    const parts = await Promise.all(Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some((p) => p == null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    const old = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    const parts = value.match(new RegExp(`.{1,${CHUNK}}`, 'gs')) ?? [''];
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
    for (let i = parts.length; i < old; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  },
  async removeItem(key: string) {
    const n = Number((await SecureStore.getItemAsync(`${key}.n`)) ?? 0);
    for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
    await SecureStore.deleteItemAsync(`${key}.n`);
  },
};

export const supabase: SupabaseClient | null = hasAuth
  ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? AsyncStorage : secureChunked,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === 'web',
        flowType: 'pkce',
      },
    })
  : null;

if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (s) => (s === 'active' ? supabase!.auth.startAutoRefresh() : supabase!.auth.stopAutoRefresh()));
}
