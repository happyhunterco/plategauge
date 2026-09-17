import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { compute, defaultSelection } from '../shared/customize';
import { BuildControls } from '../src/components/BuildControls';
import { SourceLine } from '../src/components/Kit';
import { Totals } from '../src/components/Totals';
import { Button, Empty, Screen } from '../src/components/UI';
import { useHandoff } from '../src/building';
import { useLeftToday } from '../src/hooks';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';
import { CONTENT } from '../src/layout';

export default function Build() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const build = useHandoff((s) => s.build);
  const stage = useStore((s) => s.stage);
  const left = useLeftToday();
  const [sel, setSel] = useState(build?.selection ?? (build ? defaultSelection(build.custom) : {}));

  if (!build)
    return (
      <Screen top={false}>
        <Empty icon="construct-outline" title="Nothing to build" action={<Button label="Back" onPress={() => router.back()} />} />
      </Screen>
    );
  const { custom } = build;
  const out = compute(custom, sel);
  const it = custom.item;

  const log = () => {
    const changes = out.summary;
    stage(
      [
        {
          item: {
            ...it,
            id: changes.length ? `${it.id}#${changes.join('|')}` : it.id,
            name: it.name,
            serving: { ...it.serving, description: changes.length ? `${it.serving.description}, customized` : it.serving.description },
            nutrients: out.nutrients,
            source: { ...it.source, quality: out.quality },
          },
          qty: 1,
          via: build.via,
          changes,
          customization: { title: custom.title, selection: sel },
        },
      ],
      build.meal ?? null,
    );
    router.push('/review');
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen options={{ title: custom.title }} />
      <Screen top={false}>
        <View style={styles.pad}>
          <Text style={styles.name}>{it.name}</Text>
          {it.brand ? <Text style={styles.brand}>{it.brand}</Text> : null}
          <SourceLine source={it.source} serving={it.serving.description} />
          {custom.note ? <Text style={styles.note}>{custom.note}</Text> : null}
          <View style={{ marginTop: space.xl }}>
            <BuildControls custom={custom} selection={sel} onChange={setSel} />
          </View>
          {out.summary.length ? <Text style={styles.summary}>Your changes: {out.summary.join(', ')}</Text> : null}
          <View style={{ height: 150 }} />
        </View>
      </Screen>
      <View style={[styles.footer, { paddingBottom: insets.bottom + space.m }]}>
        <View style={{ width: '100%', maxWidth: CONTENT }}>
          <Totals n={out.nutrients} left={left} estimated={out.estimated} />
          <Button label="Log this" icon="checkmark" onPress={log} style={{ marginTop: space.m }} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { paddingHorizontal: space.l },
  name: { fontFamily: font.displayBold, fontSize: 24, color: color.ink, letterSpacing: -0.4 },
  brand: { fontSize: 15, color: color.sub, marginTop: 2 },
  note: { fontSize: 13, color: color.sub, marginTop: space.m, lineHeight: 18 },
  summary: { fontSize: 13, color: color.ink, marginTop: space.xl },
  footer: {
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.l,
    paddingTop: space.m,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
  },
});
