import { StyleSheet, Text, View } from 'react-native';
import type { Nutrients } from '../../shared/food';
import { fmt } from '../hooks';
import { color, font, space } from '../theme';

type Left = { calories: number; protein: number; carbs: number; fat: number };

/** Meal totals plus what's left after it. Updates live. */
export function Totals({ n, left, estimated }: { n: Nutrients; left: Left; estimated?: boolean }) {
  const after = { calories: left.calories - n.calories, protein: left.protein - n.protein };
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <View>
          <Text style={styles.cal}>
            {fmt(n.calories)}
            <Text style={styles.unit}> cal{estimated ? ' (est.)' : ''}</Text>
          </Text>
          <Text style={styles.macros}>
            {fmt(n.protein)}g protein {fmt(n.carbs)}g carbs {fmt(n.fat)}g fat{n.sodium != null ? `   ${fmt(n.sodium)}mg sodium` : ''}
          </Text>
        </View>
      </View>
      <Text style={[styles.after, after.calories < 0 && { color: color.ink2 }]}>
        {after.calories >= 0
          ? `After this: ${fmt(after.calories)} cal and ${fmt(Math.max(after.protein, 0))}g protein left`
          : `After this: ${fmt(-after.calories)} cal over today`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cal: { fontFamily: font.displayBold, fontSize: 28, color: color.ink, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: font.displayMed, fontSize: 14, color: color.sub },
  macros: { fontSize: 13, color: color.sub, marginTop: 2 },
  after: { fontSize: 13, color: color.gauge, fontWeight: '600', marginTop: space.xs },
});
