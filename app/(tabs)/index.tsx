import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gauge } from '../../src/components/Gauge';
import { LogoMark } from '../../src/components/Logo';
import { Group, IconButton, MacroBars, Row, Screen, Section, macroLine, tap } from '../../src/components/UI';
import { dayKey, longDate, prettyDay, shiftKey } from '../../src/dates';
import { fmt, sumMacros } from '../../src/nutrition';
import { useDayEntries, useStore } from '../../src/store';
import { color, font, space } from '../../src/theme';
import type { Entry, Meal } from '../../src/types';

const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

export default function Today() {
  const router = useRouter();
  const day = useStore((s) => s.day);
  const setDay = useStore((s) => s.setDay);
  const goals = useStore((s) => s.goals);
  const removeEntry = useStore((s) => s.removeEntry);
  const entries = useDayEntries(day);
  const eaten = sumMacros(entries);
  const isToday = day === dayKey();

  if (!goals) return null;

  const confirmDelete = (e: Entry) => {
    const run = () => removeEntry(e.id);
    if (Platform.OS === 'web') return run();
    Alert.alert(`Remove ${e.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen>
      <View style={styles.top}>
        <LogoMark size={30} />
        <View style={styles.dayNav}>
          <IconButton icon="chevron-back" label="Previous day" onPress={() => setDay(shiftKey(day, -1))} />
          <Pressable onPress={() => setDay(dayKey())} accessibilityRole="button" accessibilityLabel="Jump to today">
            <Text style={styles.day}>{prettyDay(day)}</Text>
          </Pressable>
          <View style={{ opacity: isToday ? 0.3 : 1 }}>
            <IconButton icon="chevron-forward" label="Next day" onPress={() => !isToday && setDay(shiftKey(day, 1))} />
          </View>
        </View>
        <View style={{ width: 30 }} />
      </View>
      <Text style={styles.date}>{longDate(day)}</Text>

      <View style={styles.gaugeWrap}>
        <Gauge eaten={eaten.calories} goal={goals.calories} />
      </View>

      <MacroBars eaten={eaten} goals={goals} />

      <Pressable
        style={({ pressed }) => [styles.crave, pressed && { opacity: 0.85 }]}
        onPress={() => {
          tap();
          router.navigate('/crave');
        }}
        accessibilityRole="button"
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.craveTitle}>What’re ya hungry for?</Text>
          <Text style={styles.craveSub}>
            Ideas that fit your {fmt(Math.max(goals.calories - eaten.calories, 0))} left
          </Text>
        </View>
        <Ionicons name="sparkles" size={20} color={color.needle} />
      </Pressable>

      {MEALS.map((m) => {
        const items = entries.filter((e) => e.meal === m.key);
        const cals = sumMacros(items).calories;
        return (
          <Section
            key={m.key}
            title={m.label}
            action={
              <Pressable
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={`Add to ${m.label}`}
                onPress={() => {
                  tap();
                  router.navigate({ pathname: '/log', params: { meal: m.key } });
                }}
                style={styles.add}
              >
                {cals > 0 ? <Text style={styles.mealCals}>{fmt(cals)}</Text> : null}
                <Ionicons name="add-circle" size={24} color={color.gauge} />
              </Pressable>
            }
          >
            {items.length ? (
              <Group>
                {items.map((e, i) => (
                  <Row
                    key={e.id}
                    title={e.name}
                    detail={`${e.qty !== 1 ? `${e.qty} × ` : ''}${e.serving}   ${macroLine(e, e.qty)}`}
                    value={fmt(e.calories * e.qty)}
                    onLongPress={() => confirmDelete(e)}
                    last={i === items.length - 1}
                  />
                ))}
              </Group>
            ) : (
              <Text style={styles.none}>Nothing logged</Text>
            )}
          </Section>
        );
      })}
      {entries.length > 0 && <Text style={styles.hint}>Press and hold a food to remove it</Text>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.l },
  dayNav: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  day: { fontFamily: font.display, fontSize: 18, color: color.ink, minWidth: 96, textAlign: 'center' },
  date: { textAlign: 'center', color: color.sub, fontSize: 13, marginTop: 2 },
  gaugeWrap: { alignItems: 'center', marginTop: space.l, marginBottom: space.xl },
  crave: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: space.l,
    marginTop: space.xl,
    padding: space.l,
    borderRadius: 16,
    backgroundColor: color.ink,
  },
  craveTitle: { fontFamily: font.display, fontSize: 18, color: '#fff' },
  craveSub: { color: '#A9BAD3', fontSize: 13, marginTop: 2 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealCals: { fontFamily: font.displayMed, color: color.sub, fontSize: 14 },
  none: { color: color.faint, fontSize: 14, paddingVertical: 2 },
  hint: { textAlign: 'center', color: color.faint, fontSize: 12, marginTop: space.xl },
});
