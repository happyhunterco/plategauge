import type { WorkoutPlan } from './store';

export type PlannedExercise = { id: string; name: string; target: string; sets: number; reps: string; rest: string };
export type DailyWorkout = {
  id: string; title: string; focus: string; recovery: boolean; duration: number; exercises: PlannedExercise[];
  cardio: { kind: WorkoutPlan['cardio']; label: string; minutes: number; detail: string };
};
type BaseExercise = Omit<PlannedExercise, 'sets' | 'rest'>;
type Session = { id: string; title: string; focus: string; exercises: BaseExercise[] };
const e = (id: string, name: string, target: string, reps: string): BaseExercise => ({ id, name, target, reps });

const SESSIONS: Record<WorkoutPlan['split'], Session[]> = {
  full_body: [
    { id: 'full-a', title: 'Foundation', focus: 'Full body strength', exercises: [e('squat', 'Back squat', 'Quads · glutes', '6–8'), e('bench', 'Bench press', 'Chest · triceps', '6–10'), e('row', 'Seated cable row', 'Back · biceps', '8–12'), e('rdl', 'Romanian deadlift', 'Hamstrings · glutes', '8–10'), e('carry', 'Farmer carry', 'Core · grip', '40 sec')] },
    { id: 'full-b', title: 'Build', focus: 'Full body hypertrophy', exercises: [e('deadlift', 'Trap-bar deadlift', 'Posterior chain', '5–6'), e('press', 'Dumbbell shoulder press', 'Shoulders · triceps', '8–12'), e('pulldown', 'Lat pulldown', 'Back · biceps', '8–12'), e('split-squat', 'Rear-foot split squat', 'Quads · glutes', '8 each'), e('plank', 'Plank', 'Core', '45 sec')] },
    { id: 'full-c', title: 'Athletic', focus: 'Strength and movement', exercises: [e('front-squat', 'Front squat', 'Quads · core', '6–8'), e('incline', 'Incline dumbbell press', 'Upper chest', '8–12'), e('one-row', 'Single-arm row', 'Back · biceps', '10 each'), e('hip-thrust', 'Hip thrust', 'Glutes', '8–12'), e('pallof', 'Pallof press', 'Core', '12 each')] },
  ],
  upper_lower: [
    { id: 'upper-a', title: 'Upper I', focus: 'Press and pull', exercises: [e('bench', 'Bench press', 'Chest · triceps', '6–8'), e('row', 'Chest-supported row', 'Upper back', '8–10'), e('press', 'Shoulder press', 'Shoulders', '8–10'), e('pulldown', 'Lat pulldown', 'Lats · biceps', '10–12'), e('arms', 'Cable curl + pressdown', 'Arms', '12 each')] },
    { id: 'lower-a', title: 'Lower I', focus: 'Squat emphasis', exercises: [e('squat', 'Back squat', 'Quads · glutes', '5–8'), e('rdl', 'Romanian deadlift', 'Hamstrings', '8–10'), e('lunge', 'Walking lunge', 'Legs', '10 each'), e('curl', 'Leg curl', 'Hamstrings', '10–15'), e('calf', 'Standing calf raise', 'Calves', '12–15')] },
    { id: 'upper-b', title: 'Upper II', focus: 'Back and shoulders', exercises: [e('pullup', 'Assisted pull-up', 'Back · biceps', '6–10'), e('incline', 'Incline dumbbell press', 'Upper chest', '8–12'), e('one-row', 'Single-arm row', 'Back', '10 each'), e('lateral', 'Lateral raise', 'Shoulders', '12–15'), e('facepull', 'Face pull', 'Rear delts', '12–15')] },
    { id: 'lower-b', title: 'Lower II', focus: 'Hinge emphasis', exercises: [e('deadlift', 'Trap-bar deadlift', 'Posterior chain', '4–6'), e('front-squat', 'Front squat', 'Quads · core', '8–10'), e('hip-thrust', 'Hip thrust', 'Glutes', '8–12'), e('split-squat', 'Split squat', 'Legs', '10 each'), e('carry', 'Farmer carry', 'Core · grip', '40 sec')] },
  ],
  ppl: [
    { id: 'push-a', title: 'Push', focus: 'Chest · shoulders · triceps', exercises: [e('bench', 'Bench press', 'Chest', '6–8'), e('incline', 'Incline dumbbell press', 'Upper chest', '8–12'), e('press', 'Shoulder press', 'Shoulders', '8–10'), e('lateral', 'Lateral raise', 'Side delts', '12–15'), e('triceps', 'Rope pressdown', 'Triceps', '10–15')] },
    { id: 'pull-a', title: 'Pull', focus: 'Back · biceps', exercises: [e('pulldown', 'Lat pulldown', 'Lats', '8–12'), e('row', 'Chest-supported row', 'Upper back', '8–12'), e('one-row', 'Single-arm row', 'Back', '10 each'), e('facepull', 'Face pull', 'Rear delts', '12–15'), e('curl', 'Dumbbell curl', 'Biceps', '10–12')] },
    { id: 'legs-a', title: 'Legs', focus: 'Quads · glutes · hamstrings', exercises: [e('squat', 'Back squat', 'Quads · glutes', '6–8'), e('rdl', 'Romanian deadlift', 'Hamstrings', '8–10'), e('lunge', 'Walking lunge', 'Legs', '10 each'), e('curl', 'Leg curl', 'Hamstrings', '10–15'), e('calf', 'Standing calf raise', 'Calves', '12–15')] },
    { id: 'push-b', title: 'Push II', focus: 'Shoulders · upper chest', exercises: [e('press', 'Shoulder press', 'Shoulders', '6–8'), e('incline', 'Incline press', 'Upper chest', '8–10'), e('pushup', 'Controlled push-up', 'Chest', 'AMRAP − 2'), e('lateral', 'Cable lateral raise', 'Side delts', '12–15'), e('triceps', 'Overhead triceps extension', 'Triceps', '10–15')] },
    { id: 'pull-b', title: 'Pull II', focus: 'Lats · upper back', exercises: [e('pullup', 'Assisted pull-up', 'Lats', '6–10'), e('row', 'Seated cable row', 'Back', '8–12'), e('rear-delt', 'Rear-delt fly', 'Rear delts', '12–15'), e('back-ext', 'Back extension', 'Lower back · glutes', '10–15'), e('curl', 'Hammer curl', 'Biceps', '10–12')] },
    { id: 'legs-b', title: 'Legs II', focus: 'Glutes · posterior chain', exercises: [e('deadlift', 'Trap-bar deadlift', 'Posterior chain', '4–6'), e('front-squat', 'Front squat', 'Quads · core', '8–10'), e('hip-thrust', 'Hip thrust', 'Glutes', '8–12'), e('split-squat', 'Split squat', 'Legs', '10 each'), e('calf', 'Seated calf raise', 'Calves', '12–15')] },
  ],
  strength_cardio: [
    { id: 'strength-a', title: 'Strength I', focus: 'Squat and press', exercises: [e('squat', 'Back squat', 'Lower body', '3–5'), e('bench', 'Bench press', 'Upper body', '3–5'), e('row', 'Barbell row', 'Back', '5–8'), e('carry', 'Farmer carry', 'Core · grip', '40 sec')] },
    { id: 'conditioning-a', title: 'Engine', focus: 'Strength conditioning', exercises: [e('goblet', 'Goblet squat', 'Legs', '12'), e('pushup', 'Push-up', 'Chest', '10–15'), e('one-row', 'Single-arm row', 'Back', '12 each'), e('swing', 'Kettlebell swing', 'Posterior chain', '15'), e('plank', 'Plank', 'Core', '45 sec')] },
    { id: 'strength-b', title: 'Strength II', focus: 'Hinge and press', exercises: [e('deadlift', 'Trap-bar deadlift', 'Lower body', '3–5'), e('press', 'Overhead press', 'Upper body', '3–5'), e('pulldown', 'Lat pulldown', 'Back', '6–10'), e('split-squat', 'Split squat', 'Legs', '8 each')] },
  ],
};

const HOME: Record<string, string> = { 'Back squat': 'Goblet squat', 'Bench press': 'Dumbbell floor press', 'Seated cable row': 'Dumbbell row', 'Lat pulldown': 'Band pulldown', 'Trap-bar deadlift': 'Dumbbell deadlift', 'Chest-supported row': 'Dumbbell row', 'Cable curl + pressdown': 'Curl + overhead extension', 'Rope pressdown': 'Band pressdown', 'Cable lateral raise': 'Dumbbell lateral raise', 'Leg curl': 'Slider leg curl', 'Seated calf raise': 'Single-leg calf raise' };
const BODY: Record<string, string> = { 'Back squat': 'Tempo squat', 'Front squat': 'Tempo squat', 'Bench press': 'Push-up', 'Incline dumbbell press': 'Feet-elevated push-up', 'Incline press': 'Feet-elevated push-up', 'Seated cable row': 'Table row', 'Chest-supported row': 'Table row', 'Single-arm row': 'Towel row', 'Romanian deadlift': 'Single-leg hip hinge', 'Trap-bar deadlift': 'Single-leg hip hinge', 'Dumbbell shoulder press': 'Pike push-up', 'Shoulder press': 'Pike push-up', 'Overhead press': 'Pike push-up', 'Lat pulldown': 'Pull-up or table row', 'Walking lunge': 'Reverse lunge', 'Leg curl': 'Slider leg curl', 'Hip thrust': 'Single-leg glute bridge', 'Farmer carry': 'Bear crawl', 'Rope pressdown': 'Diamond push-up', 'Overhead triceps extension': 'Diamond push-up', 'Dumbbell curl': 'Towel curl', 'Hammer curl': 'Towel curl', 'Cable curl + pressdown': 'Towel curl + diamond push-up', 'Goblet squat': 'Tempo squat', 'Kettlebell swing': 'Broad jump' };
const ACTIVE_DAYS: Record<WorkoutPlan['days'], number[]> = { 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const CARDIO_LABEL: Record<WorkoutPlan['cardio'], string> = { walk: 'Outdoor walk', incline_walk: 'Incline walk', run: 'Easy run', bike: 'Zone 2 ride', row: 'Steady row', intervals: 'Intervals' };
const EMPHASIS_MOVE: Record<NonNullable<WorkoutPlan['emphasis']>, BaseExercise | null> = {
  balanced: null,
  glutes_legs: e('focus-glutes', 'Hip thrust', 'Glutes', '10–12'),
  upper_body: e('focus-upper', 'Cable lateral raise', 'Shoulders', '12–15'),
  athletic: e('focus-athletic', 'Sled push', 'Power · conditioning', '30 sec'),
};
const serialDay = (date: string) => { const [y, m, d] = date.split('-').map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
const weekday = (date: string) => (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
export const isTrainingDay = (plan: WorkoutPlan, date: string) => ACTIVE_DAYS[plan.days].includes(weekday(date));

export function dailyWorkout(plan: WorkoutPlan, date: string): DailyWorkout {
  const cardioOptions = plan.cardioOptions?.length ? plan.cardioOptions : [plan.cardio];
  const serial = serialDay(date);
  const cardio = cardioOptions[Math.abs(serial) % cardioOptions.length] ?? plan.cardio;
  const cardioMins = plan.goal === 'fat_loss' || plan.goal === 'recomp' || plan.goals?.includes('fat_loss') ? Math.min(30, Math.max(15, Math.round(plan.minutes * 0.35))) : Math.min(20, Math.max(10, Math.round(plan.minutes * 0.25)));
  if (!isTrainingDay(plan, date)) return {
    id: 'recovery', title: 'Recover + reset', focus: 'Mobility and easy movement', recovery: true, duration: Math.min(30, plan.minutes),
    exercises: [
      { id: 'hips', name: '90/90 hip flow', target: 'Hips', sets: 2, reps: '45 sec', rest: '20 sec' },
      { id: 'tspine', name: 'Open book rotation', target: 'Upper back', sets: 2, reps: '8 each', rest: '20 sec' },
      { id: 'couch', name: 'Couch stretch', target: 'Hip flexors', sets: 2, reps: '45 sec', rest: '20 sec' },
    ], cardio: { kind: 'walk', label: 'Easy walk', minutes: 20, detail: 'Conversational pace · recovery effort' },
  };
  const pool = SESSIONS[plan.split];
  const rotation = Math.floor((serial * plan.days) / 7);
  const session = pool[((rotation % pool.length) + pool.length) % pool.length];
  const equipment = plan.equipmentOptions?.[0] ?? plan.equipment;
  const strengthGoal = plan.goal === 'strength' || plan.goals?.includes('strength');
  const muscleGoal = plan.goal === 'muscle' || plan.goal === 'recomp' || plan.goals?.includes('muscle');
  const experience = plan.experience ?? 'beginner';
  const sets = experience === 'beginner' ? 3 : experience === 'advanced' && strengthGoal ? 5 : strengthGoal || muscleGoal ? 4 : 3;
  const emphasis = plan.emphasis ?? 'balanced';
  const emphasisMove = EMPHASIS_MOVE[emphasis];
  let baseExercises = [...session.exercises];
  if (emphasisMove) baseExercises = plan.minutes === 75 ? [...baseExercises, emphasisMove] : [...baseExercises.slice(0, -1), emphasisMove];
  if (plan.minutes === 30) baseExercises = baseExercises.slice(0, 4);
  const limitations = plan.limitations ?? [];
  const exercises = baseExercises.map((original) => {
    let x = original;
    if (limitations.includes('knees') && /squat|lunge/i.test(x.name)) x = e(`${x.id}-knee`, 'Glute bridge', 'Glutes · hamstrings', '12–15');
    if (limitations.includes('lower_back') && /deadlift|hinge|romanian|barbell row/i.test(x.name)) x = e(`${x.id}-back`, /row/i.test(x.name) ? 'Chest-supported row' : 'Hip thrust', /row/i.test(x.name) ? 'Upper back' : 'Glutes', '10–12');
    if (limitations.includes('shoulders') && /press|push-up|raise/i.test(x.name)) x = e(`${x.id}-shoulder`, 'Neutral-grip floor press', 'Chest · triceps', '8–12');
    return { ...x, name: equipment === 'bodyweight' ? BODY[x.name] ?? x.name : equipment === 'home' ? HOME[x.name] ?? x.name : x.name, sets, rest: strengthGoal ? '2–3 min' : '60–90 sec' };
  });
  return { id: session.id, title: session.title, focus: session.focus, recovery: false, duration: plan.minutes, exercises, cardio: { kind: cardio, label: CARDIO_LABEL[cardio], minutes: cardioMins, detail: cardio === 'intervals' ? '6 rounds · hard / easy' : 'Zone 2 · steady, sustainable pace' } };
}

export const workoutCheckKey = (date: string, workoutId: string, exerciseId: string, set: number) => `${date}|${workoutId}|${exerciseId}|${set}`;
export function workoutProgress(workout: DailyWorkout, checks: Record<string, boolean>, date: string) {
  const total = workout.exercises.reduce((sum, exercise) => sum + exercise.sets, 0);
  const done = workout.exercises.reduce((sum, exercise) => sum + Array.from({ length: exercise.sets }, (_, index) => checks[workoutCheckKey(date, workout.id, exercise.id, index)] ? 1 : 0).filter(Boolean).length, 0);
  return { done, total, ratio: total ? done / total : 0 };
}
