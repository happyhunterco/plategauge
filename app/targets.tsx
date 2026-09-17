import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { computeTargets, type Goal } from '../shared/targets';
import { Card } from '../src/components/Kit';
import { Button, Chip, Field, Screen, Section, Segmented } from '../src/components/UI';
import { fmt } from '../src/hooks';
import { pushProfile } from '../src/services/sync';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

export default function Targets() {
  const router = useRouter();
  const s = useStore();
  const p = s.profile!;
  const [goal, setGoal] = useState<Goal>(p.goal);
  const [rate, setRate] = useState(p.ratePerWeek || 1);
  const [target, setTarget] = useState(String(p.targetLb));
  const [age, setAge] = useState(String(p.age));
  const [heightIn, setHeightIn] = useState(String(p.heightIn));
  const [activity, setActivity] = useState(p.activity);
  const [manual, setManual] = useState(s.goalsManual);
  const [m, setM] = useState({
    calories: String(s.goals!.calories),
    protein: String(s.goals!.protein),
    carbs: String(s.goals!.carbs),
    fat: String(s.goals!.fat),
    fiber: String(s.goals!.fiber),
  });

  const plan = useMemo(
    () =>
      computeTargets({
        sex: p.sex,
        age: parseInt(age, 10) || p.age,
        heightIn: parseFloat(heightIn) || p.heightIn,
        weightLb: p.weightLb,
        targetLb: parseFloat(target) || p.weightLb,
        activity,
        goal,
        ratePerWeek: rate,
      }),
    [p, age, heightIn, target, activity, goal, rate],
  );
  const num = (x: string) => Math.max(0, Math.round(parseFloat(x) || 0));
  const manualCal = num(m.protein) * 4 + num(m.carbs) * 4 + num(m.fat) * 9;

  const save = () => {
    s.updateProfile({
      goal,
      ratePerWeek: goal === 'maintain' ? 0 : rate,
      targetLb: goal === 'maintain' ? p.weightLb : parseFloat(target) || p.targetLb,
      age: parseInt(age, 10) || p.age,
      heightIn: parseFloat(heightIn) || p.heightIn,
      activity,
    });
    s.setGoals(
      manual ? { calories: num(m.calories), protein: num(m.protein), carbs: num(m.carbs), fat: num(m.fat), fiber: num(m.fiber) } : plan.targets,
      manual,
    );
    pushProfile().catch(() => {});
    router.back();
  };

  return (
    <Screen top={false}>
      <Section title="Plan">
        <Segmented
          value={goal}
          onChange={setGoal}
          options={[
            { value: 'lose', label: 'Lose' },
            { value: 'maintain', label: 'Maintain' },
            { value: 'gain', label: 'Gain' },
          ]}
        />
        {goal !== 'maintain' ? (
          <View style={{ gap: space.m, marginTop: space.m }}>
            <Field label="Goal weight (lb)" value={target} onChangeText={setTarget} inputMode="decimal" keyboardType="decimal-pad" />
            <View style={styles.chips}>
              {[0.25, 0.5, 1, 1.5, 2]
                .filter((r) => goal === 'lose' || r <= 1)
                .map((r) => (
                  <Chip key={r} label={`${r} lb/wk`} on={rate === r} onPress={() => setRate(r)} />
                ))}
            </View>
          </View>
        ) : null}
        <View style={[styles.row, { marginTop: space.m }]}>
          <Field label="Age" value={age} onChangeText={setAge} inputMode="numeric" keyboardType="number-pad" style={{ flex: 1 }} />
          <Field label="Height (in)" value={heightIn} onChangeText={setHeightIn} inputMode="decimal" keyboardType="decimal-pad" style={{ flex: 1 }} />
        </View>
        <Text style={styles.label}>Activity</Text>
        <Segmented
          value={activity}
          onChange={setActivity}
          options={[
            { value: 1.2, label: 'Low' },
            { value: 1.375, label: 'Light' },
            { value: 1.55, label: 'Active' },
            { value: 1.725, label: 'Very' },
          ]}
        />
        {plan.warnings.map((w) => (
          <Text key={w} style={styles.warn}>
            {w}
          </Text>
        ))}
        {plan.saferRate != null && plan.saferRate !== rate ? (
          <Button label={`Use ${plan.saferRate} lb a week`} kind="secondary" onPress={() => setRate(plan.saferRate!)} style={{ marginTop: space.s }} />
        ) : null}
      </Section>

      <Section title="Targets">
        <Segmented
          value={manual ? 'manual' : 'auto'}
          onChange={(v) => setManual(v === 'manual')}
          options={[
            { value: 'auto', label: 'Recommended' },
            { value: 'manual', label: 'Custom' },
          ]}
        />
        {!manual ? (
          <Card style={{ marginTop: space.m }}>
            <Text style={styles.big}>{fmt(plan.targets.calories)} cal</Text>
            <Text style={styles.fine}>
              {plan.targets.protein}g protein · {plan.targets.carbs}g carbs · {plan.targets.fat}g fat · {plan.targets.fiber}g fiber
            </Text>
            <Text style={styles.fine}>Maintenance is about {fmt(plan.tdee)} cal a day (Mifflin–St Jeor × activity).</Text>
          </Card>
        ) : (
          <View style={{ gap: space.m, marginTop: space.m }}>
            <View style={styles.row}>
              <Field
                label="Calories"
                value={m.calories}
                onChangeText={(t) => setM({ ...m, calories: t })}
                inputMode="numeric"
                keyboardType="number-pad"
                style={{ flex: 1 }}
              />
              <Field
                label="Fiber (g)"
                value={m.fiber}
                onChangeText={(t) => setM({ ...m, fiber: t })}
                inputMode="numeric"
                keyboardType="number-pad"
                style={{ flex: 1 }}
              />
            </View>
            <View style={styles.row}>
              <Field
                label="Protein"
                value={m.protein}
                onChangeText={(t) => setM({ ...m, protein: t })}
                inputMode="numeric"
                keyboardType="number-pad"
                suffix="g"
                style={{ flex: 1 }}
              />
              <Field
                label="Carbs"
                value={m.carbs}
                onChangeText={(t) => setM({ ...m, carbs: t })}
                inputMode="numeric"
                keyboardType="number-pad"
                suffix="g"
                style={{ flex: 1 }}
              />
              <Field
                label="Fat"
                value={m.fat}
                onChangeText={(t) => setM({ ...m, fat: t })}
                inputMode="numeric"
                keyboardType="number-pad"
                suffix="g"
                style={{ flex: 1 }}
              />
            </View>
            {Math.abs(manualCal - num(m.calories)) > 100 ? (
              <Text style={styles.warn}>Your macros add up to {fmt(manualCal)} cal, which doesn’t match your calorie target.</Text>
            ) : null}
            {num(m.calories) < (p.sex === 'male' ? 1500 : 1200) ? (
              <Text style={styles.warn}>That’s below the usual minimum without medical supervision.</Text>
            ) : null}
          </View>
        )}
      </Section>
      <View style={{ paddingHorizontal: space.l, marginTop: space.l }}>
        <Button label="Save" onPress={save} disabled={manual && num(m.calories) < 800} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  row: { flexDirection: 'row', gap: space.m },
  label: { fontSize: 13, color: color.sub, marginTop: space.m, marginBottom: 6 },
  warn: { color: color.danger, fontSize: 13, marginTop: space.s, lineHeight: 18 },
  big: { fontFamily: font.displayBold, fontSize: 28, color: color.ink },
  fine: { fontSize: 13, color: color.sub, marginTop: 4, lineHeight: 18 },
});
