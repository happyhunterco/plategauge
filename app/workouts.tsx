import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Card } from '../src/components/Kit';
import { Button, Chip, Screen, Section, success } from '../src/components/UI';
import { DEFAULT_SETTINGS, useStore, type WorkoutPlan } from '../src/store';
import { color, font, space } from '../src/theme';

const SPLITS: { id: WorkoutPlan['split']; label: string }[] = [
  { id: 'full_body', label: 'Full body' },
  { id: 'ppl', label: 'Push / Pull / Legs' },
  { id: 'upper_lower', label: 'Upper / Lower' },
  { id: 'strength_cardio', label: 'Strength + cardio' },
];
const GOALS: { id: WorkoutPlan['goal']; label: string }[] = [
  { id: 'general', label: 'Feel healthier' },
  { id: 'muscle', label: 'Build muscle' },
  { id: 'strength', label: 'Get stronger' },
  { id: 'fat_loss', label: 'Lose fat' },
];
const CARDIO: { id: WorkoutPlan['cardio']; label: string }[] = [
  { id: 'walk', label: 'Walk' }, { id: 'incline_walk', label: 'Incline walk' }, { id: 'run', label: 'Run' },
  { id: 'bike', label: 'Bike' }, { id: 'row', label: 'Row' }, { id: 'intervals', label: 'Intervals' },
];

const plans: Record<WorkoutPlan['split'], { name: string; exercises: string[] }[]> = {
  full_body: [
    { name: 'Full body A', exercises: ['Squat', 'Bench press or push-up', 'Row', 'Romanian deadlift', 'Plank'] },
    { name: 'Full body B', exercises: ['Deadlift or hip hinge', 'Overhead press', 'Pulldown or pull-up', 'Split squat', 'Carry'] },
  ],
  ppl: [
    { name: 'Push', exercises: ['Bench press', 'Overhead press', 'Incline press', 'Lateral raise', 'Triceps extension'] },
    { name: 'Pull', exercises: ['Row', 'Pulldown or pull-up', 'Rear-delt raise', 'Curl', 'Back extension'] },
    { name: 'Legs', exercises: ['Squat', 'Romanian deadlift', 'Lunge', 'Leg curl', 'Calf raise'] },
  ],
  upper_lower: [
    { name: 'Upper', exercises: ['Bench press', 'Row', 'Overhead press', 'Pulldown', 'Arms'] },
    { name: 'Lower', exercises: ['Squat', 'Romanian deadlift', 'Split squat', 'Leg curl', 'Calf raise'] },
  ],
  strength_cardio: [
    { name: 'Strength', exercises: ['Squat', 'Press', 'Row', 'Hip hinge', 'Carry'] },
    { name: 'Conditioning', exercises: ['Chosen cardio', 'Easy recovery walk', 'Mobility'] },
  ],
};

const sets = (goal: WorkoutPlan['goal']) => goal === 'strength' ? '3–5 sets · 3–6 reps' : goal === 'muscle' ? '3–4 sets · 6–12 reps' : '2–3 sets · 8–15 reps';
const cardioMinutes = (plan: WorkoutPlan) => plan.goal === 'fat_loss' ? Math.min(30, plan.minutes) : Math.min(20, Math.round(plan.minutes / 3));

export default function Workouts() {
  const stored = useStore((s) => s.settings.workoutPlan ?? DEFAULT_SETTINGS.workoutPlan);
  const updateSettings = useStore((s) => s.updateSettings);
  const addActivity = useStore((s) => s.addActivity);
  const day = useStore((s) => s.day);
  const weight = useStore((s) => s.profile?.weightLb ?? 170);
  const [plan, setPlan] = useState<WorkoutPlan>(stored);
  const routine = useMemo(() => plans[plan.split], [plan.split]);
  const set = <K extends keyof WorkoutPlan>(key: K, value: WorkoutPlan[K]) => {
    const next = { ...plan, [key]: value };
    setPlan(next);
    updateSettings({ workoutPlan: next });
  };
  const log = (name: string, cardio = false) => {
    const minutes = cardio ? cardioMinutes(plan) : plan.minutes;
    const met = cardio ? (plan.cardio === 'walk' ? 3.5 : plan.cardio === 'intervals' ? 9 : 6.5) : 5;
    const calories = Math.round(((met * 3.5 * weight * 0.4536) / 200) * minutes);
    addActivity({ date: day, type: cardio ? CARDIO.find((x) => x.id === plan.cardio)?.label ?? 'Cardio' : name, minutes, calories, source: 'manual' });
    success();
    Alert.alert('Workout logged', `${name} · ${minutes} minutes`);
  };
  return (
    <Screen title="Your workout plan" subtitle="Build a routine around your goal, schedule, and equipment.">
      <Section title="Goal"><View style={styles.chips}>{GOALS.map((x) => <Chip key={x.id} label={x.label} on={plan.goal === x.id} onPress={() => set('goal', x.id)} />)}</View></Section>
      <Section title="Weekly split"><View style={styles.chips}>{SPLITS.map((x) => <Chip key={x.id} label={x.label} on={plan.split === x.id} onPress={() => set('split', x.id)} />)}</View></Section>
      <Section title="Schedule"><View style={styles.chips}>{([3, 4, 5, 6] as const).map((x) => <Chip key={x} label={`${x} days`} on={plan.days === x} onPress={() => set('days', x)} />)}</View><View style={styles.chips}>{([30, 45, 60, 75] as const).map((x) => <Chip key={x} label={`${x} min`} on={plan.minutes === x} onPress={() => set('minutes', x)} />)}</View></Section>
      <Section title="Equipment"><View style={styles.chips}>{(['gym', 'home', 'bodyweight'] as const).map((x) => <Chip key={x} label={x[0].toUpperCase() + x.slice(1)} on={plan.equipment === x} onPress={() => set('equipment', x)} />)}</View></Section>
      <Section title="Strength plan">
        <View style={{ gap: space.m }}>{routine.map((dayPlan) => <Card key={dayPlan.name}><Text style={styles.title}>{dayPlan.name}</Text><Text style={styles.meta}>{sets(plan.goal)} · rest 1–3 min</Text>{dayPlan.exercises.map((exercise) => <Text key={exercise} style={styles.exercise}>• {exercise}</Text>)}<Button label="Log this workout" icon="checkmark" kind="secondary" onPress={() => log(dayPlan.name)} style={{ marginTop: space.m }} /></Card>)}</View>
      </Section>
      <Section title="Cardio and heart health">
        <Card><View style={styles.chips}>{CARDIO.map((x) => <Chip key={x.id} label={x.label} on={plan.cardio === x.id} onPress={() => set('cardio', x.id)} />)}</View><Text style={styles.meta}>{cardioMinutes(plan)} minutes at a pace you can sustain. Start easier and build gradually.</Text><Button label="Log cardio" icon="heart-outline" onPress={() => log(CARDIO.find((x) => x.id === plan.cardio)?.label ?? 'Cardio', true)} /></Card>
      </Section>
      <Text style={styles.note}>Stop if you feel pain, dizziness, or unusual shortness of breath. Vahla provides general planning, not medical advice.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginBottom: space.s },
  title: { fontFamily: font.display, fontSize: 18, color: color.ink },
  meta: { color: color.sub, fontSize: 13, lineHeight: 19, marginVertical: space.s },
  exercise: { color: color.ink, fontSize: 15, lineHeight: 24 },
  note: { color: color.sub, fontSize: 12, lineHeight: 18, paddingHorizontal: space.l, marginTop: space.l },
});
