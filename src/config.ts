import { Platform } from 'react-native';

/**
 * Public configuration only (EXPO_PUBLIC_* ships inside the app). Secrets live in Netlify env vars.
 * Web equivalents of the VITE_* names from the brief: EXPO_PUBLIC_APP_STORE_URL / EXPO_PUBLIC_GOOGLE_PLAY_URL.
 */
const trim = (v?: string) => (v ?? '').trim().replace(/\/$/, '');

export const config = {
  apiUrl: trim(process.env.EXPO_PUBLIC_API_URL),
  appKey: trim(process.env.EXPO_PUBLIC_APP_KEY),
  supabaseUrl: trim(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: trim(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  googleWebClientId: trim(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
  appStoreUrl: trim(process.env.EXPO_PUBLIC_APP_STORE_URL),
  googlePlayUrl: trim(process.env.EXPO_PUBLIC_GOOGLE_PLAY_URL),
  termsUrl: trim(process.env.EXPO_PUBLIC_TERMS_URL),
  privacyUrl: trim(process.env.EXPO_PUBLIC_PRIVACY_URL),
  /** "development" enables labeled fixture data and device-only accounts. Never set in production. */
  devData: process.env.EXPO_PUBLIC_DATA_MODE === 'development' && process.env.EXPO_PUBLIC_APP_ENV !== 'production',
  appEnv: process.env.EXPO_PUBLIC_APP_ENV || 'development',
  supportEmail: trim(process.env.EXPO_PUBLIC_SUPPORT_EMAIL),
};

export const hasServer = !!config.apiUrl;
export const hasAuth = !!(config.supabaseUrl && config.supabaseAnonKey);
export const isWeb = Platform.OS === 'web';
