import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { menus } from '../src/api';
import { IdeaList } from '../src/components/Ideas';
import { Button, Chip, ErrorNote, Field, Screen, Section } from '../src/components/UI';
import { useLeft } from '../src/hooks';
import { fmt } from '../src/nutrition';
import { color, space } from '../src/theme';
import type { Idea } from '../src/types';

const SPOTS = ['Chipotle', 'Chick-fil-A', 'Starbucks', 'Subway', 'Panera', 'Taco Bell', 'In-N-Out', 'Cava'];

export default function Menus() {
  const params = useLocalSearchParams<{ q?: string }>();
  const left = useLeft();
  const [place, setPlace] = useState('');
  const [want, setWant] = useState(params.q ?? '');
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const run = async (p = place) => {
    if (!p.trim()) return;
    setErr('');
    setBusy(true);
    try {
      setIdeas(await menus(p.trim(), want.trim(), left));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        <Text style={styles.lede}>
          Tell us where you’re eating. We’ll build orders that fit your {fmt(left.calories)} calories left.
        </Text>
        <Field icon="restaurant-outline" placeholder="Restaurant name" value={place} onChangeText={setPlace} returnKeyType="search" onSubmitEditing={() => run()} accessibilityLabel="Restaurant name" />
        <View style={styles.chips}>
          {SPOTS.map((s) => (
            <Chip key={s} label={s} on={place === s} onPress={() => setPlace(s)} />
          ))}
        </View>
        <Field placeholder="Anything specific? (optional)" value={want} onChangeText={setWant} accessibilityLabel="What you want" />
        {err ? <ErrorNote text={err} /> : null}
        <Button label="Find orders" icon="search" onPress={() => run()} loading={busy} disabled={!place.trim()} />
      </View>
      {ideas && (
        <Section title={`At ${place}`}>
          <IdeaList ideas={ideas} source="menu" />
        </Section>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.m },
  lede: { fontSize: 15, color: color.sub, lineHeight: 21, marginBottom: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
});
