import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap, type IconName } from '../../src/components/UI';
import { Avatar, StreakChip } from '../../src/components/Kit';
import { LogoMark, LogoWordmark } from '../../src/components/Logo';
import { SIDEBAR, useWide } from '../../src/layout';
import { color, font } from '../../src/theme';

const TABS: Record<string, { label: string; icon: IconName; on: IconName }> = {
  index: { label: 'Today', icon: 'disc-outline', on: 'disc' },
  log: { label: 'Log', icon: 'search-outline', on: 'search' },
  crave: { label: 'Crave', icon: 'restaurant-outline', on: 'restaurant' },
  workouts: { label: 'Workouts', icon: 'barbell-outline', on: 'barbell' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const item = (i: number) => {
    const route = state.routes[i];
    const cfg = TABS[route.name];
    if (!cfg) return null;
    const focused = state.index === i;
    return (
      <Pressable
        key={route.key}
        onPress={() => {
          tap();
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        }}
        style={styles.item}
        accessibilityRole="tab"
        accessibilityLabel={cfg.label}
        accessibilityState={{ selected: focused }}
      >
        <Ionicons name={focused ? cfg.on : cfg.icon} size={22} color={focused ? color.ink : color.faint} />
        <Text style={[styles.label, { color: focused ? color.ink : color.faint }, focused && { fontWeight: '700' }]}>{cfg.label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={[styles.bar, { bottom: Math.max(insets.bottom, 12) }]}>
      {item(0)}
      {item(1)}
      <View style={styles.item}>
        <Pressable
          onPress={() => {
            tap();
            router.push('/add');
          }}
          accessibilityRole="button"
          accessibilityLabel="Add: log food, scan a barcode or meal, water, weight, activity"
          style={({ pressed }) => [styles.add, pressed && { transform: [{ scale: 0.95 }] }]}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </Pressable>
      </View>
      {item(2)}
      {item(3)}
    </View>
  );
}

function SideBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();
  return (
    <View style={side.bar} accessibilityRole="tablist">
      <View style={side.brand}>
        <LogoMark size={34} />
        <LogoWordmark width={76} />
      </View>
      <Pressable
        onPress={() => router.push('/add')}
        accessibilityRole="button"
        accessibilityLabel="Add food, water, weight or activity"
        style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [side.add, (pressed || hovered) && { opacity: 0.9 }]}
      >
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={side.addText}>Add</Text>
      </Pressable>
      <View style={{ gap: 2, marginTop: 18 }}>
        {state.routes.map((route, i) => {
          const cfg = TABS[route.name];
          if (!cfg) return null;
          const focused = state.index === i;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
              }}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              style={({ hovered }: { pressed: boolean; hovered?: boolean }) => [
                side.item,
                focused && side.itemOn,
                !focused && hovered && { backgroundColor: color.wash },
              ]}
            >
              <Ionicons name={focused ? cfg.on : cfg.icon} size={20} color={focused ? '#fff' : color.ink} />
              <Text style={[side.itemText, focused && { color: '#fff' }]}>{cfg.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flex: 1 }} />
      <View style={side.foot}>
        <StreakChip />
        <Avatar />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const wide = useWide();
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarPosition: wide ? 'left' : 'bottom' }} tabBar={(p) => (wide ? <SideBar {...p} /> : <TabBar {...p} />)}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="crave" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="progress" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.line,
    borderRadius: 30,
    paddingVertical: 5,
    position: 'absolute',
    width: '94%',
    maxWidth: 640,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, minHeight: 58 },
  label: { fontSize: 11, fontFamily: undefined },
  add: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.ink,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
});
const side = StyleSheet.create({
  bar: {
    width: SIDEBAR,
    height: '100%',
    backgroundColor: '#fff',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: color.line,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 20,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, marginBottom: 24 },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 14, backgroundColor: color.ink },
  addText: { color: '#fff', fontFamily: font.display, fontSize: 15 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 44, borderRadius: 12, paddingHorizontal: 12 },
  itemOn: { backgroundColor: color.gauge },
  itemText: { fontSize: 15, fontWeight: '600', color: color.ink },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
});

export const unstable_settings = { initialRouteName: 'index' };
