import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Image, Linking, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { dailyBalance } from '../shared/balance';
import { RESTAURANTS } from '../shared/restaurants';
import { config } from '../src/config';
import { InstallPrompt } from '../src/components/InstallPrompt';
import { Avatar, Card } from '../src/components/Kit';
import { StoreBadges } from '../src/components/StoreBadges';
import { Button, Chip, ErrorNote, Field, Group, Row, Screen, Section, Segmented } from '../src/components/UI';
import { dayKey } from '../src/dates';
import { fmt, useDayTotals } from '../src/hooks';
import { authMode, deleteAccount, signOut } from '../src/services/auth';
import { dataMode } from '../src/services/foods';
import { connectHealth, healthServiceName, healthStatus } from '../src/services/health';
import { applyReminders } from '../src/services/reminders';
import { pushProfile } from '../src/services/sync';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

const RESTRICTIONS = ['vegetarian', 'vegan', 'pescatarian', 'gluten-free', 'dairy-free', 'halal', 'kosher'];

function confirm(title: string, body: string, action: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${body}`)) onYes();
    return;
  }
  Alert.alert(title, body, [
    { text: 'Cancel', style: 'cancel' },
    { text: action, style: 'destructive', onPress: onYes },
  ]);
}

export default function Profile() {
  const router = useRouter();
  const s = useStore();
  const p = s.profile;
  const [health, setHealth] = useState<string>('');
  const [notifErr, setNotifErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [allergies, setAllergies] = useState(p?.allergies.join(', ') ?? '');
  const [name, setName] = useState(p?.name ?? '');
  const [username, setUsername] = useState(p?.username ?? '');
  const [nameErr, setNameErr] = useState('');
  const t = useDayTotals(dayKey());

  useEffect(() => {
    healthStatus().then(setHealth);
  }, []);

  if (!p || !s.goals) return null;

  const pickAvatar = async () => {
    // On web, skip the permission check — browsers handle file picker access natively.
    // On native, request permission first.
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Photos access needed', 'Allow photo access to set a profile picture.');
        return;
      }
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!res.canceled && res.assets[0]) save('avatar', res.assets[0].uri);
  };
  const saveName = () => save('name', name.trim());
  const saveUsername = () => {
    const u = username.trim();
    if (u && u.length < 3) return setNameErr('Username needs at least 3 characters.');
    setNameErr('');
    save('username', u || null);
  };
  const metric = s.settings.units === 'metric';
  const w = (lb: number) => (metric ? `${Math.round(lb * 0.4536)} kg` : `${lb} lb`);
  const h = metric ? `${Math.round(p.heightIn * 2.54)} cm` : `${Math.floor(p.heightIn / 12)}′ ${Math.round(p.heightIn % 12)}″`;
  const save = <K extends keyof typeof p>(k: K, v: (typeof p)[K]) => {
    s.updateProfile({ [k]: v } as Partial<typeof p>);
    pushProfile().catch(() => {});
  };
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const setNotif = async (k: keyof typeof s.settings.notifications, v: boolean) => {
    const next = { ...s.settings.notifications, [k]: v };
    setNotifErr('');
    const r = await applyReminders(next).catch(() => 'unsupported' as const);
    if (r === 'denied') return setNotifErr('Notifications are off for Vahla. Turn them on in Settings.');
    if (r === 'unsupported') setNotifErr('Reminders work in the iPhone and Android app.');
    s.updateSettings({ notifications: next });
  };
  const balance = dailyBalance(
    t.list.map((e) => ({ name: e.name, qty: e.qty, nutrients: e.nutrients })),
    { calories: t.budget, protein: s.goals.protein, fiber: s.goals.fiber },
    false,
  );

  return (
    <Screen top={false}>
      <View style={styles.head}>
        <Pressable onPress={pickAvatar} accessibilityRole="button" accessibilityLabel="Change profile photo" style={styles.avatarWrap}>
          {p.avatar ? <Image source={{ uri: p.avatar }} style={styles.avatarImg} accessibilityIgnoresInvertColors /> : <Avatar size={72} />}
          <View style={styles.avatarEdit}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.name}>{p.name || 'Your profile'}</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {p.username ? `@${p.username}` : (s.account?.email ?? (s.account ? `Signed in with ${s.account.provider}` : 'Not signed in'))}
          </Text>
        </View>
      </View>

      <Section title="Your info">
        <Field label="Display name" value={name} onChangeText={setName} onBlur={() => saveName()} placeholder="Your name" />
        <Field
          label="Username"
          value={username}
          autoCapitalize="none"
          autoCorrect={false}
          onChangeText={(t) =>
            setUsername(
              t
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '')
                .slice(0, 20),
            )
          }
          onBlur={saveUsername}
          placeholder="username"
          style={{ marginTop: space.m }}
        />
        <Text style={styles.fine}>Your username is how friends will find you when groups arrive. Letters, numbers and underscores.</Text>
        {nameErr ? <ErrorNote text={nameErr} /> : null}
      </Section>

      <Section title="Body">
        <Group>
          <Row title="Current weight" value={w(p.weightLb)} onPress={() => router.push('/quick?kind=weight')} />
          <Row title="Goal weight" value={w(p.targetLb)} onPress={() => router.push('/targets')} />
          <Row title="Height" value={h} onPress={() => router.push('/targets')} />
          <Row title="Age" value={String(p.age)} onPress={() => router.push('/targets')} last />
        </Group>
      </Section>

      <Section title="Goals">
        <Group>
          <Row title="Calories" value={fmt(s.goals.calories)} onPress={() => router.push('/targets')} />
          <Row title="Protein · Carbs · Fat" value={`${s.goals.protein} · ${s.goals.carbs} · ${s.goals.fat}g`} onPress={() => router.push('/targets')} />
          <Row title="Pace" value={p.goal === 'maintain' ? 'Maintain' : `${p.ratePerWeek} lb/week`} onPress={() => router.push('/targets')} last />
        </Group>
        <Text style={styles.label}>Add activity to my food budget</Text>
        <Segmented
          value={s.settings.exerciseMode}
          onChange={(v) => s.updateSettings({ exerciseMode: v })}
          options={[
            { value: 'none', label: 'No' },
            { value: 'half', label: 'Half' },
            { value: 'full', label: 'All' },
          ]}
        />
        <Text style={styles.fine}>Many people eat back half, since calorie burn estimates tend to run high.</Text>
      </Section>

      <Section title="Food preferences">
        <View style={styles.chips}>
          {RESTRICTIONS.map((r) => (
            <Chip key={r} label={r} on={p.restrictions.includes(r)} onPress={() => save('restrictions', toggle(p.restrictions, r))} />
          ))}
        </View>
        <Field
          label="Allergies"
          value={allergies}
          onChangeText={setAllergies}
          onBlur={() =>
            save(
              'allergies',
              allergies
                .split(',')
                .map((a) => a.trim())
                .filter(Boolean),
            )
          }
          placeholder="peanuts, shellfish"
          style={{ marginTop: space.m }}
        />
        <Text style={styles.label}>Favorite restaurants</Text>
        <View style={styles.chips}>
          {RESTAURANTS.map((r) => (
            <Chip
              key={r.id}
              label={r.name}
              on={p.favoriteRestaurants.includes(r.id)}
              onPress={() => save('favoriteRestaurants', toggle(p.favoriteRestaurants, r.id))}
            />
          ))}
        </View>
      </Section>

      <Section title="Daily Balance">
        <Card>
          <Text style={styles.body}>
            A day-level check from 0 to 100. It looks at protein, calories, fiber, sodium, total sugar and variety, and skips anything your foods don’t list. It
            never grades a single food.
          </Text>
          {balance.ready ? (
            <View style={{ gap: 8, marginTop: space.m }}>
              <Text style={styles.big}>Today: {balance.score}</Text>
              {balance.factors.map((f) => (
                <View key={f.id} style={styles.factor}>
                  <Text style={styles.factorLabel}>{f.label}</Text>
                  <Text style={styles.factorDetail}>{f.detail}</Text>
                  <Text style={styles.factorPts}>
                    {f.points}/{f.max}
                  </Text>
                </View>
              ))}
              {balance.skipped.length ? <Text style={styles.fine}>Skipped: {balance.skipped.join(', ')}</Text> : null}
            </View>
          ) : (
            <Text style={styles.fine}>{balance.message}</Text>
          )}
        </Card>
      </Section>

      <Section title="Water & steps">
        <Group>
          <Row title="Daily water goal" value={metric ? `${Math.round(s.settings.waterGoalOz * 29.57)} ml` : `${s.settings.waterGoalOz} oz`} />
          <Row title="Daily step goal" value={fmt(s.settings.stepGoal)} last />
        </Group>
        <View style={styles.chips}>
          {[64, 80, 96, 120].map((oz) => (
            <Chip
              key={oz}
              label={metric ? `${Math.round(oz * 29.57)} ml` : `${oz} oz`}
              on={s.settings.waterGoalOz === oz}
              onPress={() => s.updateSettings({ waterGoalOz: oz })}
            />
          ))}
        </View>
        <View style={[styles.chips, { marginTop: space.s }]}>
          {[6000, 8000, 10000, 12000].map((n) => (
            <Chip key={n} label={`${fmt(n)} steps`} on={s.settings.stepGoal === n} onPress={() => s.updateSettings({ stepGoal: n })} />
          ))}
        </View>
      </Section>

      <Section title="Connections">
        <Group>
          <Row
            title={healthServiceName ?? 'Health data'}
            detail={
              health === 'available'
                ? 'Tap to allow access to steps and workouts'
                : health === 'not_installed'
                  ? 'Available in the next build (needs the native module)'
                  : 'Not available on this device'
            }
            onPress={health === 'available' ? () => connectHealth() : undefined}
          />
          <Row
            title="Nutrition data"
            detail={
              {
                server: 'USDA, Open Food Facts, Nutritionix, FatSecret (as configured)',
                development: 'Development test data',
                'open-food-facts': 'Open Food Facts only',
                none: 'Not connected',
              }[dataMode]
            }
            last
          />
        </Group>
      </Section>

      <Section title="Reminders">
        <Group>
          {(
            [
              ['meals', 'Meal reminders', 'Lunch and dinner'],
              ['water', 'Water reminders', '3 times a day'],
              ['weighIn', 'Weekly weigh-in', 'Mondays at 7:30 AM'],
            ] as const
          ).map(([k, title, detail], i) => (
            <View key={k} style={[styles.switchRow, i < 2 && styles.line]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{title}</Text>
                <Text style={styles.fine}>{detail}</Text>
              </View>
              <Switch value={s.settings.notifications[k]} onValueChange={(v) => setNotif(k, v)} trackColor={{ true: color.gauge }} accessibilityLabel={title} />
            </View>
          ))}
        </Group>
        {notifErr ? <ErrorNote text={notifErr} /> : null}
      </Section>

      <Section title="App">
        <Group>
          <View style={[styles.switchRow, styles.line]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>AI food analysis</Text>
              <Text style={styles.fine}>Sends photos and descriptions to Anthropic’s Claude</Text>
            </View>
            <Switch
              value={s.aiConsent === true}
              onValueChange={(v) => s.setAiConsent(v)}
              trackColor={{ true: color.gauge }}
              accessibilityLabel="AI food analysis"
            />
          </View>
          <View style={[styles.switchRow]}>
            <Text style={[styles.body, { flex: 1 }]}>Units</Text>
            <View style={{ width: 170 }}>
              <Segmented
                value={s.settings.units}
                onChange={(v) => s.updateSettings({ units: v })}
                options={[
                  { value: 'imperial', label: 'lb' },
                  { value: 'metric', label: 'kg' },
                ]}
              />
            </View>
          </View>
        </Group>
        <View style={{ marginTop: space.m, gap: space.m }}>
          <InstallPrompt />
          <StoreBadges />
        </View>
        <View style={styles.links}>
          {config.privacyUrl ? (
            <Pressable onPress={() => Linking.openURL(config.privacyUrl)} hitSlop={8}>
              <Text style={styles.link}>Privacy Policy</Text>
            </Pressable>
          ) : null}
          {config.termsUrl ? (
            <Pressable onPress={() => Linking.openURL(config.termsUrl)} hitSlop={8}>
              <Text style={styles.link}>Terms</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.fine}>
          Vahla offers general nutrition information, not medical advice. Nutrition values come from third-party databases and estimates and may not be
          exact.
        </Text>
      </Section>

      <Section title="Account">
        <Button
          label="Change password"
          kind="secondary"
          onPress={() => router.push('/reset-password')}
          disabled={authMode !== 'supabase' || s.account?.provider !== 'email'}
        />
        <Button
          label="Sign out"
          kind="secondary"
          style={{ marginTop: space.s }}
          onPress={() => confirm('Sign out?', 'Your log stays saved to your account.', 'Sign out', () => signOut())}
        />
        <Button
          label="Delete account"
          kind="ghost"
          loading={busy}
          style={{ marginTop: space.s }}
          onPress={() =>
            confirm(
              'Delete your account?',
              'This permanently deletes your account, food log, goals and settings. This can’t be undone.',
              'Delete',
              async () => {
                setBusy(true);
                try {
                  await deleteAccount();
                } catch (e) {
                  Alert.alert('Couldn’t delete account', (e as Error).message);
                } finally {
                  setBusy(false);
                }
              },
            )
          }
        />
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLabel: { fontSize: 16, color: color.ink },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.l, paddingHorizontal: space.l, paddingTop: space.m },
  avatarWrap: { width: 72, height: 72 },
  avatarImg: { width: 72, height: 72, borderRadius: 36, backgroundColor: color.wash },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: color.gauge,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  name: { fontFamily: font.displayBold, fontSize: 24, color: color.ink },
  sub: { fontSize: 14, color: color.sub },
  label: { fontSize: 13, color: color.sub, marginTop: space.l, marginBottom: 6 },
  fine: { fontSize: 12, color: color.sub, marginTop: 6, lineHeight: 17 },
  body: { fontSize: 15, color: color.ink, lineHeight: 21 },
  big: { fontFamily: font.displayBold, fontSize: 22, color: color.gauge },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  factor: { flexDirection: 'row', gap: space.m, alignItems: 'center' },
  factorLabel: { width: 64, fontSize: 13, fontWeight: '600', color: color.ink },
  factorDetail: { flex: 1, fontSize: 13, color: color.sub },
  factorPts: { fontFamily: font.displayMed, fontSize: 13, color: color.ink },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, paddingVertical: 10, minHeight: 56 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  links: { flexDirection: 'row', gap: space.l, marginTop: space.m },
  link: { color: color.gauge, fontSize: 14, fontWeight: '600' },
});
