import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { config } from '../config';
import { color, space } from '../theme';

/**
 * Store links come only from configuration. With no URL, the badge is hidden
 * (a development note shows in dev builds). Replace these with Apple's and Google's
 * official badge artwork before launch; both require their approved assets.
 */
export function StoreBadges() {
  const stores = [
    { url: config.appStoreUrl, icon: 'logo-apple' as const, top: 'Download on the', bottom: 'App Store' },
    { url: config.googlePlayUrl, icon: 'logo-google-playstore' as const, top: 'GET IT ON', bottom: 'Google Play' },
  ].filter((s) => s.url);
  if (!stores.length) {
    return __DEV__ || config.devData ? (
      <Text style={styles.note}>Store badges hidden: set EXPO_PUBLIC_APP_STORE_URL and EXPO_PUBLIC_GOOGLE_PLAY_URL once the listings are live.</Text>
    ) : null;
  }
  return (
    <View style={styles.row}>
      {stores.map((s) => (
        <Pressable
          key={s.bottom}
          accessibilityRole="link"
          accessibilityLabel={`${s.top} ${s.bottom}`}
          onPress={() => Linking.openURL(s.url)}
          style={styles.badge}
        >
          <Ionicons name={s.icon} size={22} color="#fff" />
          <View>
            <Text style={styles.top}>{s.top}</Text>
            <Text style={styles.bottom}>{s.bottom}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.s, justifyContent: 'center', flexWrap: 'wrap' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#000', borderRadius: 10, paddingHorizontal: 12, height: 46, minWidth: 150 },
  top: { color: '#fff', fontSize: 10 },
  bottom: { color: '#fff', fontSize: 17, fontWeight: '600', marginTop: -2 },
  note: { color: color.faint, fontSize: 12, textAlign: 'center' },
});
