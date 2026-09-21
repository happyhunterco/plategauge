import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gauge } from '../../src/components/Gauge';
import { DevDataBanner, TopBar } from '../../src/components/Kit';
import { CalorieFacts, MacroTiles, Panels, RecentlyLogged, useDaySwipe, WeekStrip } from '../../src/components/Today';
import { Group, macroLine, Row, Section, tap } from '../../src/components/UI';
import { fmt, useDayTotals } from '../../src/hooks';
import { dataMode } from '../../src/services/foods';
import { useStore, type Meal } from '../../src/store';
import { color, font, space } from '../../src/theme';
import { useWide } from '../../src/layout';

const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

export default function Today() {
  const router = useRouter();
  const day = useStore((s) => s.day);
  const goals = useStore((s) => s.goals);
  const name = useStore((s) => s.profile?.name);
  const t = useDayTotals(day);
  const swipe = useDaySwipe();
  const wide = useWide();
  if (!goals) return null;

  return (
    <View style={{ flex: 1, backgroundColor: color.plate }}>
      <TopBar max={1160 - space.m * 2} />
      <ScrollView contentContainerStyle={{ paddingBottom: wide ? 48 : 120 }}>
        {dataMode === 'development' ? (
          <DevDataBanner max={wide ? 1160 - space.m * 2 : undefined} text="Development mode: search, barcodes and restaurant items use labeled test data." />
        ) : null}
        <View style={wide ? styles.cols : undefined}>
          <View style={wide ? styles.colLeft : undefined}>
            <WeekStrip />

            <View style={styles.greeting}>
              <Text style={styles.greetingSmall}>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},</Text>
              <Text style={styles.greetingName}>{name || 'there'}</Text>
            </View>

            <View {...swipe.panHandlers} style={styles.summary} accessibilityHint="Swipe left or right to change day">
              <Gauge eaten={t.eaten.calories} goal={t.budget} size={220} />
              <CalorieFacts day={day} />
            </View>

            <MacroTiles day={day} />

            <View style={styles.wellnessGrid}>
              {[
                { label: 'Nutrition', sub: 'Log meals', icon: 'restaurant-outline' as const, to: '/log' as const, bg: '#EAF1EA' },
                { label: 'Workouts', sub: 'Train smarter', icon: 'barbell-outline' as const, to: '/workouts' as const, bg: '#E9EDF2' },
                { label: 'Crave', sub: 'Find healthy options', icon: 'nutrition-outline' as const, to: '/crave' as const, bg: '#F2EDE5' },
                { label: 'Menus', sub: 'Plan ahead', icon: 'clipboard-outline' as const, to: '/menus' as const, bg: '#F0ECE8' },
              ].map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    tap();
                    router.push(a.to);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.wellnessTile, { backgroundColor: a.bg }, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name={a.icon} size={24} color={color.ink} />
                  <Text style={styles.tileTitle}>{a.label}</Text>
                  <Text style={styles.tileSub}>{a.sub}</Text>
                </Pressable>
              ))}
            </View>

            {wide ? (
              <>
                <Section title="More today" style={{ paddingHorizontal: 0 }}>
                  <Panels day={day} />
                </Section>

                <Section title="Recently logged">
                  <RecentlyLogged day={day} />
                </Section>
              </>
            ) : null}
          </View>
          <View style={wide ? styles.colRight : undefined}>
            {MEALS.map((m) => {
              const items = t.list.filter((e) => e.meal === m.key);
              const cals = items.reduce((a, e) => a + e.nutrients.calories * e.qty, 0);
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
                      {cals > 0 ? <Text style={styles.mealCals}>{fmt(cals)} cal</Text> : null}
                      <Ionicons name="add-circle" size={28} color={color.gauge} />
                    </Pressable>
                  }
                >
                  {items.length ? (
                    <Group>
                      {items.map((e, i) => (
                        <Row
                          key={e.id}
                          title={e.name}
                          detail={`${e.qty !== 1 ? `${e.qty} × ` : ''}${e.serving}   ${macroLine(e.nutrients, e.qty)}`}
                          value={fmt(e.nutrients.calories * e.qty)}
                          onPress={() => router.push({ pathname: '/entry', params: { id: e.id } })}
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

            {wide ? null : (
              <>
                <Section title="More today" style={{ paddingHorizontal: 0 }}>
                  <Panels day={day} />
                </Section>

                <Section title="Recently logged">
                  <RecentlyLogged day={day} />
                </Section>
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xl, width: '100%', maxWidth: 1160, alignSelf: 'center', paddingHorizontal: space.m },
  colLeft: { flex: 1, minWidth: 0, maxWidth: 520 },
  colRight: { flex: 1.1, minWidth: 0 },
  greeting: { paddingHorizontal: space.l, paddingTop: space.m },
  greetingSmall: { fontSize: 14, color: color.sub },
  greetingName: { fontFamily: font.displayBold, fontSize: 25, color: color.ink, marginTop: 1 },
  summary: { alignItems: 'stretch', paddingTop: space.s },
  wellnessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, paddingHorizontal: space.l, marginTop: space.l },
  wellnessTile: { width: '48%', flexGrow: 1, minHeight: 108, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: space.m },
  tileTitle: { fontFamily: font.display, fontSize: 15, color: color.ink, marginTop: 7 },
  tileSub: { fontSize: 12, color: color.sub, marginTop: 2, textAlign: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  mealCals: { fontFamily: font.displayMed, color: color.sub, fontSize: 14 },
  none: { color: color.faint, fontSize: 14, paddingVertical: 2 },
});
