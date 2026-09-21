import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Card, TopBar } from '../../src/components/Kit';
import { Button, Chip, Screen, Section, success, tap } from '../../src/components/UI';
import { DEFAULT_SETTINGS, useStore, type WorkoutPlan } from '../../src/store';
import { color, font, space } from '../../src/theme';

const SPLITS: { id: WorkoutPlan['split']; label: string }[] = [
  { id: 'full_body', label: 'Full body' }, { id: 'ppl', label: 'Push / Pull / Legs' },
  { id: 'upper_lower', label: 'Upper / Lower' }, { id: 'strength_cardio', label: 'Strength + cardio' },
];
const GOALS: { id: WorkoutPlan['goal']; label: string }[] = [
  { id: 'fat_loss', label: 'Lose fat' }, { id: 'muscle', label: 'Build muscle' },
  { id: 'strength', label: 'Get stronger' }, { id: 'general', label: 'Feel healthier' },
];
const CARDIO: { id: WorkoutPlan['cardio']; label: string }[] = [
  { id: 'walk', label: 'Walk' }, { id: 'incline_walk', label: 'Incline walk' }, { id: 'run', label: 'Run' },
  { id: 'bike', label: 'Bike' }, { id: 'row', label: 'Row' }, { id: 'intervals', label: 'Intervals' },
];
type WorkoutDay = { name: string; exercises: string[] };
const PLANS: Record<WorkoutPlan['split'], WorkoutDay[]> = {
  full_body: [
    { name: 'Full body A', exercises: ['Squat', 'Bench press', 'Row', 'Romanian deadlift', 'Plank'] },
    { name: 'Full body B', exercises: ['Deadlift', 'Overhead press', 'Pulldown', 'Split squat', 'Carry'] },
  ],
  ppl: [
    { name: 'Push', exercises: ['Bench press', 'Overhead press', 'Incline press', 'Lateral raise', 'Triceps extension'] },
    { name: 'Pull', exercises: ['Row', 'Pulldown', 'Rear-delt raise', 'Curl', 'Back extension'] },
    { name: 'Legs', exercises: ['Squat', 'Romanian deadlift', 'Lunge', 'Leg curl', 'Calf raise'] },
  ],
  upper_lower: [
    { name: 'Upper', exercises: ['Bench press', 'Row', 'Overhead press', 'Pulldown', 'Curl'] },
    { name: 'Lower', exercises: ['Squat', 'Romanian deadlift', 'Split squat', 'Leg curl', 'Calf raise'] },
  ],
  strength_cardio: [
    { name: 'Strength A', exercises: ['Squat', 'Bench press', 'Row', 'Carry'] },
    { name: 'Strength B', exercises: ['Deadlift', 'Overhead press', 'Pulldown', 'Split squat'] },
  ],
};

const HOME: Record<string, string> = {
  'Bench press': 'Dumbbell floor press', 'Incline press': 'Feet-elevated push-up', Pulldown: 'Band pulldown',
  'Leg curl': 'Slider leg curl', 'Triceps extension': 'Band triceps extension', 'Lateral raise': 'Band lateral raise',
};
const BODY: Record<string, string> = {
  Squat: 'Tempo bodyweight squat', 'Bench press': 'Push-up', Row: 'Table row', Deadlift: 'Single-leg hip hinge',
  'Romanian deadlift': 'Single-leg hip hinge', 'Overhead press': 'Pike push-up', Pulldown: 'Pull-up or table row',
  'Incline press': 'Feet-elevated push-up', 'Split squat': 'Rear-foot elevated split squat', Lunge: 'Reverse lunge',
  'Leg curl': 'Slider leg curl', 'Calf raise': 'Single-leg calf raise', Curl: 'Towel curl', Carry: 'Bear crawl',
  'Back extension': 'Superman', 'Lateral raise': 'Wall slide', 'Triceps extension': 'Diamond push-up', 'Rear-delt raise': 'Prone Y raise',
};
type GoalChoice = NonNullable<WorkoutPlan['goals']>[number];
type EquipmentChoice = NonNullable<WorkoutPlan['equipmentOptions']>[number];
type CardioChoice = NonNullable<WorkoutPlan['cardioOptions']>[number];
const equipmentName = (name: string, equipment: EquipmentChoice[]) => {
  const versions = equipment.map((kind) => kind === 'bodyweight' ? BODY[name] ?? name : kind === 'home' ? HOME[name] ?? name : name);
  return [...new Set(versions)].join(' / ');
};
const prescription = (goal: WorkoutPlan['goal']) => goal === 'strength' ? { sets: 4, reps: '3–6 reps' } : goal === 'general' ? { sets: 3, reps: '8–12 reps' } : { sets: 4, reps: '6–12 reps' };
const cardioMinutes = (plan: WorkoutPlan) => plan.goal === 'fat_loss' || plan.goal === 'recomp' ? Math.min(30, plan.minutes) : Math.min(20, Math.round(plan.minutes / 3));
const GUIDE: Record<string, string[]> = {
  squat: ['Brace your core and keep your whole foot planted.', 'Sit down between your hips with knees tracking over toes.', 'Drive the floor away and finish tall.'],
  press: ['Set shoulders down and back before the first rep.', 'Lower with control through a comfortable range.', 'Press smoothly without flaring your ribs.'],
  row: ['Keep your torso stable and spine neutral.', 'Pull elbows toward your back pockets.', 'Pause briefly, then lower under control.'],
  hinge: ['Soften your knees and push your hips backward.', 'Keep the weight close and your spine neutral.', 'Squeeze your glutes to stand; do not lean back.'],
};
const guideFor = (name: string) => GUIDE[/squat|lunge|split/i.test(name) ? 'squat' : /press|push-up|extension|raise/i.test(name) ? 'press' : /row|pull|curl/i.test(name) ? 'row' : 'hinge'];

function Diagram() {
  return <View style={styles.diagram}><Svg width="240" height="130" viewBox="0 0 240 130"><Rect x="1" y="1" width="238" height="128" rx="18" fill="#F7F7F7" /><Circle cx="62" cy="30" r="10" fill="#1A1A1A" /><Line x1="62" y1="40" x2="62" y2="78" stroke="#1A1A1A" strokeWidth="7" strokeLinecap="round" /><Line x1="62" y1="50" x2="38" y2="68" stroke="#1A1A1A" strokeWidth="6" strokeLinecap="round" /><Line x1="62" y1="50" x2="86" y2="68" stroke="#1A1A1A" strokeWidth="6" strokeLinecap="round" /><Line x1="62" y1="78" x2="43" y2="108" stroke="#1A1A1A" strokeWidth="7" strokeLinecap="round" /><Line x1="62" y1="78" x2="81" y2="108" stroke="#1A1A1A" strokeWidth="7" strokeLinecap="round" /><Line x1="112" y1="65" x2="132" y2="65" stroke="#A3A3A3" strokeWidth="3" /><Line x1="125" y1="58" x2="132" y2="65" stroke="#A3A3A3" strokeWidth="3" /><Line x1="125" y1="72" x2="132" y2="65" stroke="#A3A3A3" strokeWidth="3" /><Circle cx="180" cy="43" r="10" fill="#1A1A1A" /><Line x1="180" y1="53" x2="180" y2="84" stroke="#1A1A1A" strokeWidth="7" strokeLinecap="round" /><Line x1="180" y1="60" x2="154" y2="77" stroke="#1A1A1A" strokeWidth="6" strokeLinecap="round" /><Line x1="180" y1="60" x2="206" y2="77" stroke="#1A1A1A" strokeWidth="6" strokeLinecap="round" /><Line x1="180" y1="84" x2="158" y2="104" stroke="#1A1A1A" strokeWidth="7" strokeLinecap="round" /><Line x1="180" y1="84" x2="202" y2="104" stroke="#1A1A1A" strokeWidth="7" strokeLinecap="round" /></Svg></View>;
}

export default function Workouts() {
  const stored = useStore((s) => s.settings.workoutPlan ?? DEFAULT_SETTINGS.workoutPlan);
  const updateSettings = useStore((s) => s.updateSettings);
  const addActivity = useStore((s) => s.addActivity);
  const checks = useStore((s) => s.workoutChecks);
  const toggleCheck = useStore((s) => s.toggleWorkoutCheck);
  const day = useStore((s) => s.day);
  const weight = useStore((s) => s.profile?.weightLb ?? 170);
  const [plan, setPlan] = useState<WorkoutPlan>(stored);
  const [guide, setGuide] = useState<string | null>(null);
  const selectedGoals: GoalChoice[] = plan.goals?.length ? plan.goals : [plan.goal === 'recomp' ? 'muscle' : plan.goal];
  const selectedEquipment: EquipmentChoice[] = plan.equipmentOptions?.length ? plan.equipmentOptions : [plan.equipment];
  const selectedCardio: CardioChoice[] = plan.cardioOptions?.length ? plan.cardioOptions : [plan.cardio];
  const routine = PLANS[plan.split].map((d) => ({ ...d, exercises: d.exercises.map((e) => equipmentName(e, selectedEquipment)) }));
  const rx = prescription(selectedGoals.includes('strength') ? 'strength' : selectedGoals.includes('muscle') ? 'muscle' : selectedGoals.includes('fat_loss') ? 'fat_loss' : 'general');
  const set = <K extends keyof WorkoutPlan>(key: K, value: WorkoutPlan[K]) => { const next = { ...plan, [key]: value }; setPlan(next); updateSettings({ workoutPlan: next }); };
  const toggleGoal = (value: GoalChoice) => {
    let goals: GoalChoice[];
    if (value === 'general') goals = selectedGoals.includes('general') ? ['general'] : ['general'];
    else {
      const withoutGeneral = selectedGoals.filter((x) => x !== 'general');
      goals = withoutGeneral.includes(value) ? withoutGeneral.filter((x) => x !== value) : [...withoutGeneral, value];
      if (!goals.length) goals = ['general'];
    }
    const next = { ...plan, goals, goal: goals.includes('strength') ? 'strength' as const : goals.includes('muscle') ? 'muscle' as const : goals.includes('fat_loss') ? 'fat_loss' as const : 'general' as const };
    setPlan(next); updateSettings({ workoutPlan: next });
  };
  const toggleEquipment = (value: EquipmentChoice) => {
    let equipmentOptions = selectedEquipment.includes(value) ? selectedEquipment.filter((x) => x !== value) : [...selectedEquipment, value];
    if (!equipmentOptions.length) equipmentOptions = [value];
    const next = { ...plan, equipmentOptions, equipment: equipmentOptions[0] };
    setPlan(next); updateSettings({ workoutPlan: next });
  };
  const toggleCardio = (value: CardioChoice) => {
    let cardioOptions = selectedCardio.includes(value) ? selectedCardio.filter((x) => x !== value) : [...selectedCardio, value];
    if (!cardioOptions.length) cardioOptions = [value];
    const next = { ...plan, cardioOptions, cardio: cardioOptions[0] };
    setPlan(next); updateSettings({ workoutPlan: next });
  };
  const log = (name: string, cardio = false) => {
    const minutes = cardio ? cardioMinutes(plan) : plan.minutes;
    const met = cardio ? (plan.cardio === 'walk' ? 3.5 : plan.cardio === 'intervals' ? 9 : 6.5) : 5;
    addActivity({ date: day, type: cardio ? CARDIO.find((x) => x.id === plan.cardio)?.label ?? 'Cardio' : name, minutes, calories: Math.round(((met * 3.5 * weight * 0.4536) / 200) * minutes), source: 'manual' });
    success(); Alert.alert('Workout logged', `${name} · ${minutes} minutes`);
  };
  return <View style={{ flex: 1, backgroundColor: '#fff' }}><TopBar title="Workouts" /><Screen top={false}>
    <View style={styles.hero}><Text style={styles.heroTitle}>Train for your goal</Text><Text style={styles.heroSub}>Your plan adapts to your goal, schedule, and equipment. Check off every set as you go.</Text></View>
    <Section title="Goals · choose all that apply"><View style={styles.chips}>{GOALS.map((x) => <Chip key={x.id} label={x.label} on={x.id !== 'recomp' && selectedGoals.includes(x.id)} onPress={() => x.id !== 'recomp' && toggleGoal(x.id)} />)}</View>{selectedGoals.includes('fat_loss') && selectedGoals.includes('muscle') ? <Text style={styles.goalNote}>Recomposition plan: build muscle while steadily reducing body fat.</Text> : null}</Section>
    <Section title="Weekly split"><View style={styles.chips}>{SPLITS.map((x) => <Chip key={x.id} label={x.label} on={plan.split === x.id} onPress={() => set('split', x.id)} />)}</View></Section>
    <Section title="Schedule"><View style={styles.chips}>{([3, 4, 5, 6] as const).map((x) => <Chip key={x} label={`${x} days`} on={plan.days === x} onPress={() => set('days', x)} />)}</View><View style={styles.chips}>{([30, 45, 60, 75] as const).map((x) => <Chip key={x} label={`${x} min`} on={plan.minutes === x} onPress={() => set('minutes', x)} />)}</View></Section>
    <Section title="Equipment · choose all you have"><View style={styles.chips}>{(['gym', 'home', 'bodyweight'] as const).map((x) => <Chip key={x} label={x[0].toUpperCase() + x.slice(1)} on={selectedEquipment.includes(x)} onPress={() => toggleEquipment(x)} />)}</View></Section>
    <Section title="Your strength plan"><View style={{ gap: space.m }}>{routine.map((workout) => <Card key={workout.name}><Text style={styles.title}>{workout.name}</Text><Text style={styles.meta}>{rx.sets} working sets · {rx.reps} · rest 1–3 min</Text>{workout.exercises.map((exercise) => <View key={exercise} style={styles.exerciseBlock}><View style={styles.exerciseHead}><Text style={styles.exerciseName}>{exercise}</Text><Pressable onPress={() => setGuide(exercise)} hitSlop={8}><Text style={styles.guideLink}>How to</Text></Pressable></View><View style={styles.sets}>{Array.from({ length: rx.sets }, (_, index) => { const key = `${day}|${workout.name}|${exercise}|${index}`; const done = !!checks[key]; return <Pressable key={key} onPress={() => { tap(); toggleCheck(key); }} style={[styles.setRow, done && styles.setDone]} accessibilityRole="checkbox" accessibilityState={{ checked: done }}><Ionicons name={done ? 'checkbox' : 'square-outline'} size={22} color={done ? color.ink : color.faint} /><Text style={[styles.setText, done && styles.doneText]}>Set {index + 1}</Text><Text style={[styles.repText, done && styles.doneText]}>{rx.reps}</Text></Pressable>; })}</View></View>)}<Button label="Finish and log workout" icon="checkmark" onPress={() => log(workout.name)} style={{ marginTop: space.m }} /></Card>)}</View></Section>
    <Section title="Cardio · choose all you enjoy"><Card><View style={styles.chips}>{CARDIO.map((x) => <Chip key={x.id} label={x.label} on={selectedCardio.includes(x.id)} onPress={() => toggleCardio(x.id)} />)}</View><Text style={styles.meta}>{cardioMinutes(plan)} minutes at a sustainable pace. Recomposition pairs strength training with regular low-to-moderate cardio.</Text><View style={styles.cardioBtns}>{selectedCardio.map((id) => { const label = CARDIO.find((x) => x.id === id)?.label ?? 'Cardio'; return <Button key={id} label={`Log ${label.toLowerCase()}`} icon="heart-outline" kind="secondary" onPress={() => { const next = { ...plan, cardio: id }; setPlan(next); log(label, true); }} style={styles.cardioBtn} />; })}</View></Card></Section>
    <Text style={styles.note}>Stop if you feel pain, dizziness, or unusual shortness of breath. Vahla provides general planning, not medical advice.</Text>
    <Modal visible={!!guide} transparent animationType="fade" onRequestClose={() => setGuide(null)}><View style={styles.modalShade}><View style={styles.modal}><View style={styles.modalHead}><Text style={styles.modalTitle}>{guide}</Text><Pressable onPress={() => setGuide(null)}><Ionicons name="close" size={24} color={color.ink} /></Pressable></View><Diagram />{guide ? guideFor(guide).map((line, i) => <Text key={line} style={styles.cue}>{i + 1}. {line}</Text>) : null}<Button label="Got it" onPress={() => setGuide(null)} style={{ marginTop: space.m }} /></View></View></Modal>
  </Screen></View>;
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.l, paddingTop: space.m }, heroTitle: { fontFamily: font.displayBold, fontSize: 28, color: color.ink }, heroSub: { color: color.sub, fontSize: 14, lineHeight: 20, marginTop: 5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginBottom: space.s }, title: { fontFamily: font.display, fontSize: 20, color: color.ink }, meta: { color: color.sub, fontSize: 13, lineHeight: 19, marginVertical: space.s },
  exerciseBlock: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line, paddingTop: space.m, marginTop: space.m }, exerciseHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, exerciseName: { fontFamily: font.displayMed, fontSize: 15, color: color.ink, flex: 1 }, guideLink: { color: color.ink, fontWeight: '700', fontSize: 13, textDecorationLine: 'underline' }, sets: { gap: 6, marginTop: space.s },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 40, paddingHorizontal: space.s, borderRadius: 10, backgroundColor: color.wash }, setDone: { backgroundColor: color.wash2 }, setText: { color: color.ink, fontSize: 14, flex: 1 }, repText: { color: color.sub, fontSize: 13 }, doneText: { textDecorationLine: 'line-through', color: color.faint },
  goalNote: { color: color.ink, fontSize: 13, lineHeight: 19, backgroundColor: color.wash, borderRadius: 12, padding: space.m, marginTop: space.s }, cardioBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s }, cardioBtn: { flexGrow: 1, minWidth: 140 },
  note: { color: color.sub, fontSize: 12, lineHeight: 18, paddingHorizontal: space.l, marginTop: space.l }, modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'center', padding: space.l }, modal: { width: '100%', maxWidth: 420, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 24, padding: space.l }, modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.m }, modalTitle: { fontFamily: font.display, fontSize: 21, color: color.ink }, diagram: { alignItems: 'center', marginBottom: space.m }, cue: { color: color.ink, fontSize: 14, lineHeight: 21, marginTop: 5 },
});
