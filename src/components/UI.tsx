import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { forwardRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fmt } from '../hooks';
import { useStore } from '../store';
import { dark } from '../theme';
import { fieldLayout } from './fieldLayout';
import { column, useWide } from '../layout';
import { color, font, radius, shadow, space, type } from '../theme';
type Macros = { calories: number; protein: number; carbs: number; fat: number };

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};
export const success = () => {
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};

export function Screen({
  children,
  title,
  subtitle,
  right,
  scroll = true,
  bg = color.plate,
  top = true,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  scroll?: boolean;
  bg?: string;
  top?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const dm = useStore((s) => s.darkMode);
  const c = dm ? dark : color;
  const header = title ? (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={type.title} accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  ) : null;
  const pad = { paddingTop: top ? insets.top + space.m : space.m, paddingBottom: wide ? 48 : 120 };
  if (!scroll)
    return (
      <View style={[{ flex: 1, backgroundColor: bg ?? (dm ? '#0E1117' : '#fff') }, pad, column]}>
        {header}
        {children}
      </View>
    );
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={[pad, column]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {header}
      {children}
    </ScrollView>
  );
}

export function Button({
  label,
  onPress,
  icon,
  kind = 'primary',
  loading,
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: IconName;
  kind?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const fg = kind === 'primary' ? '#fff' : color.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        kind === 'primary' && { backgroundColor: color.ink, ...shadow.soft },
        kind === 'secondary' && { backgroundColor: color.wash },
        kind === 'ghost' && { backgroundColor: 'transparent', height: 40 },
        (disabled || pressed) && { opacity: disabled ? 0.4 : 0.8, ...(pressed && !disabled ? { transform: [{ scale: 0.985 }] } : null) },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[styles.btnText, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export const Field = forwardRef<TextInput, TextInputProps & { icon?: IconName; label?: string; suffix?: string }>(function Field(props, ref) {
  const { icon, style, label, suffix, onFocus, onBlur, ...rest } = props;
  const [focused, setFocused] = useState(false);
  const l = fieldLayout(focused);
  const box = (
    <View style={[styles.field, l.container, style as ViewStyle]}>
      {icon ? <Ionicons name={icon} size={18} color={focused ? color.gauge : color.faint} /> : null}
      <TextInput
        ref={ref}
        placeholderTextColor={color.faint}
        style={[styles.input, l.input]}
        accessibilityLabel={rest.accessibilityLabel ?? label}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
    </View>
  );
  if (!label) return box;
  return (
    <View style={{ minWidth: 0, flex: (style as ViewStyle | undefined)?.flex }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {box}
    </View>
  );
});

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.seg} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segItem, on && styles.segOn]}
          >
            <Text style={[styles.segText, on && { color: color.ink, fontWeight: '600' }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, onPress, on, icon }: { label: string; onPress: () => void; on?: boolean; icon?: IconName }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.chip, on && { backgroundColor: color.ink, borderColor: color.ink }, pressed && { opacity: 0.7 }]}
    >
      {icon ? <Ionicons name={icon} size={14} color={on ? '#fff' : color.sub} /> : null}
      <Text style={[styles.chipText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, action, children, style }: { title?: string; action?: ReactNode; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ marginTop: space.xl, paddingHorizontal: space.l }, style]}>
      {title ? (
        <View style={styles.sectionHead}>
          <Text style={type.section} accessibilityRole="header">
            {title}
          </Text>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Group({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.group, style]}>{children}</View>;
}

export function Row({
  title,
  detail,
  value,
  onPress,
  onLongPress,
  right,
  last,
}: {
  title: string;
  detail?: string;
  value?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  right?: ReactNode;
  last?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress && !onLongPress}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, !last && styles.rowLine, pressed && { backgroundColor: color.wash }]}
    >
      <View style={{ flex: 1, paddingRight: space.m }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {detail ? (
          <Text style={styles.rowDetail} numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right}
    </Pressable>
  );
}

export const macroLine = (m: Macros, qty = 1) => `${fmt(m.protein * qty)}P   ${fmt(m.carbs * qty)}C   ${fmt(m.fat * qty)}F`;

export function MacroBars({ eaten, goals }: { eaten: Macros; goals: Macros }) {
  const items = [
    { k: 'Protein', v: eaten.protein, g: goals.protein, c: color.protein },
    { k: 'Carbs', v: eaten.carbs, g: goals.carbs, c: color.carbs },
    { k: 'Fat', v: eaten.fat, g: goals.fat, c: color.fat },
  ];
  return (
    <View style={styles.macros}>
      {items.map((i) => {
        const pct = i.g ? Math.min(i.v / i.g, 1) : 0;
        return (
          <View key={i.k} style={{ flex: 1 }} accessible accessibilityLabel={`${i.k}: ${fmt(i.v)} of ${fmt(i.g)} grams`}>
            <Text style={styles.macroK}>{i.k}</Text>
            <Text style={styles.macroV}>
              {fmt(i.v)}
              <Text style={styles.macroG}> / {fmt(i.g)}g</Text>
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: i.c }]} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function Stepper({ value, onChange, step = 0.5 }: { value: number; onChange: (v: number) => void; step?: number }) {
  const b = (d: number, icon: IconName, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={() => {
        tap();
        onChange(Math.max(0, Math.round((value + d) * 100) / 100));
      }}
      style={styles.stepBtn}
    >
      <Ionicons name={icon} size={16} color={color.ink} />
    </Pressable>
  );
  return (
    <View style={styles.stepper}>
      {b(-step, 'remove', 'Less')}
      <Text style={styles.stepVal}>{value}×</Text>
      {b(step, 'add', 'More')}
    </View>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={color.faint} />
      <Text style={[type.section, { marginTop: space.s, textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[type.small, { textAlign: 'center', marginTop: 4 }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: space.l }}>{action}</View> : null}
    </View>
  );
}

export function ErrorNote({ text }: { text: string }) {
  return (
    <View style={styles.error} accessibilityRole="alert">
      <Ionicons name="alert-circle" size={16} color={color.danger} />
      <Text style={{ color: color.danger, flex: 1, fontSize: 14 }}>{text}</Text>
    </View>
  );
}

export function IconButton({ icon, onPress, label }: { icon: IconName; onPress: () => void; label: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={20} color={color.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: space.l, marginBottom: space.s },
  subtitle: { fontSize: 15, color: color.sub, marginTop: 2 },
  btn: {
    height: 52,
    borderRadius: radius.l,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: space.xl,
  },
  btnText: { fontSize: 16, fontWeight: '600' },
  field: {
    gap: 8,
    backgroundColor: color.wash,
    borderRadius: radius.m,
    paddingHorizontal: space.m,
  },
  input: { fontSize: 16, color: color.ink, paddingVertical: 11 },
  fieldLabel: { fontSize: 13, color: color.sub, marginBottom: 6 },
  suffix: { fontSize: 14, color: color.sub },
  seg: { flexDirection: 'row', backgroundColor: color.wash, borderRadius: radius.s + 2, padding: 3 },
  segItem: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.s },
  segOn: {
    backgroundColor: '#fff',
    shadowColor: color.ink,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segText: { fontSize: 14, color: color.sub, paddingHorizontal: 4 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    height: 34,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: '#fff',
  },
  chipText: { fontSize: 14, color: color.ink },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.s },
  group: { backgroundColor: '#fff', borderRadius: radius.m, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: space.l, minHeight: 52 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  rowTitle: { fontSize: 16, color: color.ink },
  rowDetail: { fontSize: 13, color: color.sub, marginTop: 2 },
  rowValue: { fontFamily: font.displayMed, fontSize: 16, color: color.ink, fontVariant: ['tabular-nums'] },
  macros: { flexDirection: 'row', gap: space.l, paddingHorizontal: space.l },
  macroK: { fontSize: 13, color: color.sub },
  macroV: { fontFamily: font.display, fontSize: 18, color: color.ink, marginTop: 2, fontVariant: ['tabular-nums'] },
  macroG: { fontFamily: undefined, fontSize: 12, color: color.faint },
  track: { height: 5, borderRadius: 3, backgroundColor: color.wash, marginTop: 7, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: color.wash, borderRadius: radius.pill, padding: 3 },
  stepBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  stepVal: { minWidth: 44, textAlign: 'center', fontFamily: font.displayMed, fontSize: 15, color: color.ink },
  empty: { alignItems: 'center', paddingVertical: space.xxl, paddingHorizontal: space.xl },
  error: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    backgroundColor: '#FCEDEC',
    padding: space.m,
    borderRadius: radius.s,
    marginTop: space.m,
  },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: color.wash },
});
