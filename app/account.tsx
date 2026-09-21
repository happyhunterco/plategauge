import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { config } from '../src/config';
import { DevDataBanner } from '../src/components/Kit';
import { LogoMark } from '../src/components/Logo';
import { Button, ErrorNote, Field, Segmented, tap } from '../src/components/UI';
import { appleAvailable, authMode, resetPassword, signIn, signInWithApple, signInWithGoogle, signUp } from '../src/services/auth';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

export default function Account() {
  const params = useLocalSearchParams<{ mode?: 'signin' | 'signup' }>();
  const router = useRouter();
  const { checkout } = useLocalSearchParams<{ checkout?: string }>();
  const account = useStore((s) => s.account);
  const insets = useSafeAreaInsets();
  const onboarded = useStore((s) => !!s.profile);
  const [mode, setMode] = useState<'signup' | 'signin'>(params.mode ?? (onboarded ? 'signup' : 'signin'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [apple, setApple] = useState(false);
  const pwRef = useRef<TextInput>(null);

  useEffect(() => {
    appleAvailable().then(setApple);
  }, []);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const pwOk = password.length >= 8;
  const canSubmit = emailOk && pwOk && (mode === 'signin' || agree);

  const go = async (label: string, job: () => Promise<unknown>) => {
    setErr('');
    setInfo('');
    setBusy(label);
    try {
      const r = (await job()) as { needsConfirmation?: boolean } | undefined;
      if (r?.needsConfirmation) setInfo(`We sent a confirmation link to ${email.trim()}. Open it, then sign in here.`);
    } catch (e) {
      const m = (e as { code?: string; message?: string }).code === 'ERR_REQUEST_CANCELED' ? '' : (e as Error).message;
      setErr(m);
    } finally {
      setBusy(null);
    }
  };

  const needsTerms = mode === 'signup' || !onboarded;
  const social = (fn: () => Promise<unknown>, label: string) => {
    if (needsTerms && mode === 'signup' && !agree) return setErr('Please agree to the Terms and Privacy Policy first.');
    go(label, fn);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        {!onboarded ? (
          <Pressable onPress={() => router.replace('/setup')} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={color.ink} />
          </Pressable>
        ) : null}
        <LogoMark size={48} />
        <Text style={styles.h1} accessibilityRole="header">
          {mode === 'signup' ? 'Save your plan' : 'Welcome back'}
        </Text>
        <Text style={styles.sub}>
          {mode === 'signup'
            ? 'Create an account so your log and goals are backed up and stay with you on any device.'
            : 'Sign in to pick up where you left off.'}
        </Text>

        {authMode === 'development' ? <DevDataBanner text="Development accounts are stored on this device only. Add Supabase keys for real accounts." /> : null}
        {authMode === 'none' ? <ErrorNote text="Sign-in isn’t set up for this build. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY." /> : null}

        <View style={{ marginTop: space.xl, gap: space.m }}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setErr('');
              setInfo('');
            }}
            options={[
              { value: 'signup', label: 'Create account' },
              { value: 'signin', label: 'Sign in' },
            ]}
          />

          {apple ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={
                mode === 'signup' ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
              }
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={14}
              style={{ height: 52 }}
              onPress={() => social(signInWithApple, 'apple')}
            />
          ) : null}
          <Button
            label={`Continue with Google`}
            icon="logo-google"
            kind="secondary"
            loading={busy === 'google'}
            onPress={() => social(signInWithGoogle, 'google')}
          />

          <View style={styles.or}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or with email</Text>
            <View style={styles.orLine} />
          </View>

          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            inputMode="email"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => pwRef.current?.focus()}
          />
          <View>
            <Field
              ref={pwRef}
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!show}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              returnKeyType="go"
              onSubmitEditing={() => canSubmit && go('email', () => (mode === 'signup' ? signUp(email.trim(), password) : signIn(email.trim(), password)))}
            />
            <Pressable
              onPress={() => setShow(!show)}
              style={styles.eye}
              accessibilityRole="button"
              accessibilityLabel={show ? 'Hide password' : 'Show password'}
              hitSlop={8}
            >
              <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={color.sub} />
            </Pressable>
            {mode === 'signup' && password.length > 0 && !pwOk ? <Text style={styles.hint}>Use at least 8 characters.</Text> : null}
          </View>

          {mode === 'signup' ? (
            <Pressable
              onPress={() => {
                tap();
                setAgree(!agree);
              }}
              style={styles.agree}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: agree }}
            >
              <Ionicons name={agree ? 'checkbox' : 'square-outline'} size={22} color={agree ? color.gauge : color.faint} />
              <Text style={styles.agreeText}>
                I agree to the{' '}
                <Text style={styles.link} onPress={() => config.termsUrl && Linking.openURL(config.termsUrl)}>
                  Terms
                </Text>{' '}
                and{' '}
                <Text style={styles.link} onPress={() => config.privacyUrl && Linking.openURL(config.privacyUrl)}>
                  Privacy Policy
                </Text>
                .
              </Text>
            </Pressable>
          ) : null}

          {err ? <ErrorNote text={err} /> : null}
          {info ? (
            <Text style={styles.info} accessibilityRole="alert">
              {info}
            </Text>
          ) : null}

          <Button
            label={mode === 'signup' ? 'Create account' : 'Sign in'}
            loading={busy === 'email'}
            disabled={!canSubmit || authMode === 'none'}
            onPress={() => go('email', () => (mode === 'signup' ? signUp(email.trim(), password) : signIn(email.trim(), password)))}
          />
          {mode === 'signin' ? (
            <Button
              label="Forgot password?"
              kind="ghost"
              loading={busy === 'reset'}
              onPress={() => {
                if (!emailOk) return setErr('Enter your email above, then tap Forgot password.');
                go('reset', async () => {
                  await resetPassword(email.trim());
                  setInfo(`If ${email.trim()} has an account, a reset link is on its way.`);
                });
              }}
            />
          ) : null}
          {mode === 'signin' && !onboarded ? <Text style={styles.hint}>New here? Go back to set up your plan first.</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: space.l, maxWidth: 480, width: '100%', alignSelf: 'center' },
  back: { width: 44, height: 44, justifyContent: 'center', marginLeft: -10, marginBottom: space.s },
  h1: { fontFamily: font.displayBold, fontSize: 28, color: color.ink, letterSpacing: -0.6, marginTop: space.l },
  sub: { fontSize: 15, color: color.sub, marginTop: space.s, lineHeight: 21 },
  or: { flexDirection: 'row', alignItems: 'center', gap: space.m, marginVertical: space.xs },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: color.line },
  orText: { color: color.faint, fontSize: 13 },
  eye: { position: 'absolute', right: 12, bottom: 12, width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12, color: color.sub, marginTop: 6 },
  agree: { flexDirection: 'row', gap: space.s, alignItems: 'center', minHeight: 44 },
  agreeText: { flex: 1, fontSize: 14, color: color.ink },
  link: { color: color.gauge, fontWeight: '600' },
  info: { fontSize: 14, color: color.ink, backgroundColor: color.wash2, padding: space.m, borderRadius: 12, lineHeight: 20 },
});
