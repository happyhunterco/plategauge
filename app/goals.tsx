import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, Field, Screen } from '../src/components/UI';
import { useStore } from '../src/store';
import { color, space } from '../src/theme';
import type { Goals } from '../src/types';

const FIELDS: { k: keyof Goals; label: string; kcal: number }[] = [
  { k: 'calories', label: 'Calories', kcal: 0 },
  { k: 'protein', label: 'Protein (g)', kcal: 4 },
  { k: 'carbs', label: 'Carbs (g)', kcal: 4 },
  { k: 'fat', label: 'Fat (g)', kcal: 9 },
];

export default function GoalsScreen() {
  const router = useRouter();
  const goals = useStore((s) => s.goals);
  const setGoals = useStore((s) => s.setGoals);
  const [v, setV] = useState<Record<keyof Goals, string>>({
    calories: `${goals?.calories ?? ''}`,
    protein: `${goals?.protein ?? ''}`,
    carbs: `${goals?.carbs ?? ''}`,
    fat: `${goals?.fat ?? ''}`,
  });
  const n = (k: keyof Goals) => Math.max(0, Math.round(parseFloat(v[k]) || 0));
  const fromMacros = n('protein') * 4 + n('carbs') * 4 + n('fat') * 9;
  const gap = n('calories') - fromMacros;

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        {FIELDS.map((f) => (
          <View key={f.k}>
            <Text style={styles.label}>{f.label}</Text>
            <Field keyboardType="number-pad" value={v[f.k]} onChangeText={(t) => setV({ ...v, [f.k]: t })} accessibilityLabel={f.label} />
          </View>
        ))}
        <Text style={[styles.check, Math.abs(gap) > 50 && { color: color.needle }]}>
          Macros add up to {fromMacros.toLocaleString()} calories
          {Math.abs(gap) > 50 ? `, ${Math.abs(gap).toLocaleString()} ${gap > 0 ? 'under' : 'over'} your calorie goal` : ''}
        </Text>
        <Button
          label="Save goals"
          disabled={n('calories') < 800}
          style={{ marginTop: space.l }}
          onPress={() => {
            setGoals({ calories: n('calories'), protein: n('protein'), carbs: n('carbs'), fat: n('fat') });
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.s, paddingTop: space.m },
  label: { fontSize: 13, color: color.sub, marginTop: space.s, marginBottom: 6 },
  check: { fontSize: 13, color: color.sub, marginTop: space.m },
});
