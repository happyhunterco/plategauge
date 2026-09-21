import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { fmt } from '../hooks';
import { color, font, shadow } from '../theme';
import { arc } from './Logo';

type Props = { eaten: number; goal: number; size?: number };

/**
 * A single monochrome ring: dark progress on a quiet, light track.
 */
export function Gauge({ eaten, goal, size = 264 }: Props) {
  const target = goal > 0 ? Math.min(eaten / goal, 1) : 0;
  const [p, setP] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    let raf = 0;
    let cancelled = false;
    const start = from.current;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        from.current = target;
        setP(target);
        return;
      }
      const t0 = Date.now();
      const dur = 750;
      const tick = () => {
        const t = Math.min((Date.now() - t0) / dur, 1);
        const e = 1 - Math.pow(1 - t, 3);
        const v = start + (target - start) * e;
        from.current = v;
        setP(v);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [target]);

  const over = eaten > goal && goal > 0;
  const left = Math.max(goal - eaten, 0);
  const stroke = size < 240 ? 18 : 22;
  const c = size / 2;
  const r = c - stroke / 2 - 10;
  const small = size < 240;
  const deg = Math.max(p * 360, 0.01);
  // Size the number to the inner ring so "12,480" never truncates (auto-shrink doesn't exist on web).
  const bigText = over ? `+${fmt(eaten - goal)}` : fmt(left);
  const inner = r * 0.66 * 2 - 16;
  const bigSize = Math.floor(Math.min(small ? 36 : 40, inner / (bigText.length * 0.62)));
  const fillStroke = over ? color.ink2 : color.gauge;

  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, alignSelf: 'center' }, shadow.raised]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={over ? `${fmt(eaten - goal)} calories over your goal` : `${fmt(left)} calories left of ${fmt(goal)}`}
    >
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} stroke={color.rim} strokeWidth={stroke} fill={color.plate} />
        {p >= 0.999 ? (
          <Circle cx={c} cy={c} r={r} stroke={fillStroke} strokeWidth={stroke} fill="none" />
        ) : p > 0.004 ? (
          <Path d={arc(c, c, r, 0, deg)} stroke={fillStroke} strokeWidth={stroke} strokeLinecap="round" fill="none" />
        ) : null}
        <Circle cx={c} cy={c} r={r * 0.66} stroke={color.rim} strokeWidth={2} fill="none" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        <Text style={[styles.big, { fontSize: bigSize }]} numberOfLines={1}>
          {bigText}
        </Text>
        <Text style={styles.label}>{over ? 'cal over' : 'cal left'}</Text>
        <Text style={styles.small}>
          {fmt(eaten)} of {fmt(goal)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: font.displayBold, fontSize: 40, letterSpacing: -1.5, color: color.ink, fontVariant: ['tabular-nums'] },
  label: { fontFamily: font.displayMed, fontSize: 15, color: color.ink, marginTop: -2 },
  small: { fontSize: 13, color: color.sub, marginTop: 6, fontVariant: ['tabular-nums'] },
});
