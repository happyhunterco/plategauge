import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { TopBar } from '../../src/components/Kit';
import { Button, Chip, Screen, success, tap } from '../../src/components/UI';
import { dayKey, longDate, shiftKey, weekOf } from '../../src/dates';
import { DEFAULT_SETTINGS, useStore, type WorkoutPlan } from '../../src/store';
import { color, font, radius, shadow, space } from '../../src/theme';
import { dailyWorkout, isTrainingDay, workoutCheckKey, workoutProgress, type PlannedExercise } from '../../src/workoutPlan';

const GOALS = [
  { id: 'fat_loss', label: 'Lose fat' }, { id: 'muscle', label: 'Build muscle' },
  { id: 'strength', label: 'Get stronger' }, { id: 'general', label: 'Feel healthier' },
] as const;
const SPLITS = [
  { id: 'full_body', label: 'Full body' }, { id: 'upper_lower', label: 'Upper / lower' },
  { id: 'ppl', label: 'Push / pull / legs' }, { id: 'strength_cardio', label: 'Strength + cardio' },
] as const;
const CARDIO = [
  { id: 'walk', label: 'Walk' }, { id: 'incline_walk', label: 'Incline walk' }, { id: 'run', label: 'Run' },
  { id: 'bike', label: 'Bike' }, { id: 'row', label: 'Row' }, { id: 'intervals', label: 'Intervals' },
] as const;
const EXPERIENCE = [
  { id: 'beginner', label: 'Beginner · under 1 year' }, { id: 'intermediate', label: 'Intermediate · 1–3 years' }, { id: 'advanced', label: 'Advanced · 3+ years' },
] as const;
const EMPHASIS = [
  { id: 'balanced', label: 'Balanced' }, { id: 'glutes_legs', label: 'Glutes + legs' },
  { id: 'upper_body', label: 'Upper body' }, { id: 'athletic', label: 'Athletic' },
] as const;
const LIMITATIONS = [
  { id: 'knees', label: 'Knee-friendly' }, { id: 'lower_back', label: 'Back-friendly' }, { id: 'shoulders', label: 'Shoulder-friendly' },
] as const;
const TRAINING_STYLE = [
  { id: 'mixed', label: 'A mix of both' }, { id: 'free_weights', label: 'Mostly free weights' }, { id: 'machines', label: 'Mostly machines' },
] as const;
type GoalChoice = NonNullable<WorkoutPlan['goals']>[number];
type EquipmentChoice = NonNullable<WorkoutPlan['equipmentOptions']>[number];
type CardioChoice = NonNullable<WorkoutPlan['cardioOptions']>[number];
type LimitationChoice = NonNullable<WorkoutPlan['limitations']>[number];

export default function Workouts() {
  const stored = useStore((s) => s.settings.workoutPlan ?? DEFAULT_SETTINGS.workoutPlan);
  const updateSettings = useStore((s) => s.updateSettings);
  const checks = useStore((s) => s.workoutChecks);
  const toggleCheck = useStore((s) => s.toggleWorkoutCheck);
  const activities = useStore((s) => s.activities);
  const addActivity = useStore((s) => s.addActivity);
  const steps = useStore((s) => s.steps);
  const weight = useStore((s) => s.profile?.weightLb ?? 170);
  const today = dayKey();
  const [plan, setPlan] = useState(stored);
  const [settingsOpen, setSettingsOpen] = useState(!stored.personalized);
  const [guide, setGuide] = useState<PlannedExercise | null>(null);
  const workout = useMemo(() => dailyWorkout(plan, today), [plan, today]);
  const progress = workoutProgress(workout, checks, today);
  const completed = activities.some((a) => a.date === today && a.type === `Vahla · ${workout.title}`);
  const week = weekOf(today);
  const selectedGoals: GoalChoice[] = plan.goals?.length ? plan.goals : [plan.goal === 'recomp' ? 'muscle' : plan.goal];
  const selectedEquipment: EquipmentChoice[] = plan.equipmentOptions?.length ? plan.equipmentOptions : [plan.equipment];
  const selectedCardio: CardioChoice[] = plan.cardioOptions?.length ? plan.cardioOptions : [plan.cardio];
  const selectedLimitations = plan.limitations ?? [];
  const save = (next: WorkoutPlan) => { setPlan(next); updateSettings({ workoutPlan: next }); };
  const set = <K extends keyof WorkoutPlan>(key: K, value: WorkoutPlan[K]) => save({ ...plan, [key]: value });
  const toggleGoal = (value: GoalChoice) => {
    const withoutGeneral = selectedGoals.filter((x) => x !== 'general');
    let goals: GoalChoice[] = value === 'general' ? ['general'] : withoutGeneral.includes(value) ? withoutGeneral.filter((x) => x !== value) : [...withoutGeneral, value];
    if (!goals.length) goals = ['general'];
    const goal = goals.includes('strength') ? 'strength' : goals.includes('muscle') && goals.includes('fat_loss') ? 'recomp' : goals.includes('muscle') ? 'muscle' : goals.includes('fat_loss') ? 'fat_loss' : 'general';
    save({ ...plan, goals, goal });
  };
  const toggleEquipment = (value: EquipmentChoice) => {
    let options = selectedEquipment.includes(value) ? selectedEquipment.filter((x) => x !== value) : [...selectedEquipment, value];
    if (!options.length) options = [value];
    save({ ...plan, equipmentOptions: options, equipment: options[0] });
  };
  const toggleCardio = (value: CardioChoice) => {
    let options = selectedCardio.includes(value) ? selectedCardio.filter((x) => x !== value) : [...selectedCardio, value];
    if (!options.length) options = [value];
    save({ ...plan, cardioOptions: options, cardio: options[0] });
  };
  const toggleLimitation = (value: LimitationChoice) => {
    const limitations = selectedLimitations.includes(value) ? selectedLimitations.filter((x) => x !== value) : [...selectedLimitations, value];
    save({ ...plan, limitations });
  };
  const logWorkout = () => {
    if (completed) return;
    const met = workout.recovery ? 3 : 5.5;
    addActivity({ date: today, type: `Vahla · ${workout.title}`, minutes: workout.duration, calories: Math.round(((met * 3.5 * weight * 0.4536) / 200) * workout.duration), source: 'manual' });
    success(); Alert.alert('Session complete', 'Your workout has been added to today.');
  };

  return <View style={styles.page}><TopBar title="Training" /><Screen top={false}>
    <View style={styles.intro}>
      <View><Text style={styles.eyebrow}>{longDate(today).toUpperCase()}</Text><Text style={styles.pageTitle}>Today’s plan</Text></View>
      <Pressable onPress={() => setSettingsOpen(true)} style={styles.editButton} accessibilityRole="button"><Ionicons name="options-outline" size={18} color={color.ink} /><Text style={styles.editText}>Edit plan</Text></Pressable>
    </View>

    <View style={styles.week}>
      {week.map((date) => {
        const active = isTrainingDay(plan, date); const current = date === today;
        return <View key={date} style={styles.day}><Text style={[styles.dayName, current && styles.dayNameOn]}>{new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' })}</Text><View style={[styles.dayDot, active && styles.dayDotActive, current && styles.dayDotCurrent]}>{current ? <View style={styles.todayDot} /> : null}</View></View>;
      })}
    </View>

    <View style={styles.hero}>
      <View style={styles.heroTop}><View style={styles.sessionIcon}><Ionicons name={workout.recovery ? 'leaf-outline' : 'barbell-outline'} size={22} color="#fff" /></View><View style={{ flex: 1 }}><Text style={styles.heroKicker}>{workout.recovery ? 'RECOVERY DAY' : 'TODAY’S SESSION'}</Text><Text style={styles.heroTitle}>{workout.title}</Text><Text style={styles.heroFocus}>{workout.focus} · {experienceLabel(plan.experience)} · {emphasisLabel(plan.emphasis)}</Text></View><Text style={styles.heroPct}>{Math.round(progress.ratio * 100)}%</Text></View>
      <View style={styles.heroTrack}><View style={[styles.heroFill, { width: `${progress.ratio * 100}%` }]} /></View>
      <View style={styles.heroMeta}><Meta icon="time-outline" text={`${workout.duration} min`} /><Meta icon="layers-outline" text={`${workout.exercises.length} movements`} /><Meta icon="pulse-outline" text={`${workout.cardio.minutes} min cardio`} /></View>
    </View>

    <View style={styles.readiness}>
      <View><Text style={styles.smallLabel}>DAILY MOVEMENT</Text><Text style={styles.readinessValue}>{steps[today]?.toLocaleString() ?? '—'} <Text style={styles.readinessUnit}>steps</Text></Text></View>
      <View style={styles.readinessLine} />
      <View style={{ flex: 1 }}><Text style={styles.smallLabel}>PLAN STATUS</Text><Text style={styles.statusText}>{completed ? 'Complete' : progress.done ? `${progress.done} of ${progress.total} sets` : 'Ready when you are'}</Text></View>
      {!steps[today] ? <Ionicons name="heart-outline" size={20} color={color.faint} /> : null}
    </View>

    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Workout</Text><Text style={styles.sectionCount}>{progress.done}/{progress.total} sets</Text></View>
    <View style={styles.exerciseList}>
      {workout.exercises.map((exercise, exerciseIndex) => {
        const done = Array.from({ length: exercise.sets }, (_, i) => !!checks[workoutCheckKey(today, workout.id, exercise.id, i)]).filter(Boolean).length;
        return <View key={exercise.id} style={styles.exerciseCard}>
          <Pressable onPress={() => setGuide(exercise)} style={styles.exerciseMain} accessibilityRole="button">
            <Text style={styles.exerciseNumber}>{String(exerciseIndex + 1).padStart(2, '0')}</Text>
            <View style={{ flex: 1 }}><Text style={styles.exerciseName}>{exercise.name}</Text><Text style={styles.exerciseTarget}>{exercise.target} · {exercise.reps}</Text></View>
            <View style={[styles.exerciseBadge, done === exercise.sets && styles.exerciseBadgeDone]}><Text style={[styles.exerciseBadgeText, done === exercise.sets && { color: '#fff' }]}>{done}/{exercise.sets}</Text></View>
          </Pressable>
          <View style={styles.setRow}>
            {Array.from({ length: exercise.sets }, (_, index) => { const key = workoutCheckKey(today, workout.id, exercise.id, index); const on = !!checks[key]; return <Pressable key={key} onPress={() => { tap(); toggleCheck(key); }} style={[styles.setBox, on && styles.setBoxOn]} accessibilityRole="checkbox" accessibilityState={{ checked: on }}><Text style={[styles.setBoxText, on && { color: '#fff' }]}>{on ? '✓' : index + 1}</Text></Pressable>; })}
            <Text style={styles.restText}>{exercise.rest} rest</Text>
          </View>
        </View>;
      })}
    </View>

    <View style={styles.cardioCard}><View style={styles.cardioIcon}><Ionicons name="heart-outline" size={22} color={color.ink} /></View><View style={{ flex: 1 }}><Text style={styles.cardioKicker}>CARDIO FINISHER</Text><Text style={styles.cardioTitle}>{workout.cardio.label}</Text><Text style={styles.cardioSub}>{workout.cardio.minutes} min · {workout.cardio.detail}</Text></View><Ionicons name="arrow-forward" size={20} color={color.ink} /></View>

    <Button label={completed ? 'Workout complete' : progress.done < progress.total ? `Complete ${progress.total - progress.done} sets first` : 'Finish workout'} icon={completed ? 'checkmark-circle' : 'checkmark'} disabled={completed || progress.done < progress.total} onPress={logWorkout} style={styles.finish} />
    <View style={styles.next}><Text style={styles.smallLabel}>NEXT SESSION</Text><Text style={styles.nextTitle}>{dailyWorkout(plan, nextTrainingDay(plan, today)).title}</Text><Text style={styles.nextSub}>{longDate(nextTrainingDay(plan, today))}</Text></View>

    <Modal visible={settingsOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSettingsOpen(false)}><Screen title={plan.personalized ? 'Your training plan' : 'Build your plan'} subtitle={plan.personalized ? 'Update how Vahla programs your training.' : 'A few details make every workout feel built for you.'} right={<Pressable onPress={() => setSettingsOpen(false)}><Ionicons name="close" size={26} color={color.ink} /></Pressable>}>
      <PlanSection title="Goals" hint="Choose all that apply">{GOALS.map((x) => <Chip key={x.id} label={x.label} on={selectedGoals.includes(x.id)} onPress={() => toggleGoal(x.id)} />)}</PlanSection>
      <PlanSection title="What’s your training experience?" hint="This changes exercise selection, volume, and progression">{EXPERIENCE.map((x) => <Chip key={x.id} label={x.label} on={(plan.experience ?? 'beginner') === x.id} onPress={() => set('experience', x.id)} />)}</PlanSection>
      <PlanSection title="What do you want to emphasize?">{EMPHASIS.map((x) => <Chip key={x.id} label={x.label} on={(plan.emphasis ?? 'balanced') === x.id} onPress={() => set('emphasis', x.id)} />)}</PlanSection>
      <PlanSection title="How do you like to train?">{TRAINING_STYLE.map((x) => <Chip key={x.id} label={x.label} on={(plan.trainingStyle ?? 'mixed') === x.id} onPress={() => set('trainingStyle', x.id)} />)}</PlanSection>
      <PlanSection title="Training style">{SPLITS.map((x) => <Chip key={x.id} label={x.label} on={plan.split === x.id} onPress={() => set('split', x.id)} />)}</PlanSection>
      <PlanSection title="Weekly schedule">{([3, 4, 5, 6] as const).map((x) => <Chip key={x} label={`${x} days`} on={plan.days === x} onPress={() => set('days', x)} />)}</PlanSection>
      <PlanSection title="Session length">{([30, 45, 60, 75] as const).map((x) => <Chip key={x} label={`${x} min`} on={plan.minutes === x} onPress={() => set('minutes', x)} />)}</PlanSection>
      <PlanSection title="Equipment" hint="Choose everything you can use">{(['gym', 'home', 'bodyweight'] as const).map((x) => <Chip key={x} label={x === 'bodyweight' ? 'Bodyweight' : x[0].toUpperCase() + x.slice(1)} on={selectedEquipment.includes(x)} onPress={() => toggleEquipment(x)} />)}</PlanSection>
      <PlanSection title="Cardio you enjoy">{CARDIO.map((x) => <Chip key={x.id} label={x.label} on={selectedCardio.includes(x.id)} onPress={() => toggleCardio(x.id)} />)}</PlanSection>
      <PlanSection title="Movement needs" hint="Optional. Choose all that apply">{LIMITATIONS.map((x) => <Chip key={x.id} label={x.label} on={selectedLimitations.includes(x.id)} onPress={() => toggleLimitation(x.id)} />)}</PlanSection>
      <Text style={styles.safety}>Vahla adapts exercise selection, but it does not diagnose injuries. Stop if a movement causes pain.</Text>
      <Button label={plan.personalized ? 'Save changes' : 'Build my plan'} onPress={() => { save({ ...plan, personalized: true }); setSettingsOpen(false); }} style={{ margin: space.l }} />
    </Screen></Modal>

    <Modal visible={!!guide} transparent animationType="fade" onRequestClose={() => setGuide(null)}><View style={styles.modalShade}><View style={styles.guide}><View style={styles.guideIcon}><Ionicons name="body-outline" size={32} color={color.ink} /></View><Text style={styles.guideTitle}>{guide?.name}</Text><Text style={styles.guideMeta}>{guide?.target} · {guide?.sets} sets · {guide?.reps}</Text><Text style={styles.guideCopy}>Move with control through a comfortable range. Keep your core braced, stop before form breaks down, and leave one or two quality reps in reserve.</Text><Button label="Ready" onPress={() => setGuide(null)} /></View></View></Modal>
  </Screen></View>;
}

const nextTrainingDay = (plan: WorkoutPlan, date: string) => { for (let i = 1; i <= 7; i += 1) { const next = shiftKey(date, i); if (isTrainingDay(plan, next)) return next; } return shiftKey(date, 1); };
const emphasisLabel = (emphasis: WorkoutPlan['emphasis']) => ({ balanced: 'Balanced', glutes_legs: 'Glute + leg focus', upper_body: 'Upper-body focus', athletic: 'Athletic focus' })[emphasis ?? 'balanced'];
const experienceLabel = (experience: WorkoutPlan['experience']) => ({ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' })[experience ?? 'beginner'];
function Meta({ icon, text }: { icon: ComponentProps<typeof Ionicons>['name']; text: string }) { return <View style={styles.meta}><Ionicons name={icon} size={15} color="#BDBDBD" /><Text style={styles.metaText}>{text}</Text></View>; }
function PlanSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) { return <View style={styles.planSection}><Text style={styles.planTitle}>{title}</Text>{hint ? <Text style={styles.planHint}>{hint}</Text> : null}<View style={styles.chips}>{children}</View></View>; }

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.plate }, intro: { paddingHorizontal: space.l, paddingTop: space.m, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { fontSize: 10, letterSpacing: 1.4, color: color.sub, fontWeight: '700' }, pageTitle: { fontFamily: font.displayBold, fontSize: 30, color: color.ink, marginTop: 3, letterSpacing: -0.8 }, editButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 38, borderRadius: radius.pill, backgroundColor: color.wash2 }, editText: { fontSize: 13, fontWeight: '700', color: color.ink },
  week: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: space.l, marginTop: space.xl, marginBottom: space.l }, day: { alignItems: 'center', gap: 7 }, dayName: { fontSize: 11, color: color.faint, fontWeight: '700' }, dayNameOn: { color: color.ink }, dayDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.line }, dayDotActive: { backgroundColor: color.wash2 }, dayDotCurrent: { backgroundColor: color.ink, borderColor: color.ink }, todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#fff' },
  hero: { marginHorizontal: space.l, backgroundColor: color.ink, borderRadius: 28, padding: 20, ...shadow.raised }, heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 }, sessionIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }, heroKicker: { color: '#AFAFAF', fontSize: 9, letterSpacing: 1.5, fontWeight: '800' }, heroTitle: { color: '#fff', fontFamily: font.displayBold, fontSize: 24, marginTop: 3 }, heroFocus: { color: '#BDBDBD', fontSize: 12, marginTop: 2 }, heroPct: { color: '#fff', fontFamily: font.display, fontSize: 16 }, heroTrack: { height: 4, borderRadius: 2, backgroundColor: '#3A3A3A', marginTop: 18, overflow: 'hidden' }, heroFill: { height: 4, borderRadius: 2, backgroundColor: '#fff' }, heroMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }, meta: { flexDirection: 'row', alignItems: 'center', gap: 5 }, metaText: { color: '#D0D0D0', fontSize: 10 },
  readiness: { marginHorizontal: space.l, marginTop: space.m, padding: 16, borderRadius: radius.l, backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, flexDirection: 'row', gap: 14, alignItems: 'center' }, smallLabel: { fontSize: 9, letterSpacing: 1.2, color: color.sub, fontWeight: '800' }, readinessValue: { fontFamily: font.display, color: color.ink, fontSize: 17, marginTop: 4 }, readinessUnit: { fontFamily: undefined, fontSize: 11, color: color.sub }, readinessLine: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: color.line }, statusText: { color: color.ink, fontSize: 13, fontWeight: '600', marginTop: 5 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: space.l, marginTop: space.xl, marginBottom: space.m }, sectionTitle: { fontFamily: font.display, fontSize: 20, color: color.ink }, sectionCount: { color: color.sub, fontSize: 12 }, exerciseList: { marginHorizontal: space.l, gap: 9 }, exerciseCard: { backgroundColor: '#fff', borderRadius: 18, padding: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line }, exerciseMain: { flexDirection: 'row', alignItems: 'center', gap: 12 }, exerciseNumber: { color: color.faint, fontSize: 11, fontWeight: '700', width: 20 }, exerciseName: { fontFamily: font.displayMed, color: color.ink, fontSize: 15 }, exerciseTarget: { color: color.sub, fontSize: 11, marginTop: 3 }, exerciseBadge: { minWidth: 38, height: 28, paddingHorizontal: 8, borderRadius: 14, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' }, exerciseBadgeDone: { backgroundColor: color.ink }, exerciseBadgeText: { fontSize: 11, fontWeight: '700', color: color.sub }, setRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 13, marginLeft: 32 }, setBox: { width: 31, height: 31, borderRadius: 10, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' }, setBoxOn: { backgroundColor: color.ink }, setBoxText: { fontSize: 11, fontWeight: '800', color: color.sub }, restText: { flex: 1, textAlign: 'right', color: color.faint, fontSize: 10 },
  cardioCard: { marginHorizontal: space.l, marginTop: space.l, padding: 17, backgroundColor: '#E8EFE8', borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 13 }, cardioIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' }, cardioKicker: { color: color.sub, fontSize: 9, letterSpacing: 1.2, fontWeight: '800' }, cardioTitle: { fontFamily: font.display, fontSize: 16, color: color.ink, marginTop: 2 }, cardioSub: { color: color.sub, fontSize: 10, marginTop: 3 }, finish: { marginHorizontal: space.l, marginTop: space.l }, next: { marginHorizontal: space.l, marginTop: space.xl, paddingTop: space.l, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: color.line }, nextTitle: { fontFamily: font.display, color: color.ink, fontSize: 16, marginTop: 5 }, nextSub: { color: color.sub, fontSize: 12, marginTop: 3 },
  planSection: { paddingHorizontal: space.l, marginTop: space.xl }, planTitle: { fontFamily: font.display, fontSize: 17, color: color.ink }, planHint: { fontSize: 12, color: color.sub, marginTop: 3 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m }, safety: { color: color.sub, fontSize: 11, lineHeight: 17, marginHorizontal: space.l, marginTop: space.xl }, modalShade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: space.l }, guide: { backgroundColor: '#fff', borderRadius: 28, padding: 24, maxWidth: 440, width: '100%', alignSelf: 'center' }, guideIcon: { width: 58, height: 58, borderRadius: 19, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center', marginBottom: space.l }, guideTitle: { fontFamily: font.displayBold, color: color.ink, fontSize: 23 }, guideMeta: { color: color.sub, fontSize: 13, marginTop: 5 }, guideCopy: { color: color.ink, fontSize: 14, lineHeight: 21, marginVertical: space.xl },
});
