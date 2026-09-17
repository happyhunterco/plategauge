import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gauge } from '../../src/components/Gauge';
import { DevDataBanner, GradientBox, TopBar } from '../../src/components/Kit';
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
  const t = useDayTotals(day);
  const swipe = useDaySwipe();
  const wide = useWide();
  if (!goals) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar max={1160 - space.m * 2} />
      <ScrollView contentContainerStyle={{ paddingBottom: wide ? 48 : 120 }}>
        {dataMode === 'development' ? (
          <DevDataBanner max={wide ? 1160 - space.m * 2 : undefined} text="Development mode: search, barcodes and restaurant items use labeled test data." />
        ) : null}
        <View style={wide ? styles.cols : undefined}>
          <View style={wide ? styles.colLeft : undefined}>
            <WeekStrip />

            <View {...swipe.panHandlers} style={styles.summary} accessibilityHint="Swipe left or right to change day">
              <Gauge eaten={t.eaten.calories} goal={t.budget} size={220} />
              <CalorieFacts day={day} />
            </View>

            <MacroTiles day={day} />

            <View style={styles.quickRow}>
              {[
                { label: 'Search', icon: 'search' as const, to: '/log' as const },
                { label: 'Scan', icon: 'barcode-outline' as const, to: '/scan?mode=barcode' as const },
                { label: 'Quick add', icon: 'flash-outline' as const, to: '/log?mode=quick' as const },
              ].map((a) => (
                <Pressable
                  key={a.label}
                  onPress={() => {
                    tap();
                    router.push(a.to);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.quick, pressed && { opacity: 0.8 }]}
                >
                  <Ionicons name={a.icon} size={18} color={color.ink} />
                  <Text style={styles.quickText}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => {
                tap();
                router.navigate('/crave');
              }}
              accessibilityRole="button"
              style={({ pressed }) => pressed && { opacity: 0.92 }}
            >
              <GradientBox style={styles.crave}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.craveTitle}>What’re ya hungry for?</Text>
                  <Text style={styles.craveSub}>Name any food. We’ll make it fit your {fmt(Math.max(t.left.calories, 0))} left.</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color="#fff" />
              </GradientBox>
            </Pressable>

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
  summary: { alignItems: 'stretch', paddingTop: space.s },
  quickRow: { flexDirection: 'row', gap: space.s, paddingHorizontal: space.l, marginTop: space.l },
  quick: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickText: { fontSize: 14, fontWeight: '600', color: color.ink },
  crave: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    marginHorizontal: space.l,
    marginTop: space.m,
    padding: space.l,
    borderRadius: 18,
    backgroundColor: color.ink,
  },
  craveTitle: { fontFamily: font.display, fontSize: 17, color: '#fff' },
  craveSub: { color: '#A9BAD3', fontSize: 13, marginTop: 2 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  mealCals: { fontFamily: font.displayMed, color: color.sub, fontSize: 14 },
  none: { color: color.faint, fontSize: 14, paddingVertical: 2 },
});
