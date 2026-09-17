import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { categoryOf } from '../shared/tags';
import { useHandoff } from '../src/building';
import { SourceLine } from '../src/components/Kit';
import { Totals } from '../src/components/Totals';
import { Button, Empty, Screen, Section, Segmented, Stepper, macroLine, success } from '../src/components/UI';
import { mealForNow, prettyDay } from '../src/dates';
import { fmt, useLeftToday } from '../src/hooks';
import { customize } from '../src/services/foods';
import { pushEntry } from '../src/services/sync';
import { useStore, type Meal } from '../src/store';
import { color, font, space } from '../src/theme';
import { CONTENT } from '../src/layout';
import { sum } from '../shared/nutrients';

export default function Review() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const drafts = useStore((s) => s.drafts);
  const draftMeal = useStore((s) => s.draftMeal);
  const day = useStore((s) => s.day);
  const updateDraft = useStore((s) => s.updateDraft);
  const removeDraft = useStore((s) => s.removeDraft);
  const commit = useStore((s) => s.commit);
  const setBuild = useHandoff((s) => s.setBuild);
  const left = useLeftToday();
  const [meal, setMeal] = useState<Meal>(draftMeal ?? mealForNow());
  const [busy, setBusy] = useState<string | null>(null);

  if (!drafts.length) {
    return (
      <Screen top={false}>
        <Empty icon="checkmark-circle-outline" title="Nothing to add" action={<Button label="Done" onPress={() => router.back()} />} />
      </Screen>
    );
  }

  const total = sum(
    drafts.map((d) => ({
      ...d.item.nutrients,
      calories: d.item.nutrients.calories * d.qty,
      protein: d.item.nutrients.protein * d.qty,
      carbs: d.item.nutrients.carbs * d.qty,
      fat: d.item.nutrients.fat * d.qty,
      sodium: d.item.nutrients.sodium == null ? null : d.item.nutrients.sodium * d.qty,
    })),
  );
  const photo = drafts.some((d) => d.item.source.quality === 'photo_estimate');

  const openBuild = async (key: string) => {
    const d = drafts.find((x) => x.key === key)!;
    setBusy(key);
    try {
      const custom = await customize({ ...d.item, category: d.item.category ?? categoryOf(d.item.name) });
      setBuild({ custom, via: d.via, meal });
      removeDraft(key);
      router.replace('/build');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: color.plate }}>
      <Screen top={false}>
        <View style={{ paddingHorizontal: space.l, paddingTop: space.m }}>
          <Totals n={total} left={left} />
        </View>
        <View style={{ paddingHorizontal: space.l, marginTop: space.l }}>
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
                  value={d.item.name}
                  onChangeText={(name) => updateDraft(d.key, { item: { ...d.item, name } })}
                  style={styles.name}
                  accessibilityLabel="Food name"
                />
                {d.item.brand ? <Text style={styles.meta}>{d.item.brand}</Text> : null}
                <SourceLine source={d.item.source} serving={`${d.item.serving.description} per serving`} />
                {d.changes?.length ? <Text style={styles.changes}>{d.changes.join(', ')}</Text> : null}
                <View style={styles.bottomRow}>
                  <View>
                    <Text style={styles.small}>Servings</Text>
                    <Stepper value={d.qty} onChange={(qty) => updateDraft(d.key, { qty })} step={d.qty < 2 ? 0.25 : 0.5} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cal}>{fmt(d.item.nutrients.calories * d.qty)}</Text>
                    <Text style={styles.meta}>{macroLine(d.item.nutrients, d.qty)}</Text>
                  </View>
                </View>
                <View style={styles.actions}>
                  {!d.changes?.length ? (
                    <Button
                      label="Customize"
                      icon="options-outline"
                      kind="secondary"
                      loading={busy === d.key}
                      onPress={() => openBuild(d.key)}
                      style={{ height: 40, paddingHorizontal: space.m }}
                    />
                  ) : null}
                  <Pressable onPress={() => removeDraft(d.key)} hitSlop={8} accessibilityRole="button" style={styles.remove}>
                    <Text style={{ color: color.danger, fontSize: 14 }}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
          {photo ? <Text style={styles.note}>Photo estimates can be off. Check the items and portions, and edit anything that looks wrong.</Text> : null}
        </Section>
        <View style={{ height: 100 }} />
      </Screen>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.m }]}>
        <View style={{ width: '100%', maxWidth: CONTENT }}>
          <Button
            label={`Add to ${prettyDay(day)}`}
            icon="checkmark"
            onPress={() => {
              const added = commit(meal);
              added.forEach((e) => pushEntry(e).catch(() => {}));
              success();
              router.dismissTo('/');
            }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.l, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, backgroundColor: '#fff' },
  name: { fontFamily: font.display, fontSize: 17, color: color.ink, padding: 0, outlineWidth: 0 },
  meta: { fontSize: 13, color: color.sub, marginTop: 2 },
  changes: { fontSize: 13, color: color.ink, marginTop: 6 },
  small: { fontSize: 12, color: color.sub, marginBottom: 4 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: space.m },
  cal: { fontFamily: font.display, fontSize: 20, color: color.ink },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.m },
  remove: { minHeight: 44, justifyContent: 'center', marginLeft: 'auto' },
  note: { color: color.sub, fontSize: 12, marginTop: space.m, textAlign: 'center' },
  footer: {
    alignItems: 'center',
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
