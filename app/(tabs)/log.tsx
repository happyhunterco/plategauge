import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { parseText, searchPackaged } from '../../src/api';
import { Button, ErrorNote, Field, Group, Row, Screen, Section, Segmented, macroLine } from '../../src/components/UI';
import { COMMON, searchCommon } from '../../src/foods';
import { fmt } from '../../src/nutrition';
import { useStore } from '../../src/store';
import { color, space } from '../../src/theme';
import type { Draft, Meal } from '../../src/types';

type NewDraft = Omit<Draft, 'key'>;

export default function Log() {
  const router = useRouter();
  const params = useLocalSearchParams<{ meal?: Meal }>();
  const stage = useStore((s) => s.stage);
  const recent = useStore((s) => s.recent);
  const [mode, setMode] = useState<'search' | 'type' | 'quick'>('search');

  const pick = (d: NewDraft | NewDraft[]) => {
    stage(Array.isArray(d) ? d : [d], params.meal ?? null);
    router.push('/review');
  };

  return (
    <Screen title="Log" subtitle="Search a food or just describe what you ate">
      <View style={{ paddingHorizontal: space.l, marginTop: space.m }}>
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
      {mode === 'search' && <SearchMode onPick={pick} recent={recent} />}
      {mode === 'type' && <TypeMode onPick={pick} />}
      {mode === 'quick' && <QuickMode onPick={pick} />}
    </Screen>
  );
}

function SearchMode({ onPick, recent }: { onPick: (d: NewDraft) => void; recent: Draft[] }) {
  const [q, setQ] = useState('');
  const [packaged, setPackaged] = useState<NewDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const common = useMemo(() => searchCommon(q).map((c) => ({ ...c, qty: 1, source: 'search' as const })), [q]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 3) {
      setPackaged([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        setPackaged(await searchPackaged(term, ctrl.signal));
      } catch {
        if (!ctrl.signal.aborted) setPackaged([]);
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 450);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const list = (title: string, items: NewDraft[]) =>
    items.length ? (
      <Section title={title}>
        <Group>
          {items.map((d, i) => (
            <Row
              key={`${d.name}-${d.brand ?? ''}-${i}`}
              title={d.name}
              detail={`${d.brand ? `${d.brand}, ` : ''}${d.serving}   ${macroLine(d)}`}
              value={fmt(d.calories)}
              onPress={() => onPick(d)}
              last={i === items.length - 1}
            />
          ))}
        </Group>
      </Section>
    ) : null;

  return (
    <>
      <View style={{ paddingHorizontal: space.l, marginTop: space.m }}>
        <Field
          icon="search"
          placeholder="Chicken breast, oats, Kind bar…"
          value={q}
          onChangeText={setQ}
          autoFocus={false}
          returnKeyType="search"
          autoCorrect={false}
          clearButtonMode="while-editing"
          accessibilityLabel="Search foods"
        />
      </View>
      {q.trim() ? (
        <>
          {list('Foods', common)}
          {loading && <ActivityIndicator style={{ marginTop: space.xl }} color={color.gauge} />}
          {list('Packaged', packaged)}
          {!loading && !common.length && !packaged.length && q.trim().length >= 3 && (
            <Text style={[styles.note, { paddingHorizontal: space.l }]}>No match. Try Describe and type it the way you’d say it.</Text>
          )}
        </>
      ) : recent.length ? (
        list('Recent', recent.map(({ key: _k, ...r }) => r))
      ) : (
        list('Popular', COMMON.slice(0, 8).map((c) => ({ ...c, qty: 1, source: 'search' as const })))
      )}
    </>
  );
}

function TypeMode({ onPick }: { onPick: (d: NewDraft[]) => void }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async () => {
    setErr('');
    setBusy(true);
    try {
      const foods = await parseText(text.trim());
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
      <Text style={styles.note}>Amounts help. We’ll break it into items you can adjust.</Text>
      {err ? <ErrorNote text={err} /> : null}
      <Button label="Estimate" icon="sparkles" onPress={run} loading={busy} disabled={text.trim().length < 3} style={{ marginTop: space.l }} />
    </View>
  );
}

function QuickMode({ onPick }: { onPick: (d: NewDraft) => void }) {
  const [name, setName] = useState('');
  const [v, setV] = useState({ calories: '', protein: '', carbs: '', fat: '' });
  const n = (s: string) => Math.max(0, parseFloat(s) || 0);
  const fields: { k: keyof typeof v; label: string }[] = [
    { k: 'calories', label: 'Calories' },
    { k: 'protein', label: 'Protein g' },
    { k: 'carbs', label: 'Carbs g' },
    { k: 'fat', label: 'Fat g' },
  ];
  return (
    <View style={{ paddingHorizontal: space.l, marginTop: space.m, gap: space.m }}>
      <Field placeholder="Name (optional)" value={name} onChangeText={setName} accessibilityLabel="Food name" />
      <View style={styles.grid}>
        {fields.map((f) => (
          <View key={f.k} style={styles.cell}>
            <Text style={styles.cellLabel}>{f.label}</Text>
            <Field
              keyboardType="decimal-pad"
              placeholder="0"
              value={v[f.k]}
              onChangeText={(t) => setV({ ...v, [f.k]: t })}
              accessibilityLabel={f.label}
            />
          </View>
        ))}
      </View>
      <Button
        label="Continue"
        disabled={!n(v.calories)}
        onPress={() =>
          onPick({
            name: name.trim() || 'Quick add',
            serving: '1 serving',
            calories: n(v.calories),
            protein: n(v.protein),
            carbs: n(v.carbs),
            fat: n(v.fat),
            qty: 1,
            source: 'quick',
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  note: { color: color.sub, fontSize: 13, marginTop: space.s, paddingHorizontal: 2, textAlign: 'left' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  cell: { width: '47%', flexGrow: 1 },
  cellLabel: { fontSize: 13, color: color.sub, marginBottom: 6 },
});
