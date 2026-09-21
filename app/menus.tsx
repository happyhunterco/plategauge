import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RESTAURANTS, restaurantById } from '../shared/restaurants';
import { TopBar } from '../src/components/Kit';
import { Button, Field, Screen, tap } from '../src/components/UI';
import { useStore } from '../src/store';
import { color, font, radius, shadow, space } from '../src/theme';

const CURATED = ['Sweetgreen', 'CAVA', 'Chipotle', 'Panera Bread', 'Subway', 'Chick-fil-A'];

export default function Menus() {
  const router = useRouter();
  const favoriteIds = useStore((s) => s.profile?.favoriteRestaurants ?? []);
  const [query, setQuery] = useState('');
  const restaurants = useMemo(() => {
    const favorites = favoriteIds.map((id) => restaurantById(id)).filter(Boolean);
    const curated = CURATED.map((name) => RESTAURANTS.find((r) => r.name === name)).filter(Boolean);
    const all = [...favorites, ...curated];
    return all.filter((restaurant, index) => restaurant && all.findIndex((item) => item?.id === restaurant.id) === index).slice(0, 8);
  }, [favoriteIds]);
  const open = (name: string) => router.push({ pathname: '/crave', params: { q: name } });
  const submit = () => { if (query.trim()) open(query.trim()); };

  return <View style={styles.page}><TopBar title="Menus" /><Screen top={false}>
    <View style={styles.hero}>
      <Text style={styles.kicker}>PLAN BEFORE YOU ORDER</Text>
      <Text style={styles.title}>A better choice,{`\n`}already figured out.</Text>
      <Text style={styles.sub}>Explore full restaurant menus ranked for your calorie and protein goals, then customize the meal before you log it.</Text>
      <View style={styles.search}><Field icon="search" placeholder="Search any restaurant" value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={submit} /><Button label="View menu" onPress={submit} disabled={!query.trim()} /></View>
    </View>

    <View style={styles.sectionHead}><Text style={styles.sectionTitle}>Recommended menus</Text><Text style={styles.sectionMeta}>Best fits first</Text></View>
    <View style={styles.restaurants}>
      {restaurants.map((restaurant, index) => restaurant ? <Pressable key={restaurant.id} onPress={() => { tap(); open(restaurant.name); }} style={({ pressed }) => [styles.restaurant, pressed && { opacity: 0.75 }]}>
        <View style={[styles.logo, { backgroundColor: index % 3 === 0 ? '#E8EFE8' : index % 3 === 1 ? '#E9EDF2' : '#F2EDE5' }]}><Text style={styles.logoText}>{restaurant.name[0]}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.restaurantName}>{restaurant.name}</Text><Text style={styles.restaurantSub}>{restaurant.categories.slice(0, 3).map((x) => x.replace(/_/g, ' ')).join(' · ') || 'Full menu'}</Text></View>
        <Ionicons name="chevron-forward" size={18} color={color.faint} />
      </Pressable> : null)}
    </View>

    <View style={styles.split}>
      <Pressable onPress={() => router.push('/kitchen')} style={[styles.actionCard, { backgroundColor: '#E8EFE8' }]}><Ionicons name="leaf-outline" size={25} color={color.ink} /><Text style={styles.actionTitle}>Cook at home</Text><Text style={styles.actionSub}>Build a high-protein meal from what you have.</Text><View style={styles.arrow}><Ionicons name="arrow-forward" size={16} color="#fff" /></View></Pressable>
      <Pressable onPress={() => router.push('/crave')} style={[styles.actionCard, { backgroundColor: '#E9EDF2' }]}><Ionicons name="sparkles-outline" size={25} color={color.ink} /><Text style={styles.actionTitle}>Not sure yet?</Text><Text style={styles.actionSub}>Tell Vahla what sounds good and make it fit.</Text><View style={styles.arrow}><Ionicons name="arrow-forward" size={16} color="#fff" /></View></Pressable>
    </View>
  </Screen></View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: color.plate }, hero: { margin: space.l, padding: 22, borderRadius: 28, backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, ...shadow.card }, kicker: { fontSize: 9, letterSpacing: 1.5, fontWeight: '800', color: color.sub }, title: { fontFamily: font.displayBold, fontSize: 30, lineHeight: 35, letterSpacing: -0.9, color: color.ink, marginTop: 9 }, sub: { color: color.sub, fontSize: 13, lineHeight: 20, marginTop: 10, maxWidth: 460 }, search: { gap: space.s, marginTop: space.xl }, sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: space.l, marginTop: space.m, marginBottom: space.m }, sectionTitle: { fontFamily: font.display, fontSize: 18, color: color.ink }, sectionMeta: { color: color.sub, fontSize: 11 }, restaurants: { marginHorizontal: space.l, backgroundColor: '#fff', borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: color.line, overflow: 'hidden' }, restaurant: { minHeight: 70, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: color.lineSoft }, logo: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, logoText: { fontFamily: font.displayBold, fontSize: 16, color: color.ink }, restaurantName: { fontFamily: font.displayMed, fontSize: 14, color: color.ink }, restaurantSub: { color: color.sub, fontSize: 10, marginTop: 3, textTransform: 'capitalize' }, split: { marginHorizontal: space.l, marginTop: space.l, flexDirection: 'row', gap: space.m }, actionCard: { flex: 1, minHeight: 178, padding: 17, borderRadius: radius.l }, actionTitle: { fontFamily: font.display, color: color.ink, fontSize: 16, marginTop: 20 }, actionSub: { color: color.sub, fontSize: 11, lineHeight: 16, marginTop: 5 }, arrow: { position: 'absolute', right: 14, bottom: 14, width: 30, height: 30, borderRadius: 15, backgroundColor: color.ink, alignItems: 'center', justifyContent: 'center' },
});
