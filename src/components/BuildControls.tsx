import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Customizable, ModGroup, Selection } from '../../shared/food';
import { applyChange, effectOf, groupVisible, optionAvailable } from '../../shared/customize';
import { isEstimate } from '../../shared/food';
import { color, font, space } from '../theme';
import { Stepper, tap } from './UI';

const deltaText = (cal: number) => (Math.round(cal) === 0 ? '' : `${cal > 0 ? '+' : '−'}${Math.abs(Math.round(cal))} cal`);

/** Generates Build It controls from any Customizable definition. */
export function BuildControls({ custom, selection, onChange }: { custom: Customizable; selection: Selection; onChange: (s: Selection) => void }) {
  return (
    <View style={{ gap: space.xl }}>
      {custom.groups
        .filter((g) => groupVisible(g, selection))
        .map((g) => (
          <Group key={g.id} g={g} custom={custom} selection={selection} onChange={onChange} />
        ))}
    </View>
  );
}

function Group({ g, custom, selection, onChange }: { g: ModGroup; custom: Customizable; selection: Selection; onChange: (s: Selection) => void }) {
  const cur = selection[g.id];
  const estimate = g.options.some((o) => isEstimate(o.quality));
  const header = (
    <View style={styles.head}>
      <Text style={styles.title} accessibilityRole="header">
        {g.label}
      </Text>
      {estimate && g.kind !== 'portion' ? <Text style={styles.est}>Estimate</Text> : null}
    </View>
  );

  if (g.kind === 'portion') {
    return (
      <View>
        {header}
        <View style={styles.bigRow} accessibilityRole="radiogroup">
          {g.options.map((o) => {
            const on = Array.isArray(cur) && cur[0] === o.id;
            const d = on ? 0 : effectOf(custom, selection, g.id, o.id).calories;
            return (
              <Pressable
                key={o.id}
                onPress={() => {
                  tap();
                  onChange(applyChange(custom, selection, g.id, o.id));
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                style={[styles.big, on && styles.bigOn]}
              >
                <Text style={[styles.bigText, on && { color: '#fff' }]}>{o.label}</Text>
                {!on && d ? <Text style={styles.bigDelta}>{deltaText(d)}</Text> : null}
              </Pressable>
            );
          })}
        </View>
        {g.help ? <Text style={styles.help}>{g.help}</Text> : null}
      </View>
    );
  }

  if (g.kind === 'count') {
    const n = typeof cur === 'number' ? cur : 0;
    const unit = g.options[0];
    const available = !!unit?.nutrients;
    return (
      <View>
        {header}
        <View style={styles.countRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.optLabel}>{unit?.label ?? g.label}</Text>
            <Text style={styles.optDelta}>{available ? `${Math.round(unit.nutrients!.calories)} cal each` : 'Nutrition not available'}</Text>
          </View>
          {available ? <Stepper value={n} step={1} onChange={(v) => onChange(applyChange(custom, selection, g.id, v))} /> : null}
        </View>
        {g.help ? <Text style={styles.help}>{g.help}</Text> : null}
      </View>
    );
  }

  const isToggle = g.kind === 'toggle';
  return (
    <View>
      {header}
      <View style={styles.list} accessibilityRole={isToggle ? undefined : 'radiogroup'}>
        {g.options.map((o, i) => {
          const on = Array.isArray(cur) && cur.includes(o.id);
          const ok = optionAvailable(o);
          const d = ok ? effectOf(custom, selection, g.id, o.id) : null;
          const hint = !ok
            ? 'Nutrition not available'
            : on && !isToggle
              ? 'Selected'
              : d
                ? [
                    deltaText(d.calories),
                    Math.abs(d.protein) >= 1 ? `${d.protein > 0 ? '+' : '−'}${Math.abs(Math.round(d.protein))}g protein` : '',
                    Math.abs(d.fat) >= 1 ? `${d.fat > 0 ? '+' : '−'}${Math.abs(Math.round(d.fat))}g fat` : '',
                  ]
                    .filter(Boolean)
                    .join(', ')
                : '';
          return (
            <Pressable
              key={o.id}
              disabled={!ok}
              onPress={() => {
                tap();
                onChange(applyChange(custom, selection, g.id, o.id));
              }}
              accessibilityRole={isToggle ? 'checkbox' : 'radio'}
              accessibilityState={{ checked: on, disabled: !ok }}
              style={({ pressed }) => [
                styles.opt,
                i < g.options.length - 1 && styles.optLine,
                pressed && { backgroundColor: color.wash },
                !ok && { opacity: 0.45 },
              ]}
            >
              <Ionicons
                name={isToggle ? (on ? 'checkbox' : 'square-outline') : on ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={on ? color.gauge : color.faint}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.optLabel}>{o.label}</Text>
                {hint ? <Text style={styles.optDelta}>{hint}</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {g.help ? <Text style={styles.help}>{g.help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.s },
  title: { fontFamily: font.display, fontSize: 16, color: color.ink },
  est: { fontSize: 11, color: color.sub, backgroundColor: color.wash2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  bigRow: { flexDirection: 'row', gap: space.s },
  big: {
    flex: 1,
    minHeight: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.line,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  bigOn: { backgroundColor: color.ink, borderColor: color.ink },
  bigText: { fontSize: 15, fontWeight: '600', color: color.ink },
  bigDelta: { fontSize: 11, color: color.sub, marginTop: 2 },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    padding: space.m,
  },
  list: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, overflow: 'hidden' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.m, paddingVertical: 11, minHeight: 52 },
  optLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  optLabel: { fontSize: 15, color: color.ink },
  optDelta: { fontSize: 12, color: color.sub, marginTop: 1 },
  help: { fontSize: 12, color: color.sub, marginTop: 6 },
});
