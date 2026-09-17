import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ErrorNote, Field, Screen } from '../src/components/UI';
import { changePassword, resetPassword } from '../src/services/auth';
import { useStore } from '../src/store';
import { color, space } from '../src/theme';

/** Two cases: arrived from the reset email (set a new password) or asking for a link. */
export default function ResetPassword() {
  const router = useRouter();
  const recovery = useStore((s) => s.recovery);
  const setRecovery = useStore((s) => s.setRecovery);
  const [email, setEmail] = useState(useStore.getState().account?.email ?? '');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');

  const run = async (job: () => Promise<void>, msg: string) => {
    setErr('');
    setBusy(true);
    try {
      await job();
      setDone(msg);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        {recovery ? (
          <>
            <Text style={styles.body}>Choose a new password (at least 8 characters).</Text>
            <Field label="New password" value={pw} onChangeText={setPw} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
            {err ? <ErrorNote text={err} /> : null}
            {done ? <Text style={styles.done}>{done}</Text> : null}
            <Button
              label={done ? 'Continue' : 'Save password'}
              loading={busy}
              disabled={!done && pw.length < 8}
              onPress={() => (done ? (setRecovery(false), router.replace('/')) : run(() => changePassword(pw), 'Password updated.'))}
            />
          </>
        ) : (
          <>
            <Text style={styles.body}>Enter your account email and we’ll send a reset link.</Text>
            <Field
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              inputMode="email"
              keyboardType="email-address"
              autoComplete="email"
            />
            {err ? <ErrorNote text={err} /> : null}
            {done ? <Text style={styles.done}>{done}</Text> : null}
            <Button
              label="Send reset link"
              loading={busy}
              disabled={!/@/.test(email)}
              onPress={() => run(() => resetPassword(email.trim()), `If ${email.trim()} has an account, a link is on its way.`)}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.l },
  body: { fontSize: 15, color: color.ink, lineHeight: 21 },
  done: { fontSize: 14, color: color.ink, backgroundColor: '#E8F3FF', padding: space.m, borderRadius: 12 },
});
