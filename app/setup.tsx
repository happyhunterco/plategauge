import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RESTAURANTS } from '../shared/restaurants';
import { computeTargets, type Goal, type Sex } from '../shared/targets';
import { LogoMark, LogoWordmark } from '../src/components/Logo';
import { Button, Chip, Field, Segmented, tap } from '../src/components/UI';
import { fmt } from '../src/hooks';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

const ACTIVITY = [
  { v: 1.2, label: 'Mostly sitting', sub: 'Desk job, little exercise' },
  { v: 1.375, label: 'Lightly active', sub: 'Walks, 1–3 workouts a week' },
  { v: 1.55, label: 'Active', sub: '3–5 workouts a week' },
  { v: 1.725, label: 'Very active', sub: 'Hard training most days' },
];
const RESTRICTIONS = ['vegetarian', 'vegan', 'pescatarian', 'gluten-free', 'dairy-free', 'halal', 'kosher'];
const RATES = [0.25, 0.5, 1, 1.5, 2];
const STEPS = ['welcome', 'you', 'goal', 'activity', 'food', 'plan'] as const;

export default function Setup() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const complete = useStore((s) => s.completeOnboarding);
  const existing = useStore((s) => s.profile);
  const updateSettings = useStore((s) => s.updateSettings);
  const [step, setStep] = useState(0);
  const [units, setUnits] = useState<'imperial' | 'metric'>('imperial');
  const [f, setF] = useState({
    name: existing?.name ?? '',
    sex: (existing?.sex ?? 'male') as Sex,
    age: existing ? String(existing.age) : '',
    ft: existing ? String(Math.floor(existing.heightIn / 12)) : '',
    inch: existing ? String(Math.round(existing.heightIn % 12)) : '',
    cm: '',
    weight: existing ? String(existing.weightLb) : '',
    target: existing ? String(existing.targetLb) : '',
    goal: (existing?.goal ?? 'lose') as Goal,
    rate: existing?.ratePerWeek ?? 1,
    activity: existing?.activity ?? 1.375,
    restrictions: existing?.restrictions ?? ([] as string[]),
    allergies: existing?.allergies.join(', ') ?? '',
    favorites: existing?.favoriteRestaurants ?? ([] as string[]),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((cur) => ({ ...cur, [k]: v }));

  const ageRef = useRef<TextInput>(null);
  const ftRef = useRef<TextInput>(null);
  const inRef = useRef<TextInput>(null);
  const wRef = useRef<TextInput>(null);

  const metric = units === 'metric';
  const heightIn = metric ? (parseFloat(f.cm) || 0) / 2.54 : (parseFloat(f.ft) || 0) * 12 + (parseFloat(f.inch) || 0);
  const toLb = (s: string) => (metric ? (parseFloat(s) || 0) / 0.4536 : parseFloat(s) || 0);
  const weightLb = Math.round(toLb(f.weight) * 10) / 10;
  const targetLb = f.goal === 'maintain' ? weightLb : Math.round(toLb(f.target) * 10) / 10;
  const age = parseInt(f.age, 10) || 0;

  const plan = useMemo(
    () =>
      age && heightIn && weightLb
        ? computeTargets({ sex: f.sex, age, heightIn, weightLb, targetLb: targetLb || weightLb, activity: f.activity, goal: f.goal, ratePerWeek: f.rate })
        : null,
    [age, heightIn, weightLb, targetLb, f.sex, f.activity, f.goal, f.rate],
  );

  const valid = [
    true,
    age >= 18 && age <= 100 && heightIn >= 48 && heightIn <= 96 && weightLb >= 70 && weightLb <= 700,
    f.goal === 'maintain' || (targetLb >= 70 && (f.goal === 'lose' ? targetLb < weightLb : targetLb > weightLb)),
    true,
    true,
    !!plan,
  ][step];

  const goalError =
    step === 2 && f.goal !== 'maintain' && f.target && !valid
      ? f.goal === 'lose'
        ? 'Goal weight should be below your current weight.'
        : 'Goal weight should be above your current weight.'
      : '';

  const finish = () => {
    if (!plan) return;
    updateSettings({ units });
    complete(
      {
        name: f.name.trim(),
        sex: f.sex,
        age,
        heightIn: Math.round(heightIn * 10) / 10,
        weightLb,
        targetLb,
        activity: f.activity,
        goal: f.goal,
        ratePerWeek: f.goal === 'maintain' ? 0 : f.rate,
        restrictions: f.restrictions,
        allergies: f.allergies
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
        favoriteRestaurants: f.favorites,
      },
      plan.targets,
    );
    router.replace('/account');
  };

  const title = ['', 'About you', 'Your goal', 'How active are you?', 'How you eat', 'Your plan'][step];
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.top, { paddingTop: insets.top + space.s }]}>
        {step > 0 ? (
          <Pressable onPress={() => setStep(step - 1)} hitSlop={10} style={styles.back} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={24} color={color.ink} />
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        {step > 0 ? (
          <View style={styles.progress} accessibilityLabel={`Step ${step} of ${STEPS.length - 1}`}>
            {STEPS.slice(1).map((s, i) => (
              <View key={s} style={[styles.dot, i < step && { backgroundColor: color.ink }]} />
            ))}
          </View>
        ) : null}
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        {step === 0 ? (
          <View style={styles.welcome}>
            <View style={styles.welcomeLogo}>
              <LogoMark size={120} />
              <LogoWordmark width={126} />
            </View>
            <Text style={styles.tagline}>Built for better living.</Text>
            <Text style={styles.pitch}>Personalized nutrition, training, and daily progress, all working toward a healthier life.</Text>
            <View style={styles.welcomeActions}>
              <Button label="Get started" onPress={() => setStep(1)} />
              <Button label="I already have an account" kind="ghost" onPress={() => router.push({ pathname: '/account', params: { mode: 'signin' } })} />
            </View>
          </View>
        ) : (
          <Text style={styles.h1} accessibilityRole="header">
            {title}
          </Text>
        )}

        {step === 1 ? (
          <View style={styles.form}>
            <Field
              label="First name (optional)"
              value={f.name}
              onChangeText={(t) => set('name', t)}
              returnKeyType="next"
              onSubmitEditing={() => ageRef.current?.focus()}
              autoComplete="given-name"
              textContentType="givenName"
            />
            <Text style={styles.label}>Sex (for calorie math)</Text>
            <Segmented
              value={f.sex}
              onChange={(v) => set('sex', v)}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
              ]}
            />
            <Segmented
              value={units}
              onChange={setUnits}
              options={[
                { value: 'imperial', label: 'lb / ft' },
                { value: 'metric', label: 'kg / cm' },
              ]}
            />
            <View style={styles.row}>
              <Field
                ref={ageRef}
                label="Age"
                value={f.age}
                onChangeText={(t) => set('age', t.replace(/\D/g, ''))}
                inputMode="numeric"
                keyboardType="number-pad"
                maxLength={3}
                style={styles.cell}
                returnKeyType="next"
                onSubmitEditing={() => ftRef.current?.focus()}
              />
              {metric ? (
                <Field
                  ref={ftRef}
                  label="Height"
                  value={f.cm}
                  onChangeText={(t) => set('cm', t)}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  suffix="cm"
                  style={styles.cell}
                  returnKeyType="next"
                  onSubmitEditing={() => wRef.current?.focus()}
                />
              ) : (
                <>
                  <Field
                    ref={ftRef}
                    label="Height"
                    value={f.ft}
                    onChangeText={(t) => set('ft', t.replace(/\D/g, ''))}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    suffix="ft"
                    maxLength={1}
                    style={styles.cell}
                    returnKeyType="next"
                    onSubmitEditing={() => inRef.current?.focus()}
                  />
                  <Field
                    ref={inRef}
                    label=" "
                    value={f.inch}
                    onChangeText={(t) => set('inch', t.replace(/\D/g, ''))}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    suffix="in"
                    maxLength={2}
                    style={styles.cell}
                    returnKeyType="next"
                    onSubmitEditing={() => wRef.current?.focus()}
                    accessibilityLabel="Height inches"
                  />
                </>
              )}
            </View>
            {f.age && age < 18 ? <Text style={styles.warn}>Vahla is currently for adults age 18 and older.</Text> : null}
            <Field
              ref={wRef}
              label="Current weight"
              value={f.weight}
              onChangeText={(t) => set('weight', t)}
              inputMode="decimal"
              keyboardType="decimal-pad"
              suffix={metric ? 'kg' : 'lb'}
              returnKeyType="done"
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.form}>
            <Segmented
              value={f.goal}
              onChange={(v) => set('goal', v)}
              options={[
                { value: 'lose', label: 'Lose' },
                { value: 'maintain', label: 'Maintain' },
                { value: 'gain', label: 'Gain' },
              ]}
            />
            {f.goal !== 'maintain' ? (
              <>
                <Field
                  label="Goal weight"
                  value={f.target}
                  onChangeText={(t) => set('target', t)}
                  inputMode="decimal"
                  keyboardType="decimal-pad"
                  suffix={metric ? 'kg' : 'lb'}
                />
                {goalError ? <Text style={styles.warn}>{goalError}</Text> : null}
                <Text style={styles.label}>Pace per week</Text>
                <View style={styles.chips}>
                  {RATES.filter((r) => f.goal === 'lose' || r <= 1).map((r) => (
                    <Chip key={r} label={metric ? `${Math.round(r * 0.4536 * 100) / 100} kg` : `${r} lb`} on={f.rate === r} onPress={() => set('rate', r)} />
                  ))}
                </View>
                {plan?.warnings.length ? (
                  <View style={styles.warnBox}>
                    {plan.warnings.map((w) => (
                      <Text key={w} style={styles.warnText}>
                        {w}
                      </Text>
                    ))}
                    {plan.saferRate != null && plan.saferRate !== f.rate ? (
                      <Button
                        label={`Use ${plan.saferRate} lb a week instead`}
                        kind="secondary"
                        onPress={() => set('rate', plan.saferRate!)}
                        style={{ marginTop: space.s }}
                      />
                    ) : null}
                  </View>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.form}>
            {ACTIVITY.map((a) => (
              <Pressable
                key={a.v}
                onPress={() => {
                  tap();
                  set('activity', a.v);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: f.activity === a.v }}
                style={[styles.option, f.activity === a.v && styles.optionOn]}
              >
                <Text style={[styles.optTitle, f.activity === a.v && { color: '#fff' }]}>{a.label}</Text>
                <Text style={[styles.optSub, f.activity === a.v && { color: '#C7C7C7' }]}>{a.sub}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 4 ? (
          <View style={styles.form}>
            <Text style={styles.label}>Dietary preferences</Text>
            <View style={styles.chips}>
              {RESTRICTIONS.map((r) => (
                <Chip key={r} label={r} on={f.restrictions.includes(r)} onPress={() => set('restrictions', toggle(f.restrictions, r))} />
              ))}
            </View>
            <Field label="Allergies (comma separated)" value={f.allergies} onChangeText={(t) => set('allergies', t)} placeholder="peanuts, shellfish" />
            <Text style={styles.fine}>We hide foods whose names suggest a conflict, but always check ingredients yourself.</Text>
            <Text style={styles.label}>Favorite restaurants (optional)</Text>
            <View style={styles.chips}>
              {RESTAURANTS.slice(0, 16).map((r) => (
                <Chip key={r.id} label={r.name} on={f.favorites.includes(r.id)} onPress={() => set('favorites', toggle(f.favorites, r.id))} />
              ))}
            </View>
          </View>
        ) : null}

        {step === 5 && plan ? (
          <View style={styles.form}>
            <View style={styles.planCard}>
              <Text style={styles.planCal}>{fmt(plan.targets.calories)}</Text>
              <Text style={styles.planSub}>calories a day</Text>
              <View style={styles.planMacros}>
                {[
                  ['Protein', plan.targets.protein],
                  ['Carbs', plan.targets.carbs],
                  ['Fat', plan.targets.fat],
                ].map(([k, v]) => (
                  <View key={k} style={{ alignItems: 'center' }}>
                    <Text style={styles.planMacro}>{v}g</Text>
                    <Text style={styles.planSub}>{k}</Text>
                  </View>
                ))}
              </View>
            </View>
            <Text style={styles.fine}>
              Your body uses about {fmt(plan.tdee)} calories a day.{' '}
              {f.goal === 'maintain' ? 'This keeps you steady.' : `This plan aims for about ${f.rate} lb a week${f.goal === 'lose' ? ' down' : ' up'}.`} You can
              change any of this later in Profile.
            </Text>
            {plan.warnings.map((w) => (
              <Text key={w} style={styles.warn}>
                {w}
              </Text>
            ))}
            <Text style={styles.fine}>
              Vahla gives general nutrition guidance, not medical advice. Talk to a doctor before big diet changes, especially if you’re pregnant or have a
              health condition.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {step > 0 ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.m }]}>
          <Button label={step === 5 ? 'Save my plan' : 'Continue'} disabled={!valid} onPress={() => (step === 5 ? finish() : setStep(step + 1))} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.m },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  progress: { flexDirection: 'row', gap: 6 },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: color.line },
  body: { paddingHorizontal: space.l, paddingBottom: space.xl, maxWidth: 560, width: '100%', alignSelf: 'center' },
  welcome: { alignItems: 'center', paddingTop: space.xxl },
  welcomeLogo: { alignItems: 'center', gap: space.l },
  welcomeActions: { width: '100%', marginTop: space.xl, gap: space.xs },
  tagline: { fontFamily: font.displayMed, fontSize: 18, color: color.gauge, marginTop: 4 },
  pitch: { fontSize: 16, color: color.sub, textAlign: 'center', marginTop: space.l, lineHeight: 23, maxWidth: 320 },
  h1: { fontFamily: font.displayBold, fontSize: 28, color: color.ink, letterSpacing: -0.6, marginTop: space.m, marginBottom: space.l },
  form: { gap: space.m },
  row: { flexDirection: 'row', gap: space.m, alignItems: 'flex-end' },
  cell: { flex: 1 },
  label: { fontSize: 13, color: color.sub, marginTop: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  option: { borderRadius: 16, borderWidth: 1, borderColor: color.line, padding: space.l, minHeight: 64 },
  optionOn: { backgroundColor: color.ink, borderColor: color.ink },
  optTitle: { fontFamily: font.display, fontSize: 16, color: color.ink },
  optSub: { fontSize: 13, color: color.sub, marginTop: 2 },
  warn: { color: color.danger, fontSize: 13, lineHeight: 18 },
  warnBox: { backgroundColor: color.wash2, borderRadius: 12, padding: space.m, gap: 6 },
  warnText: { color: color.ink2, fontSize: 13, lineHeight: 18 },
  fine: { fontSize: 13, color: color.sub, lineHeight: 19 },
  planCard: { backgroundColor: color.ink, borderRadius: 22, padding: space.xl, alignItems: 'center' },
  planCal: { fontFamily: font.displayBold, fontSize: 48, color: '#fff', letterSpacing: -1 },
  planSub: { color: '#C7C7C7', fontSize: 13 },
  planMacros: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: space.l },
  planMacro: { fontFamily: font.display, fontSize: 20, color: '#fff' },
  footer: { paddingHorizontal: space.l, paddingTop: space.m, gap: space.xs, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
