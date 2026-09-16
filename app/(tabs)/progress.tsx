import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Button, Field, Group, Row, Screen, Section, success } from '../../src/components/UI';
import { dayKey, fromKey, shiftKey } from '../../src/dates';
import { fmt, sumMacros } from '../../src/nutrition';
import { useStore } from '../../src/store';
import { color, font, space } from '../../src/theme';

export default function Progress() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const goals = useStore((s) => s.goals);
  const profile = useStore((s) => s.profile);
  const entries = useStore((s) => s.entries);
  const weights = useStore((s) => s.weights);
  const logWeight = useStore((s) => s.logWeight);
  const resetAll = useStore((s) => s.resetAll);
  const aiConsent = useStore((s) => s.aiConsent);
  const setAiConsent = useStore((s) => s.setAiConsent);
  const [w, setW] = useState('');

  if (!goals || !profile) return null;

  const today = dayKey();
  const week = Array.from({ length: 7 }, (_, i) => shiftKey(today, i - 6));
  const cals = week.map((d) => sumMacros(entries.filter((e) => e.date === d)).calories);
  const logged = cals.filter((c) => c > 0);
  const avg = logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : 0;
  const onTarget = cals.filter((c) => c > 0 && Math.abs(c - goals.calories) <= goals.calories * 0.1).length;

  let streak = 0;
  const days = new Set(entries.map((e) => e.date));
  for (let d = days.has(today) ? today : shiftKey(today, -1); days.has(d); d = shiftKey(d, -1)) streak++;

  const current = weights.length ? weights[weights.length - 1].lb : profile.weightLb;
  const start = weights.length ? weights[0].lb : profile.weightLb;
  const change = current - start;
  const toGo = profile.targetLb ? current - profile.targetLb : 0;

  const chartW = width - space.l * 2;

  const reset = () => {
    const run = () => {
      resetAll();
      router.replace('/setup');
    };
    if (Platform.OS === 'web') return run();
    Alert.alert('Delete all data?', 'This removes your goals, food log, weigh-ins and pantry from this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: run },
    ]);
  };

  return (
    <Screen title="Progress">
      <View style={styles.stats}>
        <Stat value={`${streak}`} label="day streak" />
        <Stat value={fmt(avg)} label="avg calories" />
        <Stat value={`${onTarget}/7`} label="days on target" />
      </View>

      <Section title="Calories this week">
        <Bars values={cals} goal={goals.calories} width={chartW} labels={week.map((d) => fromKey(d).toLocaleDateString('en-US', { weekday: 'narrow' }))} />
      </Section>

      <Section title="Weight">
        <View style={styles.weightHead}>
          <View>
            <Text style={styles.bigNum}>
              {current.toFixed(1)}
              <Text style={styles.unit}> lb</Text>
            </Text>
            <Text style={styles.sub}>
              {change === 0 ? 'No change yet' : `${change > 0 ? '+' : ''}${change.toFixed(1)} lb since start`}
              {profile.targetLb && Math.abs(toGo) >= 0.1 ? `, ${Math.abs(toGo).toFixed(1)} to goal` : ''}
            </Text>
          </View>
        </View>
        {weights.length > 1 && <WeightLine points={weights.slice(-30).map((p) => p.lb)} target={profile.targetLb} width={chartW} />}
        <View style={styles.weighIn}>
          <Field
            placeholder="Today’s weight"
            keyboardType="decimal-pad"
            value={w}
            onChangeText={setW}
            style={{ flex: 1 }}
            accessibilityLabel="Today's weight in pounds"
          />
          <Button
            label="Save"
            disabled={!(parseFloat(w) > 50)}
            onPress={() => {
              logWeight(Math.round(parseFloat(w) * 10) / 10);
              setW('');
              success();
            }}
          />
        </View>
      </Section>

      <Section title="Goals">
        <Group>
          <Row title="Calories" value={fmt(goals.calories)} onPress={() => router.push('/goals')} />
          <Row title="Protein" value={`${fmt(goals.protein)}g`} onPress={() => router.push('/goals')} />
          <Row title="Carbs" value={`${fmt(goals.carbs)}g`} onPress={() => router.push('/goals')} />
          <Row title="Fat" value={`${fmt(goals.fat)}g`} onPress={() => router.push('/goals')} last />
        </Group>
        <Button label="Recalculate from my stats" kind="ghost" icon="refresh" onPress={() => router.push('/setup')} style={{ marginTop: space.s }} />
      </Section>

      <Section title="Data">
        <Group style={{ marginBottom: space.m }}>
          <Row
            title="AI estimates"
            detail="Photos and descriptions are sent to Anthropic’s Claude to estimate nutrition"
            value={aiConsent === false ? 'Off' : aiConsent ? 'On' : 'Ask'}
            onPress={() => setAiConsent(aiConsent ? false : true)}
            last
          />
        </Group>
        <Text style={styles.sub}>
          Your log stays on this device. Targets are estimates, not medical advice. Talk to a doctor or dietitian before big changes.
        </Text>
        <Button label="Delete all data" kind="ghost" onPress={reset} style={{ marginTop: space.s, alignSelf: 'flex-start', paddingHorizontal: 0 }} />
      </Section>
    </Screen>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.statV}>{value}</Text>
      <Text style={styles.sub}>{label}</Text>
    </View>
  );
}

function Bars({ values, goal, width, labels }: { values: number[]; goal: number; width: number; labels: string[] }) {
  const h = 150;
  const max = Math.max(goal * 1.25, ...values);
  const slot = width / values.length;
  const bw = Math.min(26, slot * 0.5);
  const gy = h - (goal / max) * h;
  return (
    <View accessible accessibilityLabel={`Daily calories this week against a goal of ${fmt(goal)}`}>
      <Svg width={width} height={h}>
        <Line x1={0} x2={width} y1={gy} y2={gy} stroke={color.needle} strokeWidth={1.5} strokeDasharray="4 4" />
        {values.map((v, i) => {
          const bh = Math.max((v / max) * h, v > 0 ? 4 : 0);
          const over = v > goal * 1.1;
          return (
            <Rect
              key={i}
              x={i * slot + (slot - bw) / 2}
              y={h - bh}
              width={bw}
              height={bh}
              rx={bw / 2 > bh / 2 ? bh / 2 : 6}
              fill={i === values.length - 1 ? color.gauge : over ? color.needle : color.ink}
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {labels.map((l, i) => (
          <Text key={i} style={[styles.axis, { width: slot }]}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

function WeightLine({ points, target, width }: { points: number[]; target?: number; width: number }) {
  const h = 110;
  const all = target ? [...points, target] : points;
  const lo = Math.min(...all) - 1;
  const hi = Math.max(...all) + 1;
  const x = (i: number) => (i / (points.length - 1)) * (width - 12) + 6;
  const y = (v: number) => h - 6 - ((v - lo) / (hi - lo)) * (h - 12);
  const d = points.map((p, i) => `${i ? 'L' : 'M'} ${x(i)} ${y(p)}`).join(' ');
  return (
    <Svg width={width} height={h} style={{ marginTop: space.m }}>
      {target ? <Line x1={0} x2={width} y1={y(target)} y2={y(target)} stroke={color.needle} strokeWidth={1.5} strokeDasharray="4 4" /> : null}
      <Path d={d} stroke={color.ink} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(points.length - 1)} cy={y(points[points.length - 1])} r={5} fill={color.gauge} stroke="#fff" strokeWidth={2} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', paddingHorizontal: space.l, marginTop: space.l, gap: space.m },
  statV: { fontFamily: font.display, fontSize: 26, color: color.ink, fontVariant: ['tabular-nums'] },
  sub: { fontSize: 13, color: color.sub, lineHeight: 18 },
  axis: { textAlign: 'center', fontSize: 12, color: color.faint },
  weightHead: { flexDirection: 'row', alignItems: 'flex-end' },
  bigNum: { fontFamily: font.displayBold, fontSize: 34, color: color.ink, letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: font.displayMed, fontSize: 16, color: color.sub },
  weighIn: { flexDirection: 'row', gap: space.m, marginTop: space.l, alignItems: 'center' },
});
