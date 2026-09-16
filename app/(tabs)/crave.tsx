import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { crave } from '../../src/api';
import { IdeaList } from '../../src/components/Ideas';
import { Button, Chip, ErrorNote, Field, Screen, Section, tap, type IconName } from '../../src/components/UI';
import { useLeft } from '../../src/hooks';
import { fmt } from '../../src/nutrition';
import { color, font, space, type } from '../../src/theme';
import type { Idea } from '../../src/types';

const MOODS = ['Sweet', 'Salty', 'Crunchy', 'Something warm', 'High protein', 'Late-night snack'];

export default function Crave() {
  const router = useRouter();
  const left = useLeft();
  const [text, setText] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const prompt = [text.trim(), ...moods].filter(Boolean).join(', ');
  const run = async () => {
    setErr('');
    setBusy(true);
    try {
      setIdeas(await crave(prompt, left));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const door = (icon: IconName, title: string, body: string, to: '/menus' | '/kitchen') => (
    <Pressable
      style={({ pressed }) => [styles.door, pressed && { backgroundColor: color.wash }]}
      onPress={() => {
        tap();
        router.push({ pathname: to, params: { q: prompt } });
      }}
      accessibilityRole="button"
    >
      <View style={styles.doorIcon}>
        <Ionicons name={icon} size={20} color={color.ink} />
      </View>
      <Text style={styles.doorTitle}>{title}</Text>
      <Text style={styles.doorBody}>{body}</Text>
    </Pressable>
  );

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.headline} accessibilityRole="header">What’re ya{'\n'}hungry for?</Text>
        <Text style={styles.budget}>
          {fmt(left.calories)} cal and {fmt(left.protein)}g protein left today
        </Text>
      </View>

      <View style={{ paddingHorizontal: space.l, gap: space.m }}>
        <Field
          placeholder="Something cold and sweet that isn’t ice cream"
          value={text}
          onChangeText={setText}
          multiline
          style={{ minHeight: 84, alignItems: 'flex-start' }}
          accessibilityLabel="Describe your craving"
        />
        <View style={styles.chips}>
          {MOODS.map((m) => (
            <Chip
              key={m}
              label={m}
              on={moods.includes(m)}
              onPress={() => setMoods(moods.includes(m) ? moods.filter((x) => x !== m) : [...moods, m])}
            />
          ))}
        </View>
        {err ? <ErrorNote text={err} /> : null}
        <Button label="Find ideas" icon="sparkles" onPress={run} loading={busy} disabled={!prompt} />
      </View>

      {ideas && (
        <Section title="Ideas that fit">
          <IdeaList ideas={ideas} source="crave" />
        </Section>
      )}

      <Section title="Where are you eating?">
        <View style={styles.doors}>
          {door('restaurant-outline', 'Menus', 'Best orders at a restaurant', '/menus')}
          {door('basket-outline', 'Kitchen', 'Meals from what you have', '/kitchen')}
        </View>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.l, paddingTop: space.l, paddingBottom: space.xl },
  headline: { ...type.hero, fontSize: 44, lineHeight: 48, letterSpacing: -1.6 },
  budget: { color: color.sub, fontSize: 15, marginTop: space.m },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  doors: { flexDirection: 'row', gap: space.m },
  door: {
    flex: 1,
    padding: space.l,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    backgroundColor: '#fff',
  },
  doorIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.wash, alignItems: 'center', justifyContent: 'center' },
  doorTitle: { fontFamily: font.display, fontSize: 17, color: color.ink, marginTop: space.m },
  doorBody: { fontSize: 13, color: color.sub, marginTop: 2 },
});
