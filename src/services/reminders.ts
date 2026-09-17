import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Settings } from '../store';

/** Local reminders only; nothing is sent to a server. */
const IDS = { meals: ['pg-lunch', 'pg-dinner'], water: ['pg-water-1', 'pg-water-2', 'pg-water-3'], weighIn: ['pg-weigh'] };

export async function applyReminders(n: Settings['notifications']): Promise<'ok' | 'denied' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  const wantsAny = n.meals || n.water || n.weighIn;
  if (wantsAny) {
    const cur = await Notifications.getPermissionsAsync();
    const granted = cur.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return 'denied';
  }
  const all = [...IDS.meals, ...IDS.water, ...IDS.weighIn];
  await Promise.all(all.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {})));

  const daily = (id: string, hour: number, minute: number, title: string, body: string) =>
    Notifications.scheduleNotificationAsync({
      identifier: id,
      content: { title, body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });

  if (n.meals) {
    await daily('pg-lunch', 12, 30, 'Lunch check-in', 'Log lunch while it’s fresh.');
    await daily('pg-dinner', 19, 0, 'Dinner check-in', 'What did you have for dinner?');
  }
  if (n.water) {
    await daily('pg-water-1', 10, 0, 'Water', 'Time for a glass of water.');
    await daily('pg-water-2', 14, 0, 'Water', 'Keep it going. Log a glass.');
    await daily('pg-water-3', 17, 0, 'Water', 'Afternoon refill.');
  }
  if (n.weighIn) {
    await Notifications.scheduleNotificationAsync({
      identifier: 'pg-weigh',
      content: { title: 'Weekly weigh-in', body: 'Same time, same scale. Log this week’s weight.' },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 2, hour: 7, minute: 30 },
    });
  }
  return 'ok';
}
