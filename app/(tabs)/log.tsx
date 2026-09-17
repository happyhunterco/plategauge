import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FoodItem } from '../../shared/food';
import { FoodRow } from '../../src/components/FoodRow';
import { DevDataBanner, SkeletonRows, TopBar } from '../../src/components/Kit';
import { Button, Chip, Empty, ErrorNote, Field, Group, Screen, Section, Segmented } from '../../src/components/UI';
import { describeFood } from '../../src/services/ai';
import { dataMode, useFoodSearch, type Kind } from '../../src/services/foods';
import { useStore, type Meal } from '../../src/store';
import { color, space } from '../../src/theme';

type Mode = 'search' | 'type' | 'quick';

export default function Log() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: Meal; mode?: Mode; q?: string }>();
  const stage = useStore((s) => s.stage);
  const [mode, setMode] = useState<Mode>(params.mode ?? 'search');

  const pick = (items: FoodItem[], via: 'search' | 'text' | 'quick' = 'search') => {
    stage(
      items.map((item) => ({ item, qty: 1, via })),
      params.meal ?? null,
    );
    router.push('/review');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="Log" />
      <Screen top={false}>
        {params.meal ? <Text style={styles.context}>Adding to {params.meal}</Text> : null}
        <View style={{ paddingHorizontal: space.l, marginTop: space.s }}>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'search', label: 'Search' },
              { value: 'type', label: 'Describe' },
              { value: 'quick', label: 'Quick add' },
            ]}
          />
        </View>
        {mode === 'search' && <SearchMode initial={params.q ?? ''} onPick={(i) => pick([i])} onDescribe={() => setMode('type')} />}
        {mode === 'type' && <TypeMode onPick={(i) => pick(i, 'text')} />}
        {mode === 'quick' && <QuickMode onPick={(i) => pick([i], 'quick')} />}
      </Screen>
    </View>
  );
}

const KINDS: { value: Kind; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'restaurant', label: 'Restaurants' },
  { value: 'branded', label: 'Brands' },
  { value: 'generic', label: 'Basic foods' },
];

function SearchMode({ initial, onPick, onDescribe }: { initial: string; onPick: (i: FoodItem) => void; onDescribe: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);
  const [kind, setKind] = useState<Kind>('all');
  const [brand, setBrand] = useState('');
  const [showBrand, setShowBrand] = useState(false);
  const [tab, setTab] = useState<'recent' | 'saved' | 'mine'>('recent');
  const { items, loading, error, hasMore, loadMore, retry } = useFoodSearch(q, { kind, brand: brand.trim() || undefined });
  const recentSearches = useStore((s) => s.recentSearches);
  const addRecentSearch = useStore((s) => s.addRecentSearch);
  const clearRecent = useStore((s) => s.clearRecentSearches);
  const recentFoods = useStore((s) => s.recentFoods);
  const saved = useStore((s) => s.savedFoods);
  const mine = useStore((s) => s.customFoods);

  const choose = (i: FoodItem) => {
    addRecentSearch(q);
    onPick(i);
  };

  const mineMatches = q.trim().length >= 2 ? mine.filter((m) => m.name.toLowerCase().includes(q.trim().toLowerCase())) : [];
  const lists = { recent: recentFoods, saved, mine };

  return (
    <>
      {dataMode === 'development' ? <DevDataBanner text="Development data. Connect the server for USDA, Open Food Facts, Nutritionix and FatSecret." /> : null}
      {dataMode === 'open-food-facts' ? (
        <DevDataBanner text="Searching Open Food Facts only (packaged foods). Connect the server for restaurants and basic foods." />
      ) : null}
      <View style={{ paddingHorizontal: space.l, marginTop: space.m, gap: space.s }}>
        <Field
          icon="search"
          placeholder="Food, brand or restaurant"
          value={q}
          onChangeText={setQ}
          returnKeyType="search"
          onSubmitEditing={() => addRecentSearch(q)}
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search foods"
          inputMode="search"
        />
        <View style={styles.chips}>
          {KINDS.map((k) => (
            <Chip key={k.value} label={k.label} on={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
          <Chip label={brand ? `Brand: ${brand}` : 'Brand…'} icon="pricetag-outline" on={!!brand} onPress={() => setShowBrand(!showBrand)} />
        </View>
        {showBrand ? (
          <Field placeholder="Filter by brand or restaurant" value={brand} onChangeText={setBrand} autoCorrect={false} accessibilityLabel="Brand filter" />
        ) : null}
      </View>

      {q.trim().length >= 2 ? (
        <Section>
          {mineMatches.length ? (
            <View style={{ marginBottom: space.m }}>
              <Text style={styles.sub}>Your foods</Text>
              <Group>
                {mineMatches.map((m, i) => (
                  <FoodRow key={m.id} item={m} onPress={() => choose(m)} last={i === mineMatches.length - 1} />
                ))}
              </Group>
            </View>
          ) : null}
          {error ? <ErrorNote text={error} /> : null}
          {error ? <Button label="Try again" kind="ghost" onPress={retry} /> : null}
          {items.length ? (
            <Group>
              {items.map((it, i) => (
                <FoodRow key={it.id} item={it} onPress={() => choose(it)} last={i === items.length - 1} />
              ))}
            </Group>
          ) : null}
          {loading ? (
            <View style={{ marginTop: items.length ? space.m : 0 }}>
              <SkeletonRows n={items.length ? 2 : 5} />
            </View>
          ) : null}
          {hasMore && !loading ? <Button label="Load more" kind="secondary" onPress={loadMore} style={{ marginTop: space.m }} /> : null}
          {!loading && !error && !items.length && !mineMatches.length ? (
            <Empty
              icon="search-outline"
              title={`No results for “${q.trim()}”`}
              body="Try fewer words, a brand name, or add it yourself. We never guess numbers."
              action={
                <View style={{ gap: space.s, alignSelf: 'stretch' }}>
                  <Button label="Describe it instead" icon="chatbubble-ellipses-outline" kind="secondary" onPress={onDescribe} />
                  <Button label="Scan the barcode" icon="barcode-outline" kind="secondary" onPress={() => router.push('/scan?mode=barcode')} />
                  <Button
                    label="Create this food"
                    icon="create-outline"
                    kind="secondary"
                    onPress={() => router.push({ pathname: '/create-food', params: { name: q.trim() } })}
                  />
                </View>
              }
            />
          ) : null}
        </Section>
      ) : (
        <>
          {recentSearches.length ? (
            <Section
              title="Recent searches"
              action={
                <Pressable onPress={clearRecent} hitSlop={10} accessibilityRole="button">
                  <Text style={styles.link}>Clear</Text>
                </Pressable>
              }
            >
              <View style={styles.chips}>
                {recentSearches.map((r) => (
                  <Chip key={r} label={r} icon="time-outline" onPress={() => setQ(r)} />
                ))}
              </View>
            </Section>
          ) : null}
          <Section>
            <Segmented
              value={tab}
              onChange={setTab}
              options={[
                { value: 'recent', label: 'Recent' },
                { value: 'saved', label: 'Saved' },
                { value: 'mine', label: 'My foods' },
              ]}
            />
            <View style={{ marginTop: space.m }}>
              {lists[tab].length ? (
                <Group>
                  {lists[tab].map((f, i) => (
                    <FoodRow key={f.id} item={f} onPress={() => onPick(f)} last={i === lists[tab].length - 1} />
                  ))}
                </Group>
              ) : (
                <Empty
                  icon={tab === 'saved' ? 'bookmark-outline' : tab === 'mine' ? 'create-outline' : 'time-outline'}
                  title={tab === 'saved' ? 'No saved foods yet' : tab === 'mine' ? 'No custom foods yet' : 'Foods you log show up here'}
                  body={
                    tab === 'saved' ? 'Tap the bookmark on any result to keep it here.' : tab === 'mine' ? 'Create foods and recipes you eat often.' : undefined
                  }
                  action={tab === 'mine' ? <Button label="Create food" icon="add" kind="secondary" onPress={() => router.push('/create-food')} /> : undefined}
                />
              )}
            </View>
          </Section>
        </>
      )}
    </>
  );
}

function TypeMode({ onPick }: { onPick: (d: FoodItem[]) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async () => {
    setErr('');
    setBusy(true);
    try {
      const foods = await describeFood(text.trim());
      if (!foods.length) setErr('No foods found in that. Add amounts, like “2 eggs and a slice of toast.”');
      else onPick(foods);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ paddingHorizontal: space.l, marginTop: space.m }}>
      <Field
        placeholder="2 scrambled eggs, a slice of sourdough and a black coffee"
        value={text}
        onChangeText={setText}
        multiline
        style={{ minHeight: 120, alignItems: 'flex-start' }}
        accessibilityLabel="Describe what you ate"
      />
      <Text style={styles.note}>Amounts help. Results are estimates you can adjust before logging.</Text>
      {err ? <ErrorNote text={err} /> : null}
      <Button label="Estimate" icon="sparkles" onPress={run} loading={busy} disabled={text.trim().length < 3} style={{ marginTop: space.l }} />
    </View>
  );
}

function QuickMode({ onPick }: { onPick: (d: FoodItem) => void }) {
  const [name, setName] = useState('');
  const [v, setV] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const n = (s: string) => Math.max(0, parseFloat(s) || 0);
  const fields: { k: keyof typeof v; label: string }[] = [
    { k: 'calories', label: 'Calories' },
    { k: 'protein', label: 'Protein (g)' },
    { k: 'carbs', label: 'Carbs (g)' },
    { k: 'fat', label: 'Fat (g)' },
  ];
  return (
    <View style={{ paddingHorizontal: space.l, marginTop: space.m, gap: space.m }}>
      <Field label="Name (optional)" placeholder="Quick add" value={name} onChangeText={setName} />
      <View style={styles.grid}>
        {fields.map((f) => (
          <View key={f.k} style={styles.cell}>
            <Field
              label={f.label}
              inputMode="decimal"
              keyboardType="decimal-pad"
              placeholder="0"
              value={v[f.k]}
              onChangeText={(t) => setV({ ...v, [f.k]: t })}
            />
          </View>
        ))}
      </View>
      <Button
        label="Continue"
        disabled={!n(v.calories)}
        onPress={() =>
          onPick({
            id: `quick:${Date.now()}`,
            name: name.trim() || 'Quick add',
            kind: 'user',
            serving: { description: '1 entry', quantity: 1, unit: 'entry' },
            nutrients: { calories: n(v.calories), protein: n(v.protein), carbs: n(v.carbs), fat: n(v.fat), fiber: null, sugar: null, sodium: null },
            source: { provider: 'user', quality: 'user' },
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  context: { paddingHorizontal: space.l, color: color.gauge, fontWeight: '600', fontSize: 13, textTransform: 'capitalize' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  note: { color: color.sub, fontSize: 13, marginTop: space.s },
  sub: { color: color.sub, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  link: { color: color.gauge, fontWeight: '600', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  cell: { width: '47%', flexGrow: 1, minWidth: 0 },
});
