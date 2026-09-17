import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { dailyBalance } from '../../shared/balance';
import { dayKey, fromKey, shiftKey, timeOf, weekOf } from '../dates';
import { fmt, useDayTotals } from '../hooks';
import { useStore, type Entry } from '../store';
import { color, font, space } from '../theme';
import { Bar, Card, showUndo } from './Kit';
import { tap, type IconName } from './UI';
import { removeEntryRemote } from '../services/sync';

/* ---------- date strip ---------- */

export function WeekStrip() {
  const day = useStore((s) => s.day);
  const setDay = useStore((s) => s.setDay);
  const entries = useStore((s) => s.entries);
  const logged = useMemo(() => new Set(entries.map((e) => e.date)), [entries]);
  const today = dayKey();
  const week = weekOf(day);
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dy) < 15,
        onPanResponderRelease: (_, g) => {
          const s = useStore.getState();
          if (g.dx < -40 && shiftKey(s.day, 7) <= dayKey()) s.setDay(shiftKey(s.day, 7));
          else if (g.dx < -40) s.setDay(dayKey());
          if (g.dx > 40) s.setDay(shiftKey(s.day, -7));
        },
      }),
    [],
  );

  const month = fromKey(day).toLocaleDateString('en-US', {
    month: 'long',
    year: fromKey(day).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
  return (
    <View style={styles.stripWrap}>
      <View style={styles.stripHead}>
        <Text style={styles.month}>{month}</Text>
        {day !== today ? (
          <Pressable
            onPress={() => {
              tap();
              setDay(today);
            }}
            accessibilityRole="button"
            style={styles.todayPill}
            hitSlop={8}
          >
            <Ionicons name="arrow-undo" size={13} color={color.gauge} />
            <Text style={styles.todayText}>Today</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.strip} {...pan.panHandlers} accessibilityHint="Swipe to change week">
        {week.map((d) => {
          const sel = d === day;
          const future = d > today;
          const date = fromKey(d);
          return (
            <Pressable
              key={d}
              disabled={future}
              onPress={() => {
                tap();
                setDay(d);
              }}
              style={styles.dayCell}
              accessibilityRole="button"
              accessibilityState={{ selected: sel, disabled: future }}
              accessibilityLabel={`${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${logged.has(d) ? ', logged' : ''}`}
            >
              <Text style={[styles.dow, future && { opacity: 0.35 }]}>{date.toLocaleDateString('en-US', { weekday: 'narrow' })}</Text>
              <View style={[styles.dateDot, sel && styles.dateSel, d === today && !sel && styles.dateToday]}>
                <Text style={[styles.dateNum, sel && { color: '#fff' }, future && { opacity: 0.35 }]}>{date.getDate()}</Text>
              </View>
              <View style={[styles.logDot, { backgroundColor: logged.has(d) ? color.gauge : 'transparent' }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Swipe left/right anywhere on the summary to move one day. */
export function useDaySwipe() {
  return useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30 && Math.abs(g.dy) < 20,
        onPanResponderRelease: (_, g) => {
          const s = useStore.getState();
          if (g.dx > 60) s.setDay(shiftKey(s.day, -1));
          if (g.dx < -60 && s.day < dayKey()) s.setDay(shiftKey(s.day, 1));
        },
      }),
    [],
  );
}

/* ---------- calorie summary ---------- */

export function CalorieFacts({ day }: { day: string }) {
  const t = useDayTotals(day);
  const mode = useStore((s) => s.settings.exerciseMode);
  const router = useRouter();
  const note =
    t.active === 0
      ? null
      : mode === 'none'
        ? `${fmt(t.active)} active cal logged. Activity isn’t added to your food budget.`
        : `Budget includes +${fmt(t.bonus)} from activity (${mode === 'half' ? 'half' : 'all'} of ${fmt(t.active)}).`;
  return (
    <View>
      <View style={styles.factRow}>
        <Fact label="Eaten" value={fmt(t.eaten.calories)} />
        <View style={styles.factDivider} />
        <Fact label="Budget" value={fmt(t.budget)} />
        <View style={styles.factDivider} />
        <Fact label={t.left.calories >= 0 ? 'Left' : 'Over'} value={fmt(Math.abs(t.left.calories))} tint={t.left.calories >= 0 ? color.gauge : color.needle} />
      </View>
      {note ? (
        <Pressable onPress={() => router.push('/profile')} accessibilityRole="button" style={styles.note}>
          <Ionicons name="walk-outline" size={14} color={color.sub} />
          <Text style={styles.noteText}>{note}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Fact({ label, value, tint = color.ink }: { label: string; value: string; tint?: string }) {
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label} ${value} calories`}>
      <Text style={[styles.factValue, { color: tint }]}>{value}</Text>
      <Text style={styles.factLabel}>{label}</Text>
    </View>
  );
}

export function MacroTiles({ day }: { day: string }) {
  const t = useDayTotals(day);
  const rows = [
    { k: 'Protein', v: t.eaten.protein, g: t.goals.protein, c: color.protein },
    { k: 'Carbs', v: t.eaten.carbs, g: t.goals.carbs, c: color.carbs },
    { k: 'Fat', v: t.eaten.fat, g: t.goals.fat, c: color.fat },
  ];
  return (
    <View style={styles.macroRow}>
      {rows.map((r) => {
        const left = Math.round(r.g - r.v);
        return (
          <View
            key={r.k}
            style={styles.macro}
            accessible
            accessibilityLabel={`${r.k}: ${fmt(r.v)} of ${fmt(r.g)} grams, ${left >= 0 ? `${left} left` : `${-left} over`}`}
          >
            <Text style={styles.macroK}>{r.k}</Text>
            <Text style={styles.macroV}>
              {fmt(r.v)}
              <Text style={styles.macroG}>/{fmt(r.g)}g</Text>
            </Text>
            <Bar value={r.v} max={r.g} tint={r.c} />
            <Text style={[styles.macroLeft, left < 0 && { color: color.needle }]}>{left >= 0 ? `${left}g left` : `${-left}g over`}</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ---------- secondary panels (one pager) ---------- */

export function Panels({ day }: { day: string }) {
  const { width } = useWindowDimensions();
  const [box, setBox] = useState(0);
  const w = (box || Math.min(width, 560)) - space.l * 2;
  const [page, setPage] = useState(0);
  const ref = useRef<ScrollView>(null);
  const titles = ['Nutrition', 'Movement & water'];
  return (
    <View onLayout={(e) => setBox(e.nativeEvent.layout.width)}>
      <View style={styles.panelTabs} accessibilityRole="tablist">
        {titles.map((t, i) => (
          <Pressable
            key={t}
            onPress={() => {
              tap();
              setPage(i);
              ref.current?.scrollTo({ x: i * (w + space.m), animated: true });
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: page === i }}
            style={styles.panelTab}
            hitSlop={6}
          >
            <Text style={[styles.panelTabText, page === i && styles.panelTabOn]}>{t}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView
        ref={ref}
        horizontal
        snapToInterval={w + space.m}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space.l, gap: space.m }}
        onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (w + space.m)))}
        onScroll={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / (w + space.m)))}
        scrollEventThrottle={64}
      >
        <View style={{ width: w, gap: space.m }}>
          <NutritionPanel day={day} />
        </View>
        <View style={{ width: w, gap: space.m }}>
          <MovementPanel day={day} />
        </View>
      </ScrollView>
    </View>
  );
}

function NutritionPanel({ day }: { day: string }) {
  const t = useDayTotals(day);
  const goals = useStore((s) => s.goals)!;
  const router = useRouter();
  const complete = day < dayKey();
  const balance = dailyBalance(
    t.list.map((e) => ({ name: e.name, qty: e.qty, nutrients: e.nutrients })),
    { calories: t.budget, protein: goals.protein, fiber: goals.fiber },
    complete,
  );
  const partial = (k: 'fiber' | 'sugar' | 'sodium') => t.coverage.total > 0 && t.coverage[k] < t.coverage.total;
  const items = [
    { k: 'Fiber', v: t.fiber, g: goals.fiber, unit: 'g', part: partial('fiber') },
    { k: 'Sugar', v: t.sugar, g: Math.round((t.budget * 0.1) / 4), unit: 'g', part: partial('sugar'), hint: 'total' },
    { k: 'Sodium', v: t.sodium, g: 2300, unit: 'mg', part: partial('sodium') },
  ];
  return (
    <>
      <Card style={{ paddingVertical: space.m }}>
        <View style={styles.triple}>
          {items.map((i) => (
            <View key={i.k} style={{ flex: 1, gap: 4 }}>
              <Text style={styles.macroK}>{i.k}</Text>
              <Text style={styles.smallV}>
                {fmt(i.v)}
                <Text style={styles.macroG}>
                  /{fmt(i.g)}
                  {i.unit}
                </Text>
              </Text>
              <Bar value={i.v} max={i.g} tint={i.k === 'Fiber' ? color.gauge : color.ink} height={5} />
            </View>
          ))}
        </View>
        {items.some((i) => i.part) ? <Text style={styles.fine}>Some foods today don’t list every nutrient, so these may read low.</Text> : null}
      </Card>
      <Card onPress={() => router.push({ pathname: '/profile', params: { section: 'balance' } })} label="Daily Balance details">
        <View style={styles.balanceHead}>
          <Text style={styles.cardTitle}>Daily Balance</Text>
          <Text style={styles.balanceScore}>{balance.ready ? balance.score : '—'}</Text>
        </View>
        {balance.ready ? (
          <View style={{ gap: 6, marginTop: 6 }}>
            {balance.factors.slice(0, 3).map((f) => (
              <View key={f.id} style={styles.factorRow}>
                <Text style={styles.factorLabel}>{f.label}</Text>
                <Text style={styles.factorDetail} numberOfLines={1}>
                  {f.detail}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.fine}>{balance.message}</Text>
        )}
      </Card>
    </>
  );
}

function MovementPanel({ day }: { day: string }) {
  const t = useDayTotals(day);
  const settings = useStore((s) => s.settings);
  const addWater = useStore((s) => s.addWater);
  const removeWater = useStore((s) => s.removeWater);
  const router = useRouter();
  const metric = settings.units === 'metric';
  const show = (oz: number) => (metric ? `${Math.round(oz * 29.57)} ml` : `${Math.round(oz)} oz`);
  const quick = metric ? [250, 500] : [8, 16];
  return (
    <>
      <Card onPress={() => router.push('/quick?kind=activity')} label="Movement">
        <View style={styles.triple}>
          <View style={{ flex: 1 }}>
            <Text style={styles.macroK}>Steps</Text>
            <Text style={styles.smallV}>
              {t.steps == null ? '—' : fmt(t.steps)}
              <Text style={styles.macroG}>/{fmt(settings.stepGoal)}</Text>
            </Text>
            <Bar value={t.steps ?? 0} max={settings.stepGoal} height={5} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.macroK}>Active cal</Text>
            <Text style={styles.smallV}>{fmt(t.active)}</Text>
            <Text style={styles.fine}>{t.acts.length ? `${t.acts.length} workout${t.acts.length > 1 ? 's' : ''}` : 'None yet'}</Text>
          </View>
        </View>
        {t.steps == null && !t.acts.length ? (
          <Text style={styles.fine}>Add activity by hand, or connect Apple Health or Health Connect in Profile.</Text>
        ) : null}
      </Card>
      <Card>
        <View style={styles.waterRow}>
          <Ionicons name="water" size={22} color={color.gauge} />
          <View style={{ flex: 1 }}>
            <Text style={styles.macroK}>Water</Text>
            <Text style={styles.smallV}>
              {show(t.oz)}
              <Text style={styles.macroG}> of {show(settings.waterGoalOz)}</Text>
            </Text>
          </View>
        </View>
        <Bar value={t.oz} max={settings.waterGoalOz} height={5} />
        <View style={styles.waterBtns}>
          {quick.map((q) => {
            const oz = metric ? q / 29.57 : q;
            return (
              <Pressable
                key={q}
                accessibilityRole="button"
                accessibilityLabel={`Add ${metric ? `${q} ml` : `${q} ounces`} of water`}
                onPress={() => {
                  tap();
                  const w = addWater(oz);
                  showUndo(`Added ${metric ? `${q} ml` : `${q} oz`} water`, () => removeWater(w.id));
                }}
                style={styles.waterBtn}
              >
                <Text style={styles.waterBtnText}>+{metric ? `${q} ml` : `${q} oz`}</Text>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" onPress={() => router.push('/quick?kind=water')} style={styles.waterBtn}>
            <Text style={styles.waterBtnText}>Custom</Text>
          </Pressable>
        </View>
      </Card>
    </>
  );
}

/* ---------- recently logged ---------- */

type Event = { key: string; time: number; icon: IconName; title: string; detail: string; value: string; onPress?: () => void; onDelete?: () => void };

export function RecentlyLogged({ day }: { day: string }) {
  const router = useRouter();
  const t = useDayTotals(day);
  const water = useStore((s) => s.water);
  const weights = useStore((s) => s.weights);
  const s = useStore.getState;
  const events: Event[] = [
    ...t.list.map((e: Entry): Event => ({
      key: e.id,
      time: e.createdAt,
      icon: e.via === 'barcode' ? 'barcode-outline' : e.via === 'photo' ? 'camera-outline' : e.via === 'crave' ? 'restaurant-outline' : 'nutrition-outline',
      title: e.name,
      detail: `${e.meal[0].toUpperCase()}${e.meal.slice(1)}${e.qty !== 1 ? `, ${e.qty}×` : ''}`,
      value: `${fmt(e.nutrients.calories * e.qty)} cal`,
      onPress: () => router.push({ pathname: '/entry', params: { id: e.id } }),
      onDelete: () => {
        const removed = s().removeEntry(e.id);
        removeEntryRemote(e.id).catch(() => {});
        if (removed) showUndo(`Removed ${e.name}`, () => s().restoreEntry(removed));
      },
    })),
    ...t.acts.map((a): Event => ({
      key: a.id,
      time: a.createdAt,
      icon: 'walk-outline',
      title: a.type,
      detail: `${a.minutes} min${a.source !== 'manual' ? ', imported' : ''}`,
      value: `${fmt(a.calories)} cal burned`,
      onDelete: () => s().removeActivity(a.id),
    })),
    ...water
      .filter((w) => w.date === day)
      .map((w): Event => ({
        key: w.id,
        time: w.createdAt,
        icon: 'water-outline',
        title: 'Water',
        detail: '',
        value: `${Math.round(w.oz)} oz`,
        onDelete: () => s().removeWater(w.id),
      })),
    ...weights
      .filter((w) => w.date === day && w.createdAt)
      .map((w): Event => ({
        key: `w${w.date}`,
        time: w.createdAt,
        icon: 'scale-outline',
        title: 'Weigh-in',
        detail: '',
        value: `${w.lb} lb`,
        onDelete: () => s().removeWeight(w.date),
      })),
  ].sort((a, b) => b.time - a.time);

  if (!events.length) {
    return (
      <View style={styles.emptyTimeline}>
        <Text style={styles.fine}>Nothing logged {day === dayKey() ? 'yet today' : 'this day'}. Tap + to add food, water or a workout.</Text>
      </View>
    );
  }
  return (
    <View style={styles.timeline}>
      {events.slice(0, 8).map((ev, i) => (
        <Pressable
          key={ev.key}
          onPress={ev.onPress}
          onLongPress={ev.onDelete}
          accessibilityRole={ev.onPress ? 'button' : undefined}
          accessibilityHint="Press and hold to remove"
          accessibilityActions={ev.onDelete ? [{ name: 'delete', label: 'Remove' }] : undefined}
          onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && ev.onDelete?.()}
          style={({ pressed }) => [styles.event, i < Math.min(events.length, 8) - 1 && styles.eventLine, pressed && { backgroundColor: color.wash }]}
        >
          <View style={styles.eventIcon}>
            <Ionicons name={ev.icon} size={18} color={color.ink} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {ev.title}
            </Text>
            <Text style={styles.fine} numberOfLines={1}>
              {[timeOf(ev.time), ev.detail].filter(Boolean).join('  ·  ')}
            </Text>
          </View>
          <Text style={styles.eventValue}>{ev.value}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stripWrap: { paddingHorizontal: space.l, paddingTop: space.xs },
  stripHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 28 },
  month: { fontFamily: font.displayMed, fontSize: 14, color: color.sub },
  todayPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: '#E8F3FF' },
  todayText: { color: color.gauge, fontWeight: '600', fontSize: 13 },
  strip: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dayCell: { alignItems: 'center', width: 44, minHeight: 64, gap: 4, paddingTop: 2 },
  dow: { fontSize: 12, color: color.sub, fontWeight: '500' },
  dateDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dateSel: { backgroundColor: color.ink },
  dateToday: { borderWidth: 1.5, borderColor: color.ink },
  dateNum: { fontFamily: font.displayMed, fontSize: 15, color: color.ink },
  logDot: { width: 5, height: 5, borderRadius: 3 },
  factRow: { flexDirection: 'row', alignItems: 'center', marginTop: space.m, paddingHorizontal: space.l },
  fact: { flex: 1, alignItems: 'center' },
  factValue: { fontFamily: font.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  factLabel: { fontSize: 12, color: color.sub, marginTop: 1 },
  factDivider: { width: StyleSheet.hairlineWidth, height: 30, backgroundColor: color.line },
  note: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', marginTop: space.s, paddingHorizontal: space.l, minHeight: 32 },
  noteText: { fontSize: 12, color: color.sub, flexShrink: 1, textAlign: 'center' },
  macroRow: { flexDirection: 'row', gap: space.m, paddingHorizontal: space.l, marginTop: space.l },
  macro: { flex: 1, minWidth: 0, gap: 4 },
  macroK: { fontSize: 12, color: color.sub, fontWeight: '500' },
  macroV: { fontFamily: font.display, fontSize: 19, color: color.ink, fontVariant: ['tabular-nums'] },
  macroG: { fontFamily: undefined, fontSize: 12, color: color.faint },
  macroLeft: { fontSize: 12, color: color.sub },
  smallV: { fontFamily: font.display, fontSize: 17, color: color.ink, fontVariant: ['tabular-nums'] },
  panelTabs: { flexDirection: 'row', gap: space.l, paddingHorizontal: space.l, marginBottom: space.s },
  panelTab: { minHeight: 36, justifyContent: 'center' },
  panelTabText: { fontSize: 15, color: color.faint, fontWeight: '600' },
  panelTabOn: { color: color.ink, textDecorationLine: 'underline', textDecorationColor: color.gauge },
  triple: { flexDirection: 'row', gap: space.l },
  fine: { fontSize: 12, color: color.sub, marginTop: 6, lineHeight: 16 },
  cardTitle: { fontFamily: font.display, fontSize: 16, color: color.ink },
  balanceHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceScore: { fontFamily: font.displayBold, fontSize: 22, color: color.gauge },
  factorRow: { flexDirection: 'row', gap: space.m },
  factorLabel: { width: 64, fontSize: 13, color: color.ink, fontWeight: '600' },
  factorDetail: { flex: 1, fontSize: 13, color: color.sub },
  waterRow: { flexDirection: 'row', gap: space.m, alignItems: 'center', marginBottom: 8 },
  waterBtns: { flexDirection: 'row', gap: space.s, marginTop: space.m },
  waterBtn: { flex: 1, minHeight: 44, borderRadius: 12, backgroundColor: '#E8F3FF', alignItems: 'center', justifyContent: 'center' },
  waterBtnText: { color: '#0B5CAD', fontWeight: '600', fontSize: 14 },
  timeline: { backgroundColor: '#fff', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, overflow: 'hidden' },
  emptyTimeline: { paddingVertical: space.m },
  event: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, paddingVertical: 11, minHeight: 56 },
  eventLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  eventIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  eventTitle: { fontSize: 15, color: color.ink, fontWeight: '500' },
  eventValue: { fontFamily: font.displayMed, fontSize: 14, color: color.ink },
});
