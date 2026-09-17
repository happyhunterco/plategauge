import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FoodItem } from '../../shared/food';
import { fmt } from '../hooks';
import { useStore } from '../store';
import { color, font, space } from '../theme';
import { SourceLine } from './Kit';
import { macroLine, tap } from './UI';

export function FoodRow({ item, onPress, last, right }: { item: FoodItem; onPress: () => void; last?: boolean; right?: React.ReactNode }) {
  const saved = useStore((s) => s.savedFoods.some((f) => f.id === item.id));
  const toggle = useStore((s) => s.toggleSaved);
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.brand ? `, ${item.brand}` : ''}, ${fmt(item.nutrients.calories)} calories`}
      style={({ pressed }) => [styles.row, !last && styles.line, pressed && { backgroundColor: color.wash }]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.name} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {[item.brand, macroLine(item.nutrients)].filter(Boolean).join('   ')}
        </Text>
        <SourceLine source={item.source} serving={item.serving.description} />
      </View>
      <View style={styles.right}>
        <Text style={styles.cal}>{fmt(item.nutrients.calories)}</Text>
        {right ?? (
          <Pressable
            hitSlop={10}
            onPress={() => {
              tap();
              toggle(item);
            }}
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove from saved foods' : 'Save food'}
            style={styles.star}
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={saved ? color.gauge : color.faint} />
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.m, paddingVertical: 12, paddingHorizontal: space.l, alignItems: 'center', minHeight: 64 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.line },
  name: { fontSize: 16, color: color.ink, fontWeight: '500' },
  detail: { fontSize: 13, color: color.sub, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  cal: { fontFamily: font.displayMed, fontSize: 16, color: color.ink },
  star: { width: 44, height: 32, alignItems: 'flex-end', justifyContent: 'center' },
});
