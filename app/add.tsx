import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap, type IconName } from '../src/components/UI';
import { color, font, space } from '../src/theme';
import { useWide } from '../src/layout';

type Action = { label: string; icon: IconName; to: Href; primary?: boolean };

const SCAN: Action[] = [
  { label: 'Scan barcode', icon: 'barcode-outline', to: '/scan?mode=barcode', primary: true },
  { label: 'Scan meal', icon: 'camera-outline', to: '/scan?mode=food', primary: true },
];
const ACTIONS: Action[] = [
  { label: 'Search food', icon: 'search', to: '/log' },
  { label: 'Describe food', icon: 'chatbubble-ellipses-outline', to: '/log?mode=type' },
  { label: 'Quick add', icon: 'flash-outline', to: '/log?mode=quick' },
  { label: 'Create food', icon: 'create-outline', to: '/create-food' },
  { label: 'Create recipe', icon: 'book-outline', to: '/recipe' },
  { label: 'Log water', icon: 'water-outline', to: '/quick?kind=water' },
  { label: 'Log weight', icon: 'scale-outline', to: '/quick?kind=weight' },
  { label: 'Add activity', icon: 'walk-outline', to: '/quick?kind=activity' },
  { label: 'What fits?', icon: 'restaurant-outline', to: '/crave' },
];

/** The one "add anything" menu, reached from the center button. */
export default function AddSheet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wide = useWide();
  const go = (to: Href) => {
    tap();
    router.back();
    setTimeout(() => router.push(to), 60);
  };
  return (
    <View style={[styles.root, wide && { justifyContent: 'center', padding: space.xl }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Close" />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + space.l }, wide && { borderRadius: 24, paddingTop: space.l }]} accessibilityViewIsModal>
        {wide ? null : <View style={styles.grabber} />}
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">
            Add
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={styles.close}>
            <Ionicons name="close" size={20} color={color.ink} />
          </Pressable>
        </View>
        <View style={styles.scanRow}>
          {SCAN.map((a) => (
            <Pressable key={a.label} onPress={() => go(a.to)} accessibilityRole="button" style={({ pressed }) => [styles.scan, pressed && { opacity: 0.85 }]}>
              <Ionicons name={a.icon} size={26} color="#fff" />
              <Text style={styles.scanText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.grid}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => go(a.to)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.cell, pressed && { backgroundColor: '#E6EDF5' }]}
            >
              <Ionicons name={a.icon} size={22} color={color.ink} />
              <Text style={styles.cellText} numberOfLines={2}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(5,11,22,0.4)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: space.l,
    paddingTop: space.s,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: color.line, marginBottom: space.s },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.m },
  title: { fontFamily: font.displayBold, fontSize: 22, color: color.ink },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: color.wash },
  scanRow: { flexDirection: 'row', gap: space.m },
  scan: { flex: 1, height: 92, borderRadius: 18, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center', gap: 6 },
  scanText: { color: '#fff', fontFamily: font.display, fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s, marginTop: space.m },
  cell: {
    width: '31.5%',
    flexGrow: 1,
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: color.wash,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  cellText: { fontSize: 13, color: color.ink, fontWeight: '500', textAlign: 'center' },
});
