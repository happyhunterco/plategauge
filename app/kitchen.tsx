import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import { kitchen } from '../src/api';
import { Button, Chip, ErrorNote, Field, Screen, Section, macroLine, tap } from '../src/components/UI';
import { useLeft } from '../src/hooks';
import { fmt } from '../src/nutrition';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';
import type { Recipe } from '../src/types';

const STAPLES = ['Eggs', 'Chicken', 'Rice', 'Pasta', 'Ground beef', 'Tortillas', 'Cheese', 'Greek yogurt', 'Potatoes', 'Broccoli'];

export default function Kitchen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const router = useRouter();
  const left = useLeft();
  const pantry = useStore((s) => s.pantry);
  const addPantry = useStore((s) => s.addPantry);
  const removePantry = useStore((s) => s.removePantry);
  const stage = useStore((s) => s.stage);
  const [input, setInput] = useState('');
  const [want, setWant] = useState(params.q ?? '');
  const [recipes, setRecipes] = useState<Recipe[] | null>(null);
  const [open, setOpen] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const add = () => {
    if (!input.trim()) return;
    addPantry(input.split(','));
    setInput('');
  };

  const run = async () => {
    setErr('');
    setBusy(true);
    try {
      setRecipes(await kitchen(pantry, want.trim(), left));
      setOpen(0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = STAPLES.filter((s) => !pantry.some((p) => p.toLowerCase() === s.toLowerCase()));

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        <Text style={styles.lede}>Add what’s in your fridge and pantry. We’ll turn it into meals that fit today.</Text>
        <Field
          icon="add"
          placeholder="Add items, separated by commas"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={add}
          returnKeyType="done"
          accessibilityLabel="Add pantry items"
        />
        {pantry.length > 0 && (
          <View style={styles.chips}>
            {pantry.map((p) => (
              <Chip key={p} label={p} on icon="close" onPress={() => removePantry(p)} />
            ))}
          </View>
        )}
        {suggestions.length > 0 && (
          <>
            <Text style={styles.small}>Common staples</Text>
            <View style={styles.chips}>
              {suggestions.map((s) => (
                <Chip key={s} label={s} icon="add" onPress={() => addPantry([s])} />
              ))}
            </View>
          </>
        )}
        <Field placeholder="In the mood for… (optional)" value={want} onChangeText={setWant} accessibilityLabel="Craving" />
        {err ? <ErrorNote text={err} /> : null}
        <Button label="Make me something" icon="flame" onPress={run} loading={busy} disabled={pantry.length === 0} />
      </View>

      {recipes && (
        <Section title="Recipes">
          <View style={{ gap: space.m }}>
            {recipes.map((r, i) => {
              const isOpen = open === i;
              return (
                <View key={`${r.title}-${i}`} style={styles.card}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: isOpen }}
                    onPress={() => {
                      tap();
                      LayoutAnimation.easeInEaseOut();
                      setOpen(isOpen ? null : i);
                    }}
                    style={styles.cardHead}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{r.title}</Text>
                      <Text style={styles.meta}>
                        {r.minutes} min   {fmt(r.calories)} cal per serving   {macroLine(r)}
                      </Text>
                    </View>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={color.sub} />
                  </Pressable>
                  {isOpen && (
                    <View style={{ marginTop: space.m }}>
                      {r.missing && r.missing.length > 0 && (
                        <Text style={styles.missing}>You’ll also need: {r.missing.join(', ')}</Text>
                      )}
                      <Text style={styles.sub}>Ingredients</Text>
                      {r.ingredients.map((x) => (
                        <Text key={x} style={styles.line}>{x}</Text>
                      ))}
                      <Text style={styles.sub}>Steps</Text>
                      {r.steps.map((x, n) => (
                        <View key={n} style={styles.step}>
                          <Text style={styles.stepN}>{n + 1}</Text>
                          <Text style={[styles.line, { flex: 1 }]}>{x}</Text>
                        </View>
                      ))}
                      <Button
                        label="Log a serving"
                        kind="secondary"
                        icon="add"
                        style={{ height: 42, marginTop: space.m, alignSelf: 'flex-start' }}
                        onPress={() => {
                          stage([
                            {
                              name: r.title,
                              serving: `1 of ${r.servings} servings`,
                              calories: r.calories,
                              protein: r.protein,
                              carbs: r.carbs,
                              fat: r.fat,
                              qty: 1,
                              source: 'recipe',
                            },
                          ]);
                          router.push('/review');
                        }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.m },
  lede: { fontSize: 15, color: color.sub, lineHeight: 21, marginBottom: space.s },
  small: { fontSize: 13, color: color.sub },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  card: { padding: space.l, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, backgroundColor: '#fff' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  title: { fontFamily: font.display, fontSize: 17, color: color.ink },
  meta: { fontSize: 13, color: color.sub, marginTop: 4 },
  missing: { fontSize: 13, color: color.needle, marginBottom: space.s },
  sub: { fontFamily: font.displayMed, fontSize: 14, color: color.ink, marginTop: space.m, marginBottom: 4 },
  line: { fontSize: 15, color: color.ink, lineHeight: 22 },
  step: { flexDirection: 'row', gap: space.m, marginTop: 4 },
  stepN: { fontFamily: font.display, color: color.gauge, width: 16, lineHeight: 22 },
});
