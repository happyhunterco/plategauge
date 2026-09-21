import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { color, space } from '../theme';

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Web only: offers "Add to Home Screen". The installed site is a web app, not the App Store app. */
export function InstallPrompt() {
  const [evt, setEvt] = useState<BIP | null>(null);
  const [hidden, setHidden] = useState(false);
  const [eligible] = useState(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
    const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
    return !standalone && window.self === window.top;
  });
  const [ios] = useState(() => eligible && /iphone|ipad|ipod/i.test(navigator.userAgent));

  useEffect(() => {
    if (!eligible) return;
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIP);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [eligible]);

  if (hidden || (!evt && !ios)) return null;
  return (
    <View style={styles.box}>
      <Text style={styles.text}>
        {evt ? 'Add Vahla to your home screen for quick logging.' : 'To add the web app to your home screen, tap Share, then Add to Home Screen.'}
      </Text>
      <View style={styles.row}>
        {evt ? (
          <Pressable
            accessibilityRole="button"
            onPress={async () => {
              await evt.prompt();
              setHidden(true);
            }}
            style={styles.btn}
          >
            <Text style={styles.btnText}>Install</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={() => setHidden(true)} style={styles.btn}>
          <Text style={[styles.btnText, { color: color.sub }]}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: color.wash, borderRadius: 14, padding: space.m, gap: space.s },
  text: { fontSize: 13, color: color.ink },
  row: { flexDirection: 'row', gap: space.m },
  btn: { minHeight: 44, justifyContent: 'center' },
  btnText: { color: color.gauge, fontWeight: '600', fontSize: 15 },
});
