import { Platform } from 'react-native';

/**
 * Health data adapter. Apple Health (iOS) and Health Connect (Android) need native modules
 * that only run in a development/production build, not Expo Go or the web preview.
 *
 * To enable: install @kingstinct/react-native-healthkit (iOS) and/or react-native-health-connect
 * (Android), add their config plugins, then register a provider below with registerHealthProvider().
 * Until then the app offers manual entry and never shows made-up activity.
 */
export type HealthWorkout = { externalId: string; type: string; start: string; minutes: number; calories: number };
export type HealthDay = { steps: number | null; activeCalories: number | null; workouts: HealthWorkout[] };

export interface HealthProvider {
  name: 'Apple Health' | 'Health Connect';
  isAvailable(): Promise<boolean>;
  requestAccess(): Promise<boolean>;
  readDay(date: string): Promise<HealthDay>;
}

let provider: HealthProvider | null = null;
export const registerHealthProvider = (p: HealthProvider) => {
  provider = p;
};

export const healthServiceName = Platform.OS === 'ios' ? 'Apple Health' : Platform.OS === 'android' ? 'Health Connect' : null;

export async function healthStatus(): Promise<'unsupported' | 'not_installed' | 'available'> {
  if (!healthServiceName) return 'unsupported';
  if (!provider) return 'not_installed';
  return (await provider.isAvailable()) ? 'available' : 'unsupported';
}

export async function connectHealth() {
  return provider ? provider.requestAccess() : false;
}

export async function readHealthDay(date: string): Promise<HealthDay | null> {
  return provider ? provider.readDay(date) : null;
}
