import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { scoreWord } from '../shared/productScore';
import { useHandoff } from '../src/building';
import { Card, SourceLine } from '../src/components/Kit';
import { Totals } from '../src/components/Totals';
import { Button, Empty, Screen, Section, Stepper } from '../src/components/UI';
import { fmt, useLeftToday } from '../src/hooks';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

export default function Product() {
  const router = useRouter();
  const product = useHandoff((s) => s.product);
  const setLabelPrefill = useHandoff((s) => s.setLabelPrefill);
  const stage = useStore((s) => s.stage);
  const saved = useStore((s) => (product?.item ? s.savedFoods.some((f) => f.id === product.item!.id) : false));
  const toggleSaved = useStore((s) => s.toggleSaved);
  const left = useLeftToday();
  const [qty, setQty] = useState(1);

  if (!product)
    return (
      <Screen top={false}>
        <Empty icon="barcode-outline" title="No product" action={<Button label="Scan" onPress={() => router.replace('/scan?mode=barcode')} />} />
      </Screen>
    );

  if (product.status === 'not_found' || !product.item) {
    return (
      <Screen top={false}>
        <Empty
          icon="help-circle-outline"
          title="Product not found"
          body={`Barcode ${product.code} isn’t in the connected food databases yet. Add it once and it’s saved to your foods.`}
        />
        <View style={styles.pad}>
          <Button
            label="Scan the nutrition label"
            icon="document-text-outline"
            onPress={() => router.replace({ pathname: '/scan', params: { mode: 'label', code: product.code } })}
          />
          <Button
            label="Enter it by hand"
            icon="create-outline"
            kind="secondary"
            onPress={() => {
              setLabelPrefill({ code: product.code });
              router.replace('/create-food');
            }}
          />
          <Button label="Search instead" icon="search" kind="secondary" onPress={() => router.replace('/log')} />
          <Button label="Scan another" icon="barcode-outline" kind="ghost" onPress={() => router.replace('/scan?mode=barcode')} />
        </View>
      </Screen>
    );
  }

  const it = product.item;
  const s = product.score;
  const n = it.nutrients;
  const scaled = {
    ...n,
    calories: n.calories * qty,
    protein: n.protein * qty,
    carbs: n.carbs * qty,
    fat: n.fat * qty,
    sodium: n.sodium == null ? null : n.sodium * qty,
  };
  const tone = s?.score == null ? color.faint : s.score >= 7 ? '#1C8C5E' : s.score >= 4 ? color.needle : color.danger;

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Screen top={false}>
        <View style={styles.pad}>
          <View style={styles.head}>
            {it.image ? (
              <Image source={{ uri: it.image }} style={styles.img} accessibilityIgnoresInvertColors />
            ) : (
              <View style={[styles.img, styles.imgEmpty]}>
                <Ionicons name="cube-outline" size={28} color={color.faint} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name}>{it.name}</Text>
              {it.brand ? <Text style={styles.brand}>{it.brand}</Text> : null}
              <Text style={styles.code}>Barcode {product.code}</Text>
            </View>
          </View>
          <SourceLine source={it.source} serving={it.serving.description} />
          {it.image && it.source.provider === 'off' ? <Text style={styles.credit}>Photo: Open Food Facts contributors, CC BY-SA</Text> : null}
        </View>

        <Section title="Label Score">
          <Card>
            {s?.score != null ? (
              <>
                <View style={styles.scoreRow}>
                  <Text style={[styles.score, { color: tone }]}>{s.score % 1 ? s.score.toFixed(1) : s.score}</Text>
                  <Text style={styles.outOf}>/10</Text>
                  <Text style={[styles.word, { color: tone }]}>{scoreWord(s.score)}</Text>
                </View>
                <View style={{ gap: 8, marginTop: space.m }}>
                  {s.parts.map((p) => (
                    <View key={p.id} style={styles.part}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.partLabel}>{p.label}</Text>
                        <Text style={styles.partDetail}>{p.detail}</Text>
                      </View>
                      <Text style={styles.partPts}>
                        {p.points}/{p.max}
                      </Text>
                    </View>
                  ))}
                </View>
                {s.notes.length ? <Text style={styles.notes}>{s.notes.join('  ·  ')}</Text> : null}
                {s.missing.length ? <Text style={styles.fine}>Not scored: {s.missing.join(', ').toLowerCase()} (not listed for this product).</Text> : null}
              </>
            ) : (
              <Text style={styles.fine}>Not enough label data to score this product. Nutrition below is still from the database.</Text>
            )}
            <Text style={styles.fine}>
              Based on Nutri-Score, processing level and additives from Open Food Facts. It describes the product, not your whole day.
            </Text>
          </Card>
        </Section>

        <Section title="How much?">
          <View style={styles.qtyRow}>
            <Text style={styles.brand}>{it.serving.description} per serving</Text>
            <Stepper value={qty} onChange={setQty} step={qty < 2 ? 0.25 : 0.5} />
          </View>
          <View style={{ marginTop: space.m }}>
            <Totals n={scaled} left={left} />
          </View>
          {n.sugar != null || n.fiber != null ? (
            <Text style={styles.fine}>
              {[n.fiber != null ? `${fmt(n.fiber * qty)}g fiber` : null, n.sugar != null ? `${fmt(n.sugar * qty)}g sugar` : null].filter(Boolean).join('   ')}
            </Text>
          ) : null}
        </Section>

        <View style={[styles.pad, { marginTop: space.xl }]}>
          <Button
            label="Log it"
            icon="checkmark"
            disabled={qty <= 0}
            onPress={() => {
              stage([{ item: it, qty, via: 'barcode', score: s }]);
              router.replace('/review');
            }}
          />
          <Button
            label={saved ? 'Saved to your foods' : 'Save to your foods'}
            icon={saved ? 'bookmark' : 'bookmark-outline'}
            kind="secondary"
            onPress={() => toggleSaved(it)}
          />
          <Button label="Scan another" icon="barcode-outline" kind="ghost" onPress={() => router.replace('/scan?mode=barcode')} />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l, gap: space.s },
  head: { flexDirection: 'row', gap: space.m, alignItems: 'center', paddingTop: space.m },
  img: { width: 72, height: 72, borderRadius: 14, backgroundColor: color.wash },
  imgEmpty: { alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.displayBold, fontSize: 21, color: color.ink },
  brand: { fontSize: 14, color: color.sub },
  code: { fontSize: 12, color: color.faint, marginTop: 2 },
  credit: { fontSize: 11, color: color.faint },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  score: { fontFamily: font.displayBold, fontSize: 48, letterSpacing: -1 },
  outOf: { fontFamily: font.displayMed, fontSize: 18, color: color.sub },
  word: { fontFamily: font.display, fontSize: 18, marginLeft: space.m },
  part: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  partLabel: { fontSize: 14, fontWeight: '600', color: color.ink },
  partDetail: { fontSize: 13, color: color.sub },
  partPts: { fontFamily: font.displayMed, fontSize: 14, color: color.ink },
  notes: { fontSize: 13, color: color.ink, marginTop: space.m },
  fine: { fontSize: 12, color: color.sub, marginTop: space.s, lineHeight: 17 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.m },
});
