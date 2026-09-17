import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { FoodItem } from '../shared/food';
import { categoryOf } from '../shared/tags';
import { useHandoff } from '../src/building';
import { QualityBadge } from '../src/components/Kit';
import { Button, ErrorNote, Field, Screen } from '../src/components/UI';
import { newId } from '../src/ids';
import { useStore } from '../src/store';
import { color, space } from '../src/theme';

const blank = { name: '', brand: '', serving: '1 serving', grams: '', calories: '', protein: '', carbs: '', fat: '', fiber: '', sugar: '', sodium: '' };

export default function CreateFood() {
  const router = useRouter();
  const params = useLocalSearchParams<{ name?: string }>();
  const setPrefill = useHandoff((s) => s.setLabelPrefill);
  const addCustom = useStore((s) => s.addCustomFood);
  const stage = useStore((s) => s.stage);
  // Label scans and unknown barcodes hand their values over once, when the screen opens.
  const [initial] = useState(() => {
    const p = useHandoff.getState().labelPrefill;
    const n = p?.nutrients;
    const s = (x: number | null | undefined) => (x == null ? '' : String(x));
    return {
      fromLabel: !!n,
      code: p?.code ?? '',
      v: {
        ...blank,
        name: p?.name ?? params.name ?? '',
        brand: p?.brand ?? '',
        serving: p?.serving ?? blank.serving,
        grams: s(p?.grams),
        ...(n
          ? { calories: s(n.calories), protein: s(n.protein), carbs: s(n.carbs), fat: s(n.fat), fiber: s(n.fiber), sugar: s(n.sugar), sodium: s(n.sodium) }
          : {}),
      },
    };
  });
  const [v, setV] = useState(initial.v);
  const code = initial.code;
  const fromLabel = initial.fromLabel;
  const [err, setErr] = useState('');

  useEffect(() => () => setPrefill(null), [setPrefill]);

  const set = (k: keyof typeof v) => (t: string) => setV({ ...v, [k]: t });
  const num = (s: string) => (s.trim() === '' ? null : Math.max(0, parseFloat(s) || 0));

  const save = (andLog: boolean) => {
    if (!v.name.trim()) return setErr('Give it a name.');
    if (num(v.calories) == null) return setErr('Calories are required.');
    const item: FoodItem = {
      id: newId('user'),
      name: v.name.trim(),
      brand: v.brand.trim() || null,
      kind: 'user',
      category: categoryOf(v.name),
      serving: { description: v.serving.trim() || '1 serving', quantity: 1, unit: 'serving', grams: num(v.grams) },
      nutrients: {
        calories: num(v.calories)!,
        protein: num(v.protein) ?? 0,
        carbs: num(v.carbs) ?? 0,
        fat: num(v.fat) ?? 0,
        fiber: num(v.fiber),
        sugar: num(v.sugar),
        sodium: num(v.sodium),
      },
      barcode: code || null,
      source: { provider: 'user', quality: 'user' },
    };
    addCustom(item);
    if (andLog) {
      stage([{ item, qty: 1, via: 'custom' }]);
      router.replace('/review');
    } else router.back();
  };

  const macro: { k: keyof typeof v; label: string; unit: string }[] = [
    { k: 'calories', label: 'Calories', unit: '' },
    { k: 'protein', label: 'Protein', unit: 'g' },
    { k: 'carbs', label: 'Carbs', unit: 'g' },
    { k: 'fat', label: 'Fat', unit: 'g' },
    { k: 'fiber', label: 'Fiber', unit: 'g' },
    { k: 'sugar', label: 'Sugar', unit: 'g' },
    { k: 'sodium', label: 'Sodium', unit: 'mg' },
  ];

  return (
    <Screen top={false}>
      <View style={styles.pad}>
        {fromLabel ? (
          <View style={styles.banner}>
            <QualityBadge quality="user" small />
            <Text style={styles.bannerText}>Read from your label photo. Check each number before saving.</Text>
          </View>
        ) : null}
        {code ? <Text style={styles.sub}>Barcode {code}</Text> : null}
        <Field label="Name" value={v.name} onChangeText={set('name')} placeholder="Protein cookie" returnKeyType="next" />
        <Field label="Brand (optional)" value={v.brand} onChangeText={set('brand')} />
        <View style={styles.row}>
          <Field label="Serving" value={v.serving} onChangeText={set('serving')} style={{ flex: 2 }} />
          <Field label="Grams" value={v.grams} onChangeText={set('grams')} inputMode="decimal" keyboardType="decimal-pad" style={{ flex: 1 }} suffix="g" />
        </View>
        <Text style={styles.section}>Per serving</Text>
        <View style={styles.grid}>
          {macro.map((m) => (
            <View key={m.k} style={styles.cell}>
              <Field
                label={m.label + (m.k === 'calories' ? '' : ' (optional)')}
                value={v[m.k]}
                onChangeText={set(m.k)}
                inputMode="decimal"
                keyboardType="decimal-pad"
                suffix={m.unit}
                placeholder={m.k === 'calories' ? '0' : '—'}
              />
            </View>
          ))}
        </View>
        {err ? <ErrorNote text={err} /> : null}
        <Button label="Save and log" icon="checkmark" onPress={() => save(true)} style={{ marginTop: space.m }} />
        <Button label="Save to my foods" kind="secondary" onPress={() => save(false)} />
        {!fromLabel ? (
          <Button
            label="Scan a nutrition label"
            icon="camera-outline"
            kind="ghost"
            onPress={() => router.replace({ pathname: '/scan', params: { mode: 'label', code } })}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.m, paddingTop: space.m },
  row: { flexDirection: 'row', gap: space.m },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  cell: { width: '47%', flexGrow: 1, minWidth: 0 },
  section: { fontSize: 15, fontWeight: '700', color: color.ink, marginTop: space.s },
  sub: { fontSize: 13, color: color.sub },
  banner: { flexDirection: 'row', gap: space.s, alignItems: 'center', backgroundColor: color.wash, padding: space.m, borderRadius: 12 },
  bannerText: { fontSize: 13, color: color.ink, flex: 1 },
});
