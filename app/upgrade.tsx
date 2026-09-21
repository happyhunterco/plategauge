import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen, Button } from '../src/components/UI';
import { color, font, space } from '../src/theme';
import { useStore } from '../src/store';
import { api } from '../src/services/http';

const FEATURES = [
  { icon: 'camera' as const, text: 'AI meal & label scanning' },
  { icon: 'restaurant' as const, text: '150+ restaurant menus' },
  { icon: 'flash' as const, text: 'Crave — name any food, make it fit' },
  { icon: 'build' as const, text: 'Build It — customize any meal' },
  { icon: 'bar-chart' as const, text: 'Progress charts & trends' },
  { icon: 'people' as const, text: 'Groups & streaks with friends' },
];

export default function Upgrade() {
  const router = useRouter();
  const [plan, setPlan] = useState<'monthly' | 'annual'>('annual');
  const [loading, setLoading] = useState(false);
  const account = useStore((s) => s.account);

  const checkout = async () => {
    if (!account) {
      router.push('/account');
      return;
    }
    setLoading(true);
    try {
      const { url } = await api<{ url: string }>('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ plan, userId: account.id, email: account.email }),
      });
      if (url) await Linking.openURL(url);
    } catch (e) {
      console.error('checkout', e);
      Alert.alert('Checkout unavailable', (e as Error).message || 'Please try again in a moment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen title="Upgrade">
      <View style={styles.body}>
        <Text style={styles.hero}>Vahla Pro</Text>
        <Text style={styles.sub}>Everything you need to hit your goals, no guesswork.</Text>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.text} style={styles.featureRow}>
              <Ionicons name={f.icon} size={20} color={color.gauge} />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.plans}>
          <Pressable
            style={[styles.planCard, plan === 'annual' && styles.planOn]}
            onPress={() => setPlan('annual')}
            accessibilityRole="radio"
            accessibilityState={{ selected: plan === 'annual' }}
          >
            <View style={styles.planTop}>
              <Text style={[styles.planName, plan === 'annual' && { color: '#fff' }]}>Annual</Text>
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Save 40%</Text>
              </View>
            </View>
            <Text style={[styles.planPrice, plan === 'annual' && { color: '#fff' }]}>
              $49.99<Text style={styles.planPer}>/year</Text>
            </Text>
            <Text style={[styles.planBreak, plan === 'annual' && { color: 'rgba(255,255,255,0.6)' }]}>$4.17/mo</Text>
          </Pressable>

          <Pressable
            style={[styles.planCard, plan === 'monthly' && styles.planOn]}
            onPress={() => setPlan('monthly')}
            accessibilityRole="radio"
            accessibilityState={{ selected: plan === 'monthly' }}
          >
            <Text style={[styles.planName, plan === 'monthly' && { color: '#fff' }]}>Monthly</Text>
            <Text style={[styles.planPrice, plan === 'monthly' && { color: '#fff' }]}>
              $6.99<Text style={styles.planPer}>/month</Text>
            </Text>
          </Pressable>
        </View>

        <Button label={loading ? 'Opening checkout...' : 'Continue'} onPress={checkout} disabled={loading} style={{ marginTop: space.l }} />
        <Pressable onPress={() => router.back()} style={{ alignSelf: 'center', marginTop: space.m }}>
          <Text style={{ color: color.sub, fontSize: 14 }}>Maybe later</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: space.l, paddingTop: space.xl },
  hero: { fontFamily: font.displayBold, fontSize: 32, color: color.ink, letterSpacing: -1, textAlign: 'center' },
  sub: { fontSize: 15, color: color.sub, textAlign: 'center', marginTop: 6, marginBottom: space.xl },
  features: { gap: 14, marginBottom: space.xl },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureText: { fontSize: 15, color: color.ink, flex: 1 },
  plans: { flexDirection: 'row', gap: space.m },
  planCard: { flex: 1, padding: space.l, borderRadius: 18, backgroundColor: color.wash, gap: 4 },
  planOn: { backgroundColor: color.ink },
  planTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontFamily: font.display, fontSize: 15, color: color.ink },
  planPrice: { fontFamily: font.displayBold, fontSize: 24, color: color.ink, letterSpacing: -0.5, marginTop: 4 },
  planPer: { fontSize: 13, fontWeight: '400', color: color.sub },
  planBreak: { fontSize: 13, color: color.faint },
  saveBadge: { backgroundColor: color.gauge, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  saveText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
