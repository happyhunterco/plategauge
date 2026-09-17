import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { config, hasAuth, hasServer } from '../config';
import { useStore, type Account } from '../store';
import { api, ApiError } from './http';
import { supabase } from './supabase';
import { pullAll, pushProfile } from './sync';

WebBrowser.maybeCompleteAuthSession();

export const authMode: 'supabase' | 'development' | 'none' = hasAuth ? 'supabase' : config.devData ? 'development' : 'none';

const setAccount = (a: Account | null) => useStore.getState().setAccount(a);

const friendly = (m: string) =>
  /invalid login/i.test(m)
    ? 'Email or password is incorrect.'
    : /already registered|already exists/i.test(m)
      ? 'That email already has an account. Sign in instead.'
      : /password should be/i.test(m)
        ? 'Use at least 8 characters for your password.'
        : /email not confirmed/i.test(m)
          ? 'Check your inbox to confirm your email, then sign in.'
          : /rate limit/i.test(m)
            ? 'Too many attempts. Wait a minute and try again.'
            : m;

function requireAuth() {
  if (authMode === 'none') throw new ApiError('Accounts aren’t connected yet. Add your Supabase keys to enable sign-in.', 'no_auth');
}

/** After any sign-in: keep the onboarding answers from this device, or pull the saved ones. */
async function afterSignIn(id: string, email: string | null, provider: Account['provider']) {
  setAccount({ id, email, provider, dev: authMode === 'development' });
  if (authMode !== 'supabase') return;
  const local = useStore.getState();
  if (local.profile && local.goals) await pushProfile().catch(() => {});
  else await pullAll().catch(() => {});
}

export async function signUp(email: string, password: string) {
  requireAuth();
  if (authMode === 'development') return afterSignIn(`dev-${email}`, email, 'email');
  const { data, error } = await supabase!.auth.signUp({ email, password, options: { emailRedirectTo: makeRedirectUri({ path: 'account' }) } });
  if (error) throw new ApiError(friendly(error.message), 'auth');
  if (!data.session) return { needsConfirmation: true as const };
  await afterSignIn(data.user!.id, data.user!.email ?? email, 'email');
  return { needsConfirmation: false as const };
}

export async function signIn(email: string, password: string) {
  requireAuth();
  if (authMode === 'development') return afterSignIn(`dev-${email}`, email, 'email');
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError(friendly(error.message), 'auth');
  await afterSignIn(data.user.id, data.user.email ?? email, 'email');
}

export const appleAvailable = () => (Platform.OS === 'ios' ? AppleAuthentication.isAvailableAsync() : Promise.resolve(false));

export async function signInWithApple() {
  requireAuth();
  if (authMode === 'development') return afterSignIn('dev-apple', null, 'apple');
  const raw = Crypto.randomUUID();
  const hashed = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, raw);
  const cred = await AppleAuthentication.signInAsync({
    requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL, AppleAuthentication.AppleAuthenticationScope.FULL_NAME],
    nonce: hashed,
  });
  if (!cred.identityToken) throw new ApiError('Apple didn’t return a sign-in token. Try again.', 'auth');
  const { data, error } = await supabase!.auth.signInWithIdToken({ provider: 'apple', token: cred.identityToken, nonce: raw });
  if (error) throw new ApiError(friendly(error.message), 'auth');
  const name = [cred.fullName?.givenName, cred.fullName?.familyName].filter(Boolean).join(' ');
  if (name) useStore.getState().updateProfile({ name });
  await afterSignIn(data.user.id, data.user.email ?? null, 'apple');
}

export async function signInWithGoogle() {
  requireAuth();
  if (authMode === 'development') return afterSignIn('dev-google', null, 'google');
  const redirectTo = makeRedirectUri({ path: 'account' });
  const { data, error } = await supabase!.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' } });
  if (error) throw new ApiError(friendly(error.message), 'auth');
  if (Platform.OS === 'web') return;
  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (result.type !== 'success') return;
  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new ApiError('Google sign-in didn’t finish. Try again.', 'auth');
  const ex = await supabase!.auth.exchangeCodeForSession(code);
  if (ex.error) throw new ApiError(friendly(ex.error.message), 'auth');
  await afterSignIn(ex.data.user.id, ex.data.user.email ?? null, 'google');
}

export async function resetPassword(email: string) {
  requireAuth();
  if (authMode === 'development') return;
  const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: makeRedirectUri({ path: 'reset-password' }) });
  if (error) throw new ApiError(friendly(error.message), 'auth');
}

export async function changePassword(password: string) {
  requireAuth();
  if (authMode === 'development') return;
  const { error } = await supabase!.auth.updateUser({ password });
  if (error) throw new ApiError(friendly(error.message), 'auth');
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut().catch(() => {});
  setAccount(null);
}

export async function deleteAccount() {
  if (authMode === 'supabase') {
    if (!hasServer) throw new ApiError('Account deletion needs the PlateGauge server.', 'no_server');
    const { data } = await supabase!.auth.getSession();
    const token = data.session?.access_token;
    if (!token) throw new ApiError('Sign in again to delete your account.', 'auth');
    await api('/api/account/delete', { method: 'POST', token });
    await supabase!.auth.signOut().catch(() => {});
  }
  useStore.getState().resetAll();
}

/** Keeps the store in sync with the real session (refreshes, sign-outs from another device). */
export function watchSession() {
  if (!supabase) return () => {};
  supabase.auth.getSession().then(({ data }) => {
    const u = data.session?.user;
    const cur = useStore.getState().account;
    if (u && !cur) setAccount({ id: u.id, email: u.email ?? null, provider: 'email' });
    if (!u && cur && !cur.dev) setAccount(null);
    useStore.getState().setAuthReady(true);
  });
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') setAccount(null);
    if (event === 'PASSWORD_RECOVERY') useStore.getState().setRecovery(true);
    if (session?.user && !useStore.getState().account) setAccount({ id: session.user.id, email: session.user.email ?? null, provider: 'email' });
  });
  return () => data.subscription.unsubscribe();
}

export async function accessToken() {
  return supabase ? ((await supabase.auth.getSession()).data.session?.access_token ?? null) : null;
}
