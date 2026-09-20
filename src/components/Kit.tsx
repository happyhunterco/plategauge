import { Ionicons } from '@expo/vector-icons';
import { useId } from 'react';
import { Image } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useRouter } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Quality, SourceInfo } from '../../shared/food';
import { QUALITY_LABEL } from '../../shared/food';
import { fmt, useStreak } from '../hooks';
import { useStore } from '../store';
import { color, font, shadow, space } from '../theme';
import { LogoMark } from './Logo';
import { Group, tap, type IconName } from './UI';
import { CONTENT, useWide } from '../layout';

const QUALITY_TONE: Record<Quality, { bg: string; fg: string; icon: IconName }> = {
  verified_restaurant: { bg: '#E8F3FF', fg: '#0B5CAD', icon: 'checkmark-circle' },
  verified_packaged: { bg: '#E8F3FF', fg: '#0B5CAD', icon: 'checkmark-circle' },
  database: { bg: color.wash, fg: color.sub, icon: 'server-outline' },
  user: { bg: color.wash, fg: color.sub, icon: 'person-outline' },
  estimate: { bg: '#FFF4E5', fg: '#9A5B00', icon: 'calculator-outline' },
  photo_estimate: { bg: '#FFF4E5', fg: '#9A5B00', icon: 'camera-outline' },
  development: { bg: '#F1ECFF', fg: '#5B3CC4', icon: 'construct-outline' },
};

const PROVIDER_NAME: Record<string, string> = {
  usda: 'USDA',
  off: 'Open Food Facts',
  nutritionix: 'Nutritionix',
  fatsecret: 'FatSecret',
  hff: 'HealthyFastFood.org',
  user: 'You',
  ai: 'AI',
  template: 'PlateGauge',
  dev: 'Test data',
};

export function QualityBadge({ quality, small }: { quality: Quality; small?: boolean }) {
  const t = QUALITY_TONE[quality];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, small && { paddingVertical: 2, paddingHorizontal: 6 }]} accessibilityLabel={QUALITY_LABEL[quality]}>
      <Ionicons name={t.icon} size={small ? 11 : 12} color={t.fg} />
      <Text style={[styles.badgeText, { color: t.fg }, small && { fontSize: 11 }]}>{QUALITY_LABEL[quality]}</Text>
    </View>
  );
}

/** A quiet source/serving line. Pass a label to favor a consumer-facing company name. */
export function SourceLine({ source, serving, label, showProvider = true }: { source: SourceInfo; serving?: string; label?: string | null; showProvider?: boolean }) {
  const range = source.range ? `${fmt(source.range.low)}–${fmt(source.range.high)} cal likely` : null;
  return (
    <View style={styles.sourceLine}>
      <QualityBadge quality={source.quality} small />
      <Text style={styles.sourceText} numberOfLines={1}>
        {[label || (showProvider ? PROVIDER_NAME[source.provider] : null), serving, range, source.confidence ? `${source.confidence} confidence` : null]
          .filter(Boolean)
          .join('  ·  ')}
      </Text>
    </View>
  );
}

export function Card({ children, style, onPress, label }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; label?: string }) {
  if (!onPress) return <View style={[styles.card, style]}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.85 }]}
    >
      {children}
    </Pressable>
  );
}

export function Bar({ value, max, tint = color.gauge, height = 6 }: { value: number; max: number; tint?: string; height?: number }) {
  const pct = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const over = max > 0 && value > max;
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={{ width: `${pct * 100}%`, height, borderRadius: height / 2, backgroundColor: over ? color.needle : tint }} />
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: ViewStyle }) {
  return <View style={[{ height, width, borderRadius: 8, backgroundColor: color.wash }, style]} accessibilityLabel="Loading" />;
}

export function SkeletonRows({ n = 4 }: { n?: number }) {
  return (
    <Group>
      {Array.from({ length: n }, (_, i) => (
        <View key={i} style={[styles.row, i < n - 1 && styles.rowLine, { gap: 8, flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Skeleton width="60%" />
          <Skeleton width="35%" height={12} />
        </View>
      ))}
    </Group>
  );
}

/** Large one-tap answers for short follow-up questions. */
export function Choices({ prompt, options, onPick }: { prompt: string; options: string[]; onPick: (i: number) => void }) {
  return (
    <View style={styles.choices} accessibilityRole="radiogroup">
      <Text style={styles.choicePrompt}>{prompt}</Text>
      <View style={styles.choiceRow}>
        {options.map((o, i) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            onPress={() => {
              tap();
              onPick(i);
            }}
            style={({ pressed }) => [styles.choice, pressed && { backgroundColor: color.ink }]}
          >
            {({ pressed }) => <Text style={[styles.choiceText, pressed && { color: '#fff' }]}>{o}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Avatar({ size = 36 }: { size?: number }) {
  const router = useRouter();
  const name = useStore((s) => s.profile?.name || s.account?.email || '');
  const avatar = useStore((s) => s.profile?.avatar);
  const initials =
    name
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Profile and settings"
      hitSlop={6}
      onPress={() => {
        tap();
        router.push('/profile');
      }}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {avatar ? (
        <Image source={{ uri: avatar }} style={{ width: size - 2, height: size - 2, borderRadius: (size - 2) / 2 }} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : initials ? (
        <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color="#fff" />
      )}
    </Pressable>
  );
}

export function StreakChip() {
  const s = useStreak();
  return (
    <View style={styles.streak} accessible accessibilityLabel={`${s.current} day logging streak${s.todayLogged ? '' : '. Log today to extend it.'}`}>
      <Ionicons name="flame" size={15} color={s.todayLogged ? color.needle : color.faint} />
      <Text style={styles.streakText}>{s.current}</Text>
    </View>
  );
}

/** Top bar used on every tab: brand mark, optional title, streak, profile. */
export function TopBar({ title, max = CONTENT }: { title?: string; max?: number }) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  if (wide) {
    return (
      <View style={[styles.topWide, { maxWidth: max }]}>
        <Text style={styles.topWideTitle} accessibilityRole="header">
          {title ?? 'Today'}
        </Text>
      </View>
    );
  }
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
      <View style={styles.topLeft}>
        <LogoMark size={32} />
        <Text style={styles.topTitle} accessibilityRole="header">
          {title ?? 'PlateGauge'}
        </Text>
      </View>
      <View style={styles.topRight}>
        <StreakChip />
        <Avatar />
      </View>
    </View>
  );
}

export function UndoToast() {
  const u = useStore((s) => s.lastUndo);
  const setUndo = useStore((s) => s.setUndo);
  const insets = useSafeAreaInsets();
  const wide = useWide();
  if (!u) return null;
  return (
    <View style={[styles.toast, { bottom: insets.bottom + (wide ? 24 : 92) }]} accessibilityRole="alert">
      <Text style={styles.toastText} numberOfLines={1}>
        {u.label}
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => {
          u.undo();
          setUndo(null);
        }}
      >
        <Text style={styles.toastAction}>Undo</Text>
      </Pressable>
    </View>
  );
}

export function showUndo(label: string, undo: () => void) {
  const set = useStore.getState().setUndo;
  const token = { label, undo };
  set(token);
  setTimeout(() => {
    if (useStore.getState().lastUndo === token) set(null);
  }, 5000);
}

export function DevDataBanner({ text, max = CONTENT }: { text: string; max?: number }) {
  return (
    <View style={{ width: '100%', maxWidth: max, alignSelf: 'center', paddingHorizontal: space.l }}>
      <View style={styles.devBanner} accessibilityRole="text">
        <Ionicons name="construct-outline" size={14} color="#5B3CC4" />
        <Text style={styles.devText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontWeight: '600' },
  sourceLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, minWidth: 0 },
  sourceText: { fontSize: 12, color: color.faint, flexShrink: 1 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: space.l, borderWidth: StyleSheet.hairlineWidth, borderColor: color.lineSoft, ...shadow.card },
  choices: { backgroundColor: color.wash, borderRadius: 20, padding: space.l },
  choicePrompt: { fontFamily: font.display, fontSize: 17, color: color.ink, marginBottom: space.m },
  choiceRow: { flexDirection: 'row', gap: space.s },
  choice: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.soft,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: color.line,
  },
  choiceText: { fontSize: 16, fontWeight: '600', color: color.ink, textAlign: 'center' },
  avatar: { backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.line },
  avatarText: { color: '#fff', fontFamily: font.display, fontSize: 14 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 34, borderRadius: 17, backgroundColor: color.wash },
  streakText: { fontFamily: font.display, fontSize: 15, color: color.ink },
  topWide: { width: '100%', maxWidth: CONTENT, alignSelf: 'center', paddingHorizontal: space.l, paddingTop: 28, paddingBottom: 4 },
  topWideTitle: { fontFamily: font.displayBold, fontSize: 28, color: color.ink, letterSpacing: -0.6 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    paddingBottom: 8,
    backgroundColor: '#fff',
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { fontFamily: font.displayBold, fontSize: 20, color: color.ink, letterSpacing: -0.4 },
  toast: {
    position: 'absolute',
    left: space.l,
    right: space.l,
    maxWidth: 480,
    marginHorizontal: 'auto',
    backgroundColor: color.ink,
    borderRadius: 16,
    ...shadow.raised,
    paddingHorizontal: space.l,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.m,
  },
  toastText: { color: '#fff', fontSize: 15, flex: 1 },
  toastAction: { color: '#7CC0FF', fontSize: 15, fontWeight: '700' },
  devBanner: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    backgroundColor: '#F1ECFF',
    paddingHorizontal: space.m,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: space.s,
  },
  devText: { color: '#5B3CC4', fontSize: 12, flex: 1 },
  track: { backgroundColor: color.wash, overflow: 'hidden' },
  row: { paddingVertical: 13, paddingHorizontal: space.l, minHeight: 52 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
});

/** A rounded surface filled with a diagonal two-color gradient, for hero cards and tiles. */
export function GradientBox({ children, style, from = color.ink, to = color.ink2 }: { children?: ReactNode; style?: ViewStyle; from?: string; to?: string }) {
  const id = `gb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[{ borderRadius: 18, overflow: 'hidden' }, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={from} />
            <Stop offset="100%" stopColor={to} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
