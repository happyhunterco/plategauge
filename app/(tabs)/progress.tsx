import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Card, TopBar } from '../../src/components/Kit';
import { Button, Empty, Group, Row, Screen, Section, Segmented } from '../../src/components/UI';
import { dayKey, fromKey, shiftKey } from '../../src/dates';
import { fmt, useStreak } from '../../src/hooks';
import { useStore } from '../../src/store';
import { color, font, space } from '../../src/theme';
import { useColumnWidth } from '../../src/layout';

export default function Progress() {
  const router = useRouter();
  const colW = useColumnWidth();
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const entries = useStore((s) => s.entries);
  const weights = useStore((s) => s.weights);
  const goals = useStore((s) => s.goals);
  const profile = useStore((s) => s.profile);
  const units = useStore((s) => s.settings.units);
  const streak = useStreak();
  const W = colW - space.l * 4;

  const days = useMemo(() => {
    const today = dayKey();
    return Array.from({ length: range }, (_, i) => shiftKey(today, i - range + 1)).map((d) => {
      const list = entries.filter((e) => e.date === d);
      return {
        d,
        logged: list.length > 0,
        cal: list.reduce((a, e) => a + e.nutrients.calories * e.qty, 0),
        protein: list.reduce((a, e) => a + e.nutrients.protein * e.qty, 0),
        carbs: list.reduce((a, e) => a + e.nutrients.carbs * e.qty, 0),
        fat: list.reduce((a, e) => a + e.nutrients.fat * e.qty, 0),
      };
    });
  }, [entries, range]);

  if (!goals || !profile) return null;
  const logged = days.filter((d) => d.logged);
  const avg = (k: 'cal' | 'protein' | 'carbs' | 'fat') => (logged.length ? logged.reduce((a, d) => a + d[k], 0) / logged.length : 0);
  const onTarget = logged.filter((d) => Math.abs(d.cal - goals.calories) <= goals.calories * 0.1).length;

  const since = shiftKey(dayKey(), -range + 1);
  const wts = weights.filter((w) => w.date >= since);
  const conv = (lb: number) => (units === 'metric' ? Math.round(lb * 0.4536 * 10) / 10 : lb);
  const unit = units === 'metric' ? 'kg' : 'lb';
  const first = wts[0];
  const last = wts[wts.length - 1];
  const change = first && last ? Math.round((last.lb - first.lb) * 10) / 10 : 0;
  const toGo = Math.round(Math.abs(profile.weightLb - profile.targetLb) * 10) / 10;
  const weeksLeft = profile.goal !== 'maintain' && profile.ratePerWeek > 0 ? Math.ceil(toGo / profile.ratePerWeek) : null;

  // weight chart
  const H = 140;
  const wChart = (() => {
    if (wts.length < 2) return null;
    const lbs = wts.map((w) => w.lb).concat(profile.goal !== 'maintain' ? [profile.targetLb] : []);
    const min = Math.min(...lbs) - 1;
    const max = Math.max(...lbs) + 1;
    const t0 = fromKey(since).getTime();
    const t1 = fromKey(dayKey()).getTime();
    const x = (d: string) => 6 + ((fromKey(d).getTime() - t0) / Math.max(t1 - t0, 1)) * (W - 12);
    const y = (lb: number) => 4 + (H - 8) - ((lb - min) / (max - min)) * (H - 8);
    return {
      path: wts.map((w, i) => `${i ? 'L' : 'M'}${x(w.date).toFixed(1)},${y(w.lb).toFixed(1)}`).join(' '),
      pts: wts.map((w) => ({ cx: x(w.date), cy: y(w.lb) })),
      goalY: profile.goal !== 'maintain' ? y(profile.targetLb) : null,
    };
  })();

  const maxCal = Math.max(goals.calories * 1.3, ...days.map((d) => d.cal));
  const barW = W / range;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="Progress" />
      <Screen top={false}>
        <View style={{ paddingHorizontal: space.l, marginTop: space.s }}>
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: 7, label: 'Week' },
              { value: 30, label: 'Month' },
              { value: 90, label: '3 months' },
            ]}
          />
        </View>

        <View style={styles.stats}>
          <Stat label="Current streak" value={`${streak.current}`} sub={streak.todayLogged ? 'days' : 'days, log today'} />
          <Stat label="Best streak" value={`${streak.best}`} sub="days" />
          <Stat label="Days logged" value={`${logged.length}/${range}`} sub={`${onTarget} on target`} />
        </View>

        <Section
          title="Weight"
          action={<Button label="Log" kind="ghost" icon="add" onPress={() => router.push('/quick?kind=weight')} style={{ height: 40, paddingHorizontal: 0 }} />}
        >
          <Card>
            <View style={styles.weightHead}>
              <View>
                <Text style={styles.big}>
                  {conv(profile.weightLb)} {unit}
                </Text>
                <Text style={styles.sub}>
                  {wts.length > 1 ? `${change > 0 ? '+' : ''}${conv(change)} ${unit} this period` : 'Log weight a few times to see a trend'}
                </Text>
              </View>
              {profile.goal !== 'maintain' ? (
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.med}>
                    {conv(toGo)} {unit} to go
                  </Text>
                  {weeksLeft ? <Text style={styles.sub}>~{weeksLeft} weeks at your plan’s pace</Text> : null}
                </View>
              ) : null}
            </View>
            {wChart ? (
              <Svg
                width={W}
                height={H + 8}
                style={{ marginTop: space.m }}
                accessibilityLabel={`Weight trend, ${change >= 0 ? 'up' : 'down'} ${Math.abs(conv(change))} ${unit}`}
              >
                {wChart.goalY != null ? (
                  <Line x1={0} x2={W} y1={wChart.goalY} y2={wChart.goalY} stroke={color.gauge} strokeDasharray="4 4" strokeWidth={1} />
                ) : null}
                <Path d={wChart.path} stroke={color.ink} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                {wChart.pts.map((p, i) => (
                  <Circle key={i} cx={p.cx} cy={p.cy} r={3.5} fill="#fff" stroke={color.ink} strokeWidth={2} />
                ))}
              </Svg>
            ) : null}
          </Card>
        </Section>

        <Section title="Calories">
          <Card>
            <Text style={styles.big}>
              {fmt(avg('cal'))}
              <Text style={styles.sub}> avg per logged day · goal {fmt(goals.calories)}</Text>
            </Text>
            {logged.length ? (
              <Svg width={W} height={120} style={{ marginTop: space.m }} accessibilityLabel="Daily calories chart">
                <Line
                  x1={0}
                  x2={W}
                  y1={120 - (goals.calories / maxCal) * 120}
                  y2={120 - (goals.calories / maxCal) * 120}
                  stroke={color.gauge}
                  strokeDasharray="4 4"
                  strokeWidth={1}
                />
                {days.map((d, i) => {
                  const h = (d.cal / maxCal) * 120;
                  return (
                    <Rect
                      key={d.d}
                      x={i * barW + barW * 0.18}
                      y={120 - h}
                      width={Math.max(barW * 0.64, 1.5)}
                      height={h}
                      rx={Math.min(3, barW / 4)}
                      fill={d.cal > goals.calories * 1.1 ? color.ink2 : color.ink}
                    />
                  );
                })}
              </Svg>
            ) : (
              <Empty icon="bar-chart-outline" title="No meals logged in this period" />
            )}
            {range === 7 && logged.length ? (
              <View style={styles.dayLabels}>
                {days.map((d) => (
                  <Text key={d.d} style={[styles.dayLabel, { width: barW }]}>
                    {fromKey(d.d).toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </Text>
                ))}
              </View>
            ) : null}
          </Card>
        </Section>

        <Section title="Average macros">
          <Group>
            <Row title="Protein" value={`${fmt(avg('protein'))}g`} detail={`Goal ${goals.protein}g`} />
            <Row title="Carbs" value={`${fmt(avg('carbs'))}g`} detail={`Goal ${goals.carbs}g`} />
            <Row title="Fat" value={`${fmt(avg('fat'))}g`} detail={`Goal ${goals.fat}g`} last />
          </Group>
        </Section>
      </Screen>
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${label}: ${value} ${sub}`}>
      <Text style={styles.statV}>{value}</Text>
      <Text style={styles.statL}>{label}</Text>
      <Text style={styles.sub}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: space.s, paddingHorizontal: space.l, marginTop: space.l },
  stat: { flex: 1, backgroundColor: color.wash, borderRadius: 16, padding: space.m, minWidth: 0 },
  statV: { fontFamily: font.displayBold, fontSize: 24, color: color.ink },
  statL: { fontSize: 12, color: color.ink, fontWeight: '600', marginTop: 2 },
  sub: { fontFamily: undefined, fontSize: 12, color: color.sub },
  big: { fontFamily: font.displayBold, fontSize: 24, color: color.ink },
  med: { fontFamily: font.display, fontSize: 15, color: color.ink },
  weightHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space.m, flexWrap: 'wrap' },
  dayLabels: { flexDirection: 'row', marginTop: 4 },
  dayLabel: { fontSize: 11, color: color.sub, textAlign: 'center' },
});
