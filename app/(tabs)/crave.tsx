import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsPro } from '../../src/hooks';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { CraveResult, ExactResult } from '../../shared/crave';
import type { FitPlan } from '../../shared/customize';
import type { FoodItem, Selection } from '../../shared/food';
import type { Intent } from '../../shared/intent';
import { restaurantById } from '../../shared/restaurants';
import { categoryOf } from '../../shared/tags';
import type { Scored } from '../../shared/rank';
import { useHandoff } from '../../src/building';
import { Card, Choices, DevDataBanner, SkeletonRows, SourceLine, TopBar } from '../../src/components/Kit';
import { Button, Chip, ErrorNote, Field, macroLine, Screen, Section } from '../../src/components/UI';
import { fmt, useLeftToday } from '../../src/hooks';
import { crave, customize, dataMode } from '../../src/services/foods';
import { useStore } from '../../src/store';
import { color, font, space } from '../../src/theme';

const EXAMPLES = ['Culver’s cheeseburger', 'Olive Garden lasagna', 'Something salty and crunchy', 'Sweet and cold'];
const EMPTY_MENU: FoodItem[] = [];

export default function Crave() {
  const router = useRouter();
  const left = useLeftToday();
  const profile = useStore((s) => s.profile);
  const stage = useStore((s) => s.stage);
  const setBuild = useHandoff((s) => s.setBuild);
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<Record<string, Partial<Intent>>>({});
  const [result, setResult] = useState<CraveResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showSimilar, setShowSimilar] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const [menuQuery, setMenuQuery] = useState('');
  const [menuCategory, setMenuCategory] = useState('all');

  const prefs = { restrictions: profile?.restrictions ?? [], allergies: profile?.allergies ?? [] };
  const favorites = (profile?.favoriteRestaurants ?? []).map((id) => restaurantById(id)).filter(Boolean);

  const run = async (t = text, a = answers) => {
    if (!t.trim()) return;
    setErr('');
    setBusy(true);
    setShowSimilar(false);
    setMenuQuery('');
    setMenuCategory('all');
    try {
      setResult(await crave({ text: t.trim(), left, prefs, answers: a }));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const answer = (id: string, patch: Partial<Intent>) => {
    const next = { ...answers, [id]: patch };
    setAnswers(next);
    run(text, next);
  };

  const logItem = (item: FoodItem, changes?: string[], customization?: { title: string; selection: Selection }) => {
    stage([{ item, qty: 1, via: 'crave', changes, customization }]);
    router.push('/review');
  };

  const openExact = (ex: ExactResult, selection?: Selection) => {
    setBuild({ custom: ex.custom, selection: selection ?? ex.selection, via: 'crave' });
    router.push('/build');
  };

  const openSimilar = async (s: Scored) => {
    setOpening(s.item.id);
    try {
      setBuild({ custom: await customize(s.item, text), via: 'crave' });
      router.push('/build');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setOpening(null);
    }
  };

  const openMenuItem = async (item: FoodItem) => {
    setOpening(item.id);
    try {
      setBuild({ custom: await customize(item, item.name), via: 'crave' });
      router.push('/build');
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setOpening(null);
    }
  };

  const ex = result?.exact ?? null;
  const similarVisible = !!result && (result.showSimilar || showSimilar);
  const menu = result?.menu ?? EMPTY_MENU;
  const menuCategories = useMemo(() => [...new Set(menu.map((item) => item.category ?? categoryOf(item.name) ?? 'other'))].sort(), [menu]);
  const visibleMenu = useMemo(() => {
    const q = menuQuery.trim().toLowerCase();
    return menu.filter((item) => {
      const category = item.category ?? categoryOf(item.name) ?? 'other';
      return (menuCategory === 'all' || category === menuCategory) && (!q || `${item.name} ${item.brand ?? ''}`.toLowerCase().includes(q));
    });
  }, [menu, menuCategory, menuQuery]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <TopBar title="Crave" />
      <Screen top={false}>
        <View style={styles.hero}>
          <Text style={styles.headline} accessibilityRole="header">
            What’re ya hungry for?
          </Text>
          <Text style={styles.budget}>
            {fmt(left.calories)} cal and {fmt(left.protein)}g protein left today
          </Text>
        </View>
        {dataMode === 'development' ? (
          <DevDataBanner text="Development data: Culver’s, Olive Garden and a few snacks. Connect the server for every restaurant." />
        ) : null}

        <View style={styles.pad}>
          <Field
            icon="restaurant-outline"
            placeholder="A Culver’s double cheeseburger, no mayo"
            value={text}
            onChangeText={(t) => {
              setText(t);
              setAnswers({});
            }}
            returnKeyType="search"
            onSubmitEditing={() => run()}
            accessibilityLabel="What you're hungry for"
          />
          {!result && !busy ? (
            <View style={styles.chips}>
              {favorites.map((r) => (
                <Chip key={r!.id} label={r!.name} icon="star-outline" onPress={() => setText(`${r!.name} `)} />
              ))}
              {EXAMPLES.map((e) => (
                <Chip
                  key={e}
                  label={e}
                  onPress={() => {
                    setText(e);
                    run(e, {});
                  }}
                />
              ))}
            </View>
          ) : null}
          {err ? <ErrorNote text={err} /> : null}
          <Button label="Find it" icon="search" onPress={() => run()} loading={busy} disabled={!text.trim()} />
        </View>

        {busy ? (
          <Section>
            <SkeletonRows n={3} />
          </Section>
        ) : null}

        {result && !busy ? (
          <>
            {result.question ? (
              <Section>
                <Choices
                  prompt={result.question.prompt}
                  options={result.question.options.map((o) => o.label)}
                  onPick={(i) => answer(result.question!.id, result.question!.options[i].patch)}
                />
              </Section>
            ) : null}

            {menu.length ? (
              <Section title={`${result.intent.restaurantName} menu`}>
                <View style={{ gap: space.m }}>
                  <Field
                    icon="search"
                    placeholder={`Search ${result.intent.restaurantName ?? 'the'} menu`}
                    value={menuQuery}
                    onChangeText={setMenuQuery}
                    accessibilityLabel="Search restaurant menu"
                  />
                  <View style={styles.chips}>
                    <Chip label="All" on={menuCategory === 'all'} onPress={() => setMenuCategory('all')} />
                    {menuCategories.map((category) => (
                      <Chip
                        key={category}
                        label={category.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())}
                        on={menuCategory === category}
                        onPress={() => setMenuCategory(category)}
                      />
                    ))}
                  </View>
                  <Text style={styles.muted}>
                    {visibleMenu.length} menu item{visibleMenu.length === 1 ? '' : 's'}
                  </Text>
                  {visibleMenu.length ? (
                    <View style={{ gap: space.m }}>
                      {visibleMenu.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          left={left}
                          loading={opening === item.id}
                          onLog={() => logItem(item)}
                          onCustomize={() => openMenuItem(item)}
                        />
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.muted}>No menu items match that search.</Text>
                  )}
                </View>
              </Section>
            ) : null}

            {result.notFound ? (
              <Section>
                <Card>
                  <Text style={styles.cardTitle}>{result.notFound}</Text>
                  <Text style={styles.muted}>Try the exact menu name, or log it another way. We won’t make up the numbers.</Text>
                  <View style={styles.rowBtns}>
                    <Button
                      label="Search"
                      kind="secondary"
                      icon="search"
                      onPress={() => router.navigate({ pathname: '/log', params: { q: result.intent.food } })}
                      style={styles.smallBtn}
                    />
                    <Button
                      label="Describe it"
                      kind="secondary"
                      icon="chatbubble-ellipses-outline"
                      onPress={() => router.navigate({ pathname: '/log', params: { mode: 'type' } })}
                      style={styles.smallBtn}
                    />
                  </View>
                </Card>
              </Section>
            ) : null}

            {ex ? (
              <Section title="Exact match">
                <ExactCard
                  ex={ex}
                  left={left}
                  onLog={() =>
                    logItem(
                      { ...ex.item, nutrients: ex.computed.nutrients, source: { ...ex.item.source, quality: ex.computed.quality } },
                      ex.computed.summary,
                      { title: ex.custom.title, selection: ex.selection },
                    )
                  }
                  onCustomize={() => openExact(ex)}
                />
              </Section>
            ) : null}

            {ex && !ex.fitsAsIs && ex.plans.length ? (
              <Section title="Make it fit">
                <View style={{ gap: space.m }}>
                  {ex.plans.map((p) => (
                    <PlanCard
                      key={p.id}
                      plan={p}
                      left={left}
                      onLog={() =>
                        logItem(
                          { ...ex.item, nutrients: p.computed.nutrients, source: { ...ex.item.source, quality: p.computed.quality } },
                          p.computed.summary,
                          { title: ex.custom.title, selection: p.selection },
                        )
                      }
                      onCustomize={() => openExact(ex, p.selection)}
                    />
                  ))}
                </View>
              </Section>
            ) : null}
            {ex && !ex.fitsAsIs && !ex.plans.length ? (
              <Section>
                <Text style={styles.muted}>
                  No change we know of gets this under what’s left today. Similar options are below, or you can still log it as ordered.
                </Text>
              </Section>
            ) : null}

            {similarVisible && result.similar.length ? (
              <Section title={ex ? 'Similar options' : 'Matches your craving'}>
                <View style={{ gap: space.m }}>
                  {result.similar.map((s) => (
                    <SimilarCard
                      key={s.item.id}
                      s={s}
                      left={left}
                      loading={opening === s.item.id}
                      onLog={() => logItem(s.item)}
                      onCustomize={() => openSimilar(s)}
                    />
                  ))}
                </View>
              </Section>
            ) : null}
            {!similarVisible && result.similar.length ? (
              <Section>
                <Button label="Show similar options" kind="ghost" icon="chevron-down" onPress={() => setShowSimilar(true)} />
              </Section>
            ) : null}
            {!result.exact && !result.similar.length && !result.question && !result.notFound ? (
              <Section>
                <Text style={styles.muted}>Nothing matched yet. Try naming a food or a restaurant.</Text>
              </Section>
            ) : null}
            {result.blocked.length ? (
              <Section>
                <Text style={styles.muted}>
                  {result.blocked.length} option{result.blocked.length > 1 ? 's were' : ' was'} hidden for your dietary settings.
                </Text>
              </Section>
            ) : null}
          </>
        ) : null}

        <Section title="Eating in?">
          <Card onPress={() => router.push({ pathname: '/kitchen', params: { q: text } })} label="Cook with what you have">
            <View style={styles.door}>
              <Ionicons name="basket-outline" size={22} color={color.ink} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Cook with what you have</Text>
                <Text style={styles.muted}>Meals from your pantry that fit today</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={color.faint} />
            </View>
          </Card>
        </Section>
      </Screen>
    </View>
  );
}

type Left = { calories: number; protein: number; carbs: number; fat: number };

function FitLine({ cal, left }: { cal: number; left: Left }) {
  const after = left.calories - cal;
  return (
    <Text style={[styles.fit, after < -50 && { color: color.needle }]}>
      {after >= -50 ? `Fits. ${fmt(Math.max(after, 0))} cal left after` : `${fmt(-after)} cal over what’s left`}
    </Text>
  );
}

function ExactCard({ ex, left, onLog, onCustomize }: { ex: ExactResult; left: Left; onLog: () => void; onCustomize: () => void }) {
  const n = ex.computed.nutrients;
  return (
    <Card style={styles.exact}>
      <View style={styles.badgeRow}>
        <View style={styles.exactBadge}>
          <Ionicons name="checkmark" size={12} color="#fff" />
          <Text style={styles.exactBadgeText}>Exact match</Text>
        </View>
      </View>
      <Text style={styles.itemName}>{ex.item.name}</Text>
      {ex.computed.summary.length ? <Text style={styles.changes}>{ex.computed.summary.join(', ')}</Text> : null}
      <View style={styles.numbers}>
        <Text style={styles.bigCal}>
          {fmt(n.calories)}
          <Text style={styles.unit}> cal</Text>
        </Text>
        <Text style={styles.muted}>
          {macroLine(n)}
          {n.sodium != null ? `   ${fmt(n.sodium)}mg sodium` : ''}
        </Text>
      </View>
      <SourceLine
        source={{ ...ex.item.source, quality: ex.computed.quality }}
        serving={ex.item.serving.description}
        label={ex.item.brand}
        showProvider={false}
      />
      <FitLine cal={n.calories} left={left} />
      {ex.conflict ? <Text style={styles.warn}>{ex.conflict}. Check ingredients with the restaurant.</Text> : null}
      <View style={styles.rowBtns}>
        <Button
          label={ex.fitsAsIs ? 'Log this' : 'Log as ordered'}
          icon="add"
          kind={ex.fitsAsIs ? 'primary' : 'secondary'}
          onPress={onLog}
          style={styles.smallBtn}
        />
        <Button label="Customize" icon="options-outline" kind="secondary" onPress={onCustomize} style={styles.smallBtn} />
      </View>
    </Card>
  );
}

function PlanCard({ plan, left, onLog, onCustomize }: { plan: FitPlan; left: Left; onLog: () => void; onCustomize: () => void }) {
  const n = plan.computed.nutrients;
  return (
    <Card>
      <Text style={styles.itemName}>{plan.title}</Text>
      <View style={{ gap: 4, marginTop: 6 }}>
        {plan.changes.map((c) => (
          <Text key={`${c.groupId}${c.value}`} style={styles.why}>
            • {c.label}: {c.why}
          </Text>
        ))}
      </View>
      <Text style={[styles.bigCal, { fontSize: 22, marginTop: space.s }]}>
        {fmt(n.calories)}
        <Text style={styles.unit}> cal {macroLine(n)}</Text>
      </Text>
      <FitLine cal={n.calories} left={left} />
      {plan.computed.estimated ? <Text style={styles.est}>Includes estimated values</Text> : null}
      <View style={styles.rowBtns}>
        <Button label="Log this version" icon="add" onPress={onLog} style={styles.smallBtn} />
        <Button label="Adjust" icon="options-outline" kind="secondary" onPress={onCustomize} style={styles.smallBtn} />
      </View>
    </Card>
  );
}

function SimilarCard({ s, left, loading, onLog, onCustomize }: { s: Scored; left: Left; loading: boolean; onLog: () => void; onCustomize: () => void }) {
  const n = s.item.nutrients;
  return (
    <Card>
      <View style={styles.simHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.itemName}>{s.item.name}</Text>
        </View>
        <Text style={styles.simCal}>{fmt(n.calories)}</Text>
      </View>
      <Text style={styles.muted}>{macroLine(n)}</Text>
      {s.reasons.length ? <Text style={styles.reasons}>{s.reasons.slice(0, 3).join(' · ')}</Text> : null}
      <SourceLine source={s.item.source} serving={s.item.serving.description} label={s.item.brand} showProvider={false} />
      <FitLine cal={n.calories} left={left} />
      <View style={styles.rowBtns}>
        <Button label="Log" icon="add" kind="secondary" onPress={onLog} style={styles.smallBtn} />
        <Button label="Customize" icon="options-outline" kind="secondary" loading={loading} onPress={onCustomize} style={styles.smallBtn} />
      </View>
    </Card>
  );
}

function MenuItemCard({
  item,
  left,
  loading,
  onLog,
  onCustomize,
}: {
  item: FoodItem;
  left: Left;
  loading: boolean;
  onLog: () => void;
  onCustomize: () => void;
}) {
  return (
    <Card>
      <View style={styles.simHead}>
        <Text style={[styles.itemName, { flex: 1 }]}>{item.name}</Text>
        <Text style={styles.simCal}>{fmt(item.nutrients.calories)}</Text>
      </View>
      <Text style={styles.muted}>{macroLine(item.nutrients)}</Text>
      <SourceLine source={item.source} serving={item.serving.description} label={item.brand} showProvider={false} />
      <FitLine cal={item.nutrients.calories} left={left} />
      <View style={styles.rowBtns}>
        <Button label="Log" icon="add" kind="secondary" onPress={onLog} style={styles.smallBtn} />
        <Button label="Customize" icon="options-outline" kind="secondary" loading={loading} onPress={onCustomize} style={styles.smallBtn} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { paddingHorizontal: space.l, paddingTop: space.s, paddingBottom: space.m },
  headline: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 34, letterSpacing: -1, color: color.ink },
  budget: { color: color.sub, fontSize: 14, marginTop: 4 },
  pad: { paddingHorizontal: space.l, gap: space.m, marginTop: space.s },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  cardTitle: { fontFamily: font.display, fontSize: 16, color: color.ink },
  muted: { fontSize: 13, color: color.sub, marginTop: 2, lineHeight: 18 },
  rowBtns: { flexDirection: 'row', gap: space.s, marginTop: space.m, flexWrap: 'wrap' },
  smallBtn: { height: 44, paddingHorizontal: space.m, flexGrow: 1 },
  exact: { borderColor: color.gauge, borderWidth: 1.5 },
  badgeRow: { flexDirection: 'row', marginBottom: 6 },
  exactBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: color.gauge, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  exactBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  itemName: { fontFamily: font.display, fontSize: 18, color: color.ink },
  changes: { fontSize: 13, color: color.ink, marginTop: 4 },
  numbers: { marginTop: space.s },
  bigCal: { fontFamily: font.displayBold, fontSize: 30, color: color.ink, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: font.displayMed, fontSize: 14, color: color.sub },
  fit: { fontSize: 13, fontWeight: '600', color: color.gauge, marginTop: 6 },
  warn: { fontSize: 13, color: color.danger, marginTop: 6 },
  why: { fontSize: 13, color: color.ink, lineHeight: 18 },
  est: { fontSize: 11, color: '#9A5B00', marginTop: 4 },
  simHead: { flexDirection: 'row', gap: space.m, alignItems: 'flex-start' },
  simCal: { fontFamily: font.display, fontSize: 18, color: color.gauge },
  reasons: { fontSize: 12, color: color.ink, marginTop: 4 },
  door: { flexDirection: 'row', alignItems: 'center', gap: space.m },
});
