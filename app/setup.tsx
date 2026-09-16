import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { LogoMark } from '../src/components/Logo';
import { Button, Field, Screen, Segmented } from '../src/components/UI';
import { computeGoals, fmt } from '../src/nutrition';
import { useStore } from '../src/store';
import { color, font, space, type } from '../src/theme';
import type { Profile } from '../src/types';

export default function Setup() {
  const router = useRouter();
  const existing = useStore((s) => s.profile);
  const hadGoals = useStore((s) => !!s.goals);
  const saveProfile = useStore((s) => s.saveProfile);

  const [sex, setSex] = useState<Profile['sex']>(existing?.sex ?? 'male');
  const [age, setAge] = useState(existing ? `${existing.age}` : '');
  const [ft, setFt] = useState(existing ? `${Math.floor(existing.heightIn / 12)}` : '');
  const [inch, setInch] = useState(existing ? `${existing.heightIn % 12}` : '');
  const [lb, setLb] = useState(existing ? `${existing.weightLb}` : '');
  const [target, setTarget] = useState(existing?.targetLb ? `${existing.targetLb}` : '');
  const [activity, setActivity] = useState<Profile['activity']>(existing?.activity ?? 1.55);
  const [goal, setGoal] = useState<Profile['goal']>(existing?.goal ?? 'lose');

  const profile = useMemo<Profile | null>(() => {
    const a = parseInt(age, 10);
    const h = (parseInt(ft, 10) || 0) * 12 + (parseInt(inch, 10) || 0);
    const w = parseFloat(lb);
    if (!(a >= 13 && a <= 100) || !(h >= 48 && h <= 96) || !(w >= 70 && w <= 700)) return null;
    const t = parseFloat(target);
    return { sex, age: a, heightIn: h, weightLb: w, targetLb: t >= 70 ? t : w, activity, goal };
  }, [sex, age, ft, inch, lb, target, activity, goal]);

  const goals = profile ? computeGoals(profile) : null;

  const num = (label: string, value: string, set: (s: string) => void, placeholder: string, flex = 1) => (
    <View style={{ flex }}>
      <Text style={styles.label}>{label}</Text>
      <Field value={value} onChangeText={set} placeholder={placeholder} keyboardType="number-pad" accessibilityLabel={label} />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <View style={styles.pad}>
          <LogoMark size={56} />
          <Text style={[type.hero, { marginTop: space.l }]}>{hadGoals ? 'Update your stats' : 'Welcome to PlateGauge'}</Text>
          <Text style={styles.lede}>A few numbers and we’ll set a daily calorie and macro target. You can change it any time.</Text>

          <Text style={styles.label}>Sex</Text>
          <Segmented value={sex} onChange={setSex} options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />

          <View style={styles.row}>
            {num('Age', age, setAge, '21')}
            {num('Height ft', ft, setFt, '6')}
            {num('in', inch, setInch, '3')}
          </View>
          <View style={styles.row}>
            {num('Weight lb', lb, setLb, '195')}
            {num('Goal weight lb', target, setTarget, '185')}
          </View>

          <Text style={styles.label}>Activity</Text>
          <Segmented
            value={activity}
            onChange={setActivity}
            options={[
              { value: 1.2, label: 'Desk' },
              { value: 1.375, label: 'Light' },
              { value: 1.55, label: 'Active' },
              { value: 1.725, label: 'Athlete' },
            ]}
          />

          <Text style={styles.label}>Goal</Text>
          <Segmented
            value={goal}
            onChange={setGoal}
            options={[
              { value: 'lose', label: 'Lose fat' },
              { value: 'maintain', label: 'Maintain' },
              { value: 'gain', label: 'Build' },
            ]}
          />

          <View style={styles.result}>
            {goals ? (
              <>
                <Text style={styles.resultNum}>{fmt(goals.calories)}</Text>
                <Text style={styles.resultLabel}>calories a day</Text>
                <Text style={styles.resultMacros}>
                  {goals.protein}g protein, {goals.carbs}g carbs, {goals.fat}g fat
                </Text>
              </>
            ) : (
              <Text style={styles.resultLabel}>Fill in your stats to see your target</Text>
            )}
          </View>

          <Button
            label={hadGoals ? 'Save targets' : 'Start tracking'}
            disabled={!profile || !goals}
            onPress={() => {
              if (!profile || !goals) return;
              saveProfile(profile, goals);
              router.replace('/');
            }}
          />
          {hadGoals && <Button label="Cancel" kind="ghost" onPress={() => router.back()} />}
          <Text style={styles.fine}>
            Estimates use the Mifflin–St Jeor equation. They’re a starting point, not medical advice.
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.s },
  lede: { fontSize: 15, color: color.sub, lineHeight: 21, marginBottom: space.m },
  label: { fontSize: 13, color: color.sub, marginTop: space.m, marginBottom: 6 },
  row: { flexDirection: 'row', gap: space.m },
  result: { alignItems: 'center', paddingVertical: space.xl, marginVertical: space.m, borderRadius: 16, backgroundColor: color.wash },
  resultNum: { fontFamily: font.displayBold, fontSize: 44, color: color.ink, letterSpacing: -1.2 },
  resultLabel: { fontSize: 14, color: color.sub },
  resultMacros: { fontSize: 14, color: color.ink, marginTop: space.s },
  fine: { fontSize: 12, color: color.faint, textAlign: 'center', marginTop: space.s },
});
