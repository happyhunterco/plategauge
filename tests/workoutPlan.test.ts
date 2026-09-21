import { describe, expect, it } from 'vitest';
import { dailyWorkout, isTrainingDay, workoutCheckKey, workoutProgress } from '../src/workoutPlan';
import type { WorkoutPlan } from '../src/store';

const plan: WorkoutPlan = {
  split: 'full_body', goal: 'recomp', goals: ['fat_loss', 'muscle'], days: 3, minutes: 45,
  equipment: 'gym', equipmentOptions: ['gym'], cardio: 'walk', cardioOptions: ['walk', 'bike'],
};

describe('daily workout plan', () => {
  it('creates a complete strength session on scheduled days', () => {
    expect(isTrainingDay(plan, '2026-09-21')).toBe(true); // Monday
    const workout = dailyWorkout(plan, '2026-09-21');
    expect(workout.recovery).toBe(false);
    expect(workout.exercises.length).toBeGreaterThanOrEqual(4);
    expect(workout.exercises.every((exercise) => exercise.sets === 3)).toBe(true);
    expect(workout.cardio.minutes).toBeGreaterThanOrEqual(15);
  });

  it('provides active recovery on unscheduled days', () => {
    const workout = dailyWorkout(plan, '2026-09-22'); // Tuesday
    expect(workout.recovery).toBe(true);
    expect(workout.title).toBe('Recover + reset');
    expect(workout.cardio.label).toBe('Easy walk');
  });

  it('tracks progress for each set independently', () => {
    const date = '2026-09-21';
    const workout = dailyWorkout(plan, date);
    const first = workout.exercises[0];
    const checks = { [workoutCheckKey(date, workout.id, first.id, 0)]: true };
    const progress = workoutProgress(workout, checks, date);
    expect(progress.done).toBe(1);
    expect(progress.total).toBeGreaterThan(1);
    expect(progress.ratio).toBeCloseTo(1 / progress.total);
  });

  it('adapts exercise names to bodyweight equipment', () => {
    const workout = dailyWorkout({ ...plan, equipment: 'bodyweight', equipmentOptions: ['bodyweight'] }, '2026-09-21');
    expect(workout.exercises.some((exercise) => /push-up|squat|row|hinge/i.test(exercise.name))).toBe(true);
  });

  it('personalizes volume, emphasis, and movement needs', () => {
    const personalized = dailyWorkout({ ...plan, experience: 'advanced', emphasis: 'glutes_legs', limitations: ['knees'], minutes: 75 }, '2026-09-21');
    expect(personalized.exercises.length).toBe(6);
    expect(personalized.exercises.every((exercise) => exercise.sets === 4)).toBe(true);
    expect(personalized.exercises.some((exercise) => /hip thrust/i.test(exercise.name))).toBe(true);
    expect(personalized.exercises.some((exercise) => /back squat|lunge/i.test(exercise.name))).toBe(false);
  });

  it('uses the selected vertical pulling movement instead of assuming assistance', () => {
    const dates = ['2026-09-21', '2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25', '2026-09-26'];
    const pulldownNames = dates.flatMap((date) => dailyWorkout({ ...plan, split: 'ppl', days: 6, verticalPull: 'lat_pulldown' }, date).exercises.map((exercise) => exercise.name));
    expect(pulldownNames.some((name) => name === 'Lat pulldown')).toBe(true);
    expect(pulldownNames.some((name) => /assisted pull-up/i.test(name))).toBe(false);

    const pullupNames = dates.flatMap((date) => dailyWorkout({ ...plan, split: 'ppl', days: 6, experience: 'advanced', verticalPull: 'pullups' }, date).exercises.map((exercise) => exercise.name));
    expect(pullupNames.some((name) => name === 'Weighted pull-up')).toBe(true);
    expect(pullupNames.some((name) => /assisted pull-up/i.test(name))).toBe(false);
  });
});
