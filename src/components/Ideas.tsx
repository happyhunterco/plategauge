import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { fmt } from '../nutrition';
import { useStore } from '../store';
import { color, font, space } from '../theme';
import type { Idea, Source } from '../types';
import { Button, macroLine } from './UI';

export function IdeaList({ ideas, source }: { ideas: Idea[]; source: Source }) {
  const router = useRouter();
  const stage = useStore((s) => s.stage);
  if (!ideas.length) return <Text style={styles.none}>No ideas came back. Try describing it another way.</Text>;
  return (
    <View style={{ gap: space.m }}>
      {ideas.map((i, idx) => (
        <View key={`${i.name}-${idx}`} style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.name}>{i.name}</Text>
            <Text style={styles.cal}>{fmt(i.calories)}</Text>
          </View>
          <Text style={styles.macros}>
            {i.serving}   {macroLine(i)}
          </Text>
          {i.note ? <Text style={styles.note}>{i.note}</Text> : null}
          <Button
            label="Log this"
            kind="secondary"
            icon="add"
            style={{ height: 42, marginTop: space.m, alignSelf: 'flex-start' }}
            onPress={() => {
              stage([
                {
                  name: i.where ? `${i.name} (${i.where})` : i.name,
                  serving: i.serving,
                  calories: i.calories,
                  protein: i.protein,
                  carbs: i.carbs,
                  fat: i.fat,
                  qty: 1,
                  source,
                },
              ]);
              router.push('/review');
            }}
          />
        </View>
      ))}
      <Text style={styles.disclaimer}>Numbers are estimates. Restaurant portions vary.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: space.l, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, backgroundColor: '#fff' },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: space.m },
  name: { flex: 1, fontFamily: font.display, fontSize: 17, color: color.ink },
  cal: { fontFamily: font.display, fontSize: 17, color: color.gauge, fontVariant: ['tabular-nums'] },
  macros: { fontSize: 13, color: color.sub, marginTop: 4 },
  note: { fontSize: 15, color: color.ink, marginTop: space.s, lineHeight: 21 },
  none: { color: color.sub, fontSize: 14 },
  disclaimer: { color: color.faint, fontSize: 12, textAlign: 'center' },
});
