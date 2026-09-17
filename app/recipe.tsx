import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FoodItem } from '../shared/food';
import { scale, sum } from '../shared/nutrients';
import { FoodRow } from '../src/components/FoodRow';
import { SkeletonRows } from '../src/components/Kit';
import { Button, Field, Group, Screen, Section, Stepper, macroLine } from '../src/components/UI';
import { fmt } from '../src/hooks';
import { useFoodSearch } from '../src/services/foods';
import { newId } from '../src/ids';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

type Line = { item: FoodItem; qty: number };

export default function Recipe() {
  const router = useRouter();
  const addCustom = useStore((s) => s.addCustomFood);
  const stage = useStore((s) => s.stage);
  const [name, setName] = useState('');
  const [servings, setServings] = useState(4);
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const { items, loading } = useFoodSearch(q, { kind: 'all' });

  const total = sum(lines.map((l) => scale(l.item.nutrients, l.qty)));
  const per = scale(total, 1 / Math.max(servings, 1));

  const save = (andLog: boolean) => {
    const item: FoodItem = {
      id: newId('recipe'),
      name: name.trim() || 'My recipe',
      kind: 'recipe',
      serving: { description: `1 of ${servings} servings`, quantity: 1, unit: 'serving' },
      nutrients: per,
      source: { provider: 'user', quality: lines.some((l) => ['estimate', 'photo_estimate'].includes(l.item.source.quality)) ? 'estimate' : 'user' },
    };
    addCustom(item);
    if (andLog) {
      stage([{ item, qty: 1, via: 'recipe' }]);
      router.replace('/review');
    } else router.back();
  };

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        <Field label="Recipe name" value={name} onChangeText={setName} placeholder="Turkey chili" />
        <View style={styles.servings}>
          <Text style={styles.label}>Makes</Text>
          <Stepper value={servings} onChange={(n) => setServings(Math.max(1, Math.round(n)))} step={1} />
          <Text style={styles.label}>servings</Text>
        </View>
      </View>

      <Section title="Ingredients">
        {lines.length ? (
          <Group>
            {lines.map((l, i) => (
              <View key={`${l.item.id}${i}`} style={[styles.line, i < lines.length - 1 && styles.lineBorder]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.lineName} numberOfLines={1}>
                    {l.item.name}
                  </Text>
                  <Text style={styles.fine}>
                    {l.item.serving.description} · {fmt(l.item.nutrients.calories * l.qty)} cal
                  </Text>
                </View>
                <Stepper
                  value={l.qty}
                  step={0.25}
                  onChange={(qty) => setLines(qty <= 0 ? lines.filter((_, j) => j !== i) : lines.map((x, j) => (j === i ? { ...x, qty } : x)))}
                />
              </View>
            ))}
          </Group>
        ) : (
          <Text style={styles.fine}>Search below to add ingredients.</Text>
        )}
        <Field icon="search" placeholder="Add an ingredient" value={q} onChangeText={setQ} style={{ marginTop: space.m }} autoCorrect={false} />
        {q.trim().length >= 2 ? (
          <View style={{ marginTop: space.s }}>
            {loading && !items.length ? (
              <SkeletonRows n={3} />
            ) : (
              <Group>
                {items.slice(0, 8).map((it, i) => (
                  <FoodRow
                    key={it.id}
                    item={it}
                    last={i === Math.min(items.length, 8) - 1}
                    onPress={() => {
                      setLines([...lines, { item: it, qty: 1 }]);
                      setQ('');
                    }}
                    right={
                      <Pressable accessibilityRole="button">
                        <Text style={styles.addText}>Add</Text>
                      </Pressable>
                    }
                  />
                ))}
              </Group>
            )}
          </View>
        ) : null}
      </Section>

      <Section title="Per serving">
        <Text style={styles.big}>{fmt(per.calories)} cal</Text>
        <Text style={styles.fine}>{macroLine(per)}</Text>
      </Section>
      <View style={[styles.pad, { marginTop: space.l }]}>
        <Button label="Save and log a serving" icon="checkmark" disabled={!lines.length} onPress={() => save(true)} />
        <Button label="Save recipe" kind="secondary" disabled={!lines.length} onPress={() => save(false)} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.m },
  servings: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  label: { fontSize: 15, color: color.ink },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l, paddingVertical: 10 },
  lineBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  lineName: { fontSize: 15, color: color.ink },
  fine: { fontSize: 13, color: color.sub },
  addText: { color: color.gauge, fontWeight: '700' },
  big: { fontFamily: font.displayBold, fontSize: 28, color: color.ink },
});
