import { Ionicons } from '@expo/vector-icons';
import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap, type IconName } from '../../src/components/UI';
import { color } from '../../src/theme';

const TABS: Record<string, { label: string; icon: IconName; on: IconName }> = {
  index: { label: 'Today', icon: 'ellipse-outline', on: 'disc' },
  log: { label: 'Log', icon: 'search-outline', on: 'search' },
  scan: { label: 'Scan', icon: 'scan', on: 'scan' },
  crave: { label: 'Crave', icon: 'sparkles-outline', on: 'sparkles' },
  progress: { label: 'Progress', icon: 'trending-up-outline', on: 'trending-up' },
};

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route, i) => {
        const cfg = TABS[route.name];
        if (!cfg) return null;
        const focused = state.index === i;
        const go = () => {
          tap();
          const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
        };
        if (route.name === 'scan') {
          return (
            <Pressable key={route.key} onPress={go} style={styles.item} accessibilityRole="tab" accessibilityLabel="Scan" accessibilityState={{ selected: focused }}>
              <View style={[styles.scan, focused && { backgroundColor: color.gauge }]}>
                <Ionicons name="scan" size={24} color="#fff" />
              </View>
            </Pressable>
          );
        }
        return (
          <Pressable key={route.key} onPress={go} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }}>
            <Ionicons name={focused ? cfg.on : cfg.icon} size={23} color={focused ? color.ink : color.faint} />
            <Text style={[styles.label, { color: focused ? color.ink : color.faint }]}>{cfg.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(p) => <TabBar {...p} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="scan" />
      <Tabs.Screen name="crave" />
      <Tabs.Screen name="progress" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: color.line,
    paddingTop: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  label: { fontSize: 10.5, fontWeight: '500' },
  scan: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: color.ink,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
