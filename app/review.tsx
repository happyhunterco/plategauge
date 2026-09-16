import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Empty, Screen, Section, Segmented, Stepper, macroLine, success } from '../src/components/UI';
import { mealForNow, prettyDay } from '../src/dates';
import { fmt, sumMacros } from '../src/nutrition';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';
import type { Meal } from '../src/types';

export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const drafts = useStore((s) => s.drafts);
  const draftMeal = useStore((s) => s.draftMeal);
  const day = useStore((s) => s.day);
  const updateDraft = useStore((s) => s.updateDraft);
  const removeDraft = useStore((s) => s.removeDraft);
  const commit = useStore((s) => s.commit);
  const [meal, setMeal] = useState<Meal>(draftMeal ?? mealForNow());
  const total = sumMacros(drafts);
  const ai = drafts.some((d) => ['photo', 'text', 'crave', 'menu', 'recipe'].includes(d.source));

  if (!drafts.length) {
    return (
      <Screen top={false}>
        <Empty icon="checkmark-circle-outline" title="Nothing to add" action={<Button label="Done" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: color.plate }}>
      <Screen top={false}>
        <View style={styles.total}>
          <Text style={styles.totalNum}>{fmt(total.calories)}</Text>
          <Text style={styles.totalLabel}>calories   {macroLine(total)}</Text>
        </View>

        <View style={{ paddingHorizontal: space.l }}>
          <Segmented
            value={meal}
            onChange={setMeal}
            options={[
              { value: 'breakfast', label: 'Breakfast' },
              { value: 'lunch', label: 'Lunch' },
              { value: 'dinner', label: 'Dinner' },
              { value: 'snack', label: 'Snack' },
            ]}
          />
        </View>

        <Section title={drafts.length > 1 ? `${drafts.length} items` : 'Item'}>
          <View style={{ gap: space.m }}>
            {drafts.map((d) => (
              <View key={d.key} style={styles.card}>
                <TextInput
                  value={d.name}
                  onChangeText={(name) => updateDraft(d.key, { name })}
                  style={styles.name}
                  accessibilityLabel="Food name"
                />
                <Text style={styles.meta}>
                  {d.brand ? `${d.brand}, ` : ''}
                  {d.serving} per serving
                </Text>
                <View style={styles.bottomRow}>
                  <Stepper value={d.qty} onChange={(qty) => updateDraft(d.key, { qty })} step={d.qty < 2 ? 0.25 : 0.5} />
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cal}>{fmt(d.calories * d.qty)}</Text>
                    <Text style={styles.meta}>{macroLine(d, d.qty)}</Text>
                  </View>
                </View>
                <Pressable onPress={() => removeDraft(d.key)} hitSlop={8} accessibilityRole="button" style={{ alignSelf: 'flex-start', marginTop: space.s }}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
          {ai && <Text style={styles.note}>AI estimates. Adjust servings if your portion looks different.</Text>}
        </Section>
      </Screen>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.m }]}>
        <Button
          label={`Add to ${prettyDay(day)}`}
          icon="checkmark"
          onPress={() => {
            commit(meal);
            success();
            router.dismissTo('/');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  total: { alignItems: 'center', paddingVertical: space.l },
  totalNum: { fontFamily: font.displayBold, fontSize: 44, color: color.ink, letterSpacing: -1.2, fontVariant: ['tabular-nums'] },
  totalLabel: { color: color.sub, fontSize: 14 },
  card: { padding: space.l, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line },
  name: { fontFamily: font.display, fontSize: 17, color: color.ink, padding: 0 },
  meta: { fontSize: 13, color: color.sub, marginTop: 3 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.m },
  cal: { fontFamily: font.display, fontSize: 20, color: color.ink, fontVariant: ['tabular-nums'] },
  remove: { color: color.danger, fontSize: 14 },
  note: { color: color.faint, fontSize: 12, marginTop: space.m, textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.l,
    paddingTop: space.m,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
