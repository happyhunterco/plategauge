import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SourceLine, showUndo } from '../src/components/Kit';
import { AmountStepper, Button, Empty, Field, Screen, Segmented, macroLine } from '../src/components/UI';
import { timeOf } from '../src/dates';
import { fmt } from '../src/hooks';
import { pushEntry, removeEntryRemote } from '../src/services/sync';
import { useStore, type Meal } from '../src/store';
import { color, font, space } from '../src/theme';

export default function EntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const entry = useStore((s) => s.entries.find((e) => e.id === id));
  const updateEntry = useStore((s) => s.updateEntry);
  const removeEntry = useStore((s) => s.removeEntry);
  const restore = useStore((s) => s.restoreEntry);
  const [qty, setQty] = useState(entry?.qty ?? 1);
  const [meal, setMeal] = useState<Meal>(entry?.meal ?? 'snack');
  const [name, setName] = useState(entry?.name ?? '');

  if (!entry)
    return (
      <Screen top={false}>
        <Empty icon="trash-outline" title="This entry was removed" action={<Button label="Close" onPress={() => router.back()} />} />
      </Screen>
    );

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        <Field label="Name" value={name} onChangeText={setName} />
        <SourceLine source={entry.source} serving={`${entry.serving} per serving`} />
        {entry.changes?.length ? <Text style={styles.meta}>Changes: {entry.changes.join(', ')}</Text> : null}
        <Text style={styles.meta}>Logged {timeOf(entry.createdAt)}</Text>
        <Text style={styles.label}>Meal</Text>
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
        <View style={styles.row}>
          <View>
            <AmountStepper value={qty} onChange={setQty} serving={entry.serving} gramsPerServing={null} />
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.cal}>{fmt(entry.nutrients.calories * qty)}</Text>
            <Text style={styles.meta}>{macroLine(entry.nutrients, qty)}</Text>
          </View>
        </View>
        <Button
          label="Save changes"
          style={{ marginTop: space.xl }}
          disabled={qty <= 0}
          onPress={() => {
            updateEntry(entry.id, { qty, meal, name: name.trim() || entry.name });
            const e = useStore.getState().entries.find((x) => x.id === entry.id);
            if (e) pushEntry(e).catch(() => {});
            router.back();
          }}
        />
        <Button
          label="Delete entry"
          kind="ghost"
          onPress={() => {
            const removed = removeEntry(entry.id);
            removeEntryRemote(entry.id).catch(() => {});
            router.back();
            if (removed) showUndo(`Removed ${removed.name}`, () => restore(removed));
          }}
          style={{ marginTop: space.s }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.s, paddingTop: space.m },
  meta: { fontSize: 13, color: color.sub },
  label: { fontSize: 13, color: color.sub, marginTop: space.m, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cal: { fontFamily: font.displayBold, fontSize: 26, color: color.ink },
});
