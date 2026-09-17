import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Recipe } from '../shared/prompts';
import { Card, QualityBadge } from '../src/components/Kit';
import { Button, Chip, ErrorNote, Field, Screen, Section } from '../src/components/UI';
import { fmt, useLeftToday } from '../src/hooks';
import { pantryRecipes } from '../src/services/ai';
import { newId } from '../src/ids';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

export default function Kitchen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string }>();
  const pantry = useStore((s) => s.pantry);
  const addPantry = useStore((s) => s.addPantry);
  const removePantry = useStore((s) => s.removePantry);
  const stage = useStore((s) => s.stage);
  const left = useLeftToday();
  const [item, setItem] = useState('');
  const [mood, setMood] = useState(params.q ?? '');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await pantryRecipes(pantry, mood, left);
      setRecipes(r);
      if (!r.length) setErr('No recipes came back. Add a few more ingredients.');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        <Text style={styles.sub}>{fmt(left.calories)} cal left. Add what you have and we’ll suggest meals that fit.</Text>
        <Field
          icon="add"
          placeholder="Chicken, rice, eggs…"
          value={item}
          onChangeText={setItem}
          returnKeyType="done"
          onSubmitEditing={() => {
            addPantry(item.split(','));
            setItem('');
          }}
          accessibilityLabel="Add pantry item"
        />
        <View style={styles.chips}>
          {pantry.map((p) => (
            <Chip key={p} label={p} icon="close" onPress={() => removePantry(p)} />
          ))}
        </View>
        <Field placeholder="In the mood for… (optional)" value={mood} onChangeText={setMood} />
        {err ? <ErrorNote text={err} /> : null}
        <Button label="Suggest meals" icon="sparkles" onPress={run} loading={busy} disabled={pantry.length < 2} />
      </View>
      {recipes.length ? (
        <Section title="Ideas">
          <View style={{ gap: space.m }}>
            {recipes.map((r) => (
              <Card key={r.title}>
                <Text style={styles.title}>{r.title}</Text>
                <Text style={styles.sub}>
                  {r.minutes} min · {fmt(r.calories)} cal · {r.protein}g protein per serving
                </Text>
                <QualityBadge quality="estimate" small />
                <Text style={styles.body}>{r.ingredients.join(' · ')}</Text>
                {r.steps.map((s, i) => (
                  <Text key={i} style={styles.body}>
                    {i + 1}. {s}
                  </Text>
                ))}
                {r.missing.length ? <Text style={styles.sub}>You’d need: {r.missing.join(', ')}</Text> : null}
                <Button
                  label="Log a serving"
                  kind="secondary"
                  style={{ marginTop: space.m }}
                  onPress={() => {
                    stage([
                      {
                        item: {
                          id: newId('kitchen'),
                          name: r.title,
                          kind: 'recipe',
                          serving: { description: '1 serving', quantity: 1, unit: 'serving' },
                          nutrients: { calories: r.calories, protein: r.protein, carbs: r.carbs, fat: r.fat, fiber: null, sugar: null, sodium: null },
                          source: { provider: 'ai', quality: 'estimate' },
                        },
                        qty: 1,
                        via: 'recipe',
                      },
                    ]);
                    router.push('/review');
                  }}
                />
              </Card>
            ))}
          </View>
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  sub: { fontSize: 13, color: color.sub, lineHeight: 18 },
  title: { fontFamily: font.display, fontSize: 17, color: color.ink },
  body: { fontSize: 14, color: color.ink, marginTop: 6, lineHeight: 20 },
});
