import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { analyzePhoto, lookupBarcode } from '../../src/api';
import { Button, Empty, Segmented, success, tap } from '../../src/components/UI';
import { useStore } from '../../src/store';
import { color, font, space } from '../../src/theme';

type Mode = 'food' | 'barcode';

async function toBase64(uri: string) {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1024 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
  return out.base64 ?? '';
}

export default function Scan() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const stage = useStore((s) => s.stage);
  const [perm, requestPerm] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('food');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const cam = useRef<CameraView>(null);
  const lastCode = useRef('');

  const run = async (label: string, job: () => Promise<void>) => {
    setErr('');
    setBusy(label);
    try {
      await job();
    } catch (e) {
      setErr((e as Error).message || 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  };

  const analyze = (uri: string) =>
    run('Reading your plate…', async () => {
      const b64 = await toBase64(uri);
      const foods = await analyzePhoto(b64);
      if (!foods.length) throw new Error('No food found in that photo. Get the whole plate in frame and try again.');
      success();
      stage(foods);
      router.push('/review');
    });

  const shoot = async () => {
    tap();
    const pic = await cam.current?.takePictureAsync({ quality: 0.7 });
    if (pic?.uri) analyze(pic.uri);
  };

  const library = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!res.canceled && res.assets[0]) analyze(res.assets[0].uri);
  };

  const onCode = ({ data }: BarcodeScanningResult) => {
    if (busy || data === lastCode.current) return;
    lastCode.current = data;
    run('Looking up barcode…', async () => {
      const item = await lookupBarcode(data);
      if (!item) {
        lastCode.current = '';
        throw new Error('That product isn’t in the database yet. Try Log and describe it instead.');
      }
      success();
      stage([item]);
      router.push('/review');
      setTimeout(() => (lastCode.current = ''), 2500);
    });
  };

  if (!perm) return <View style={styles.dark} />;

  if (!perm.granted) {
    return (
      <View style={[styles.fill, { paddingTop: insets.top + 60, backgroundColor: '#fff' }]}>
        <Empty
          icon="camera-outline"
          title="Scan needs your camera"
          body="Photograph a plate to estimate it, or scan a barcode to pull exact label numbers."
          action={
            perm.canAskAgain ? (
              <Button label="Allow camera" onPress={requestPerm} />
            ) : (
              <Button label="Open Settings" onPress={() => Linking.openSettings()} />
            )
          }
        />
        <Button label="Choose a photo instead" kind="ghost" icon="images-outline" onPress={library} style={{ alignSelf: 'center' }} />
      </View>
    );
  }

  return (
    <View style={styles.dark}>
      {focused && (
        <CameraView
          ref={cam}
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={mode === 'barcode' && !busy ? onCode : undefined}
        />
      )}

      <View style={[styles.topBar, { paddingTop: insets.top + space.s }]}>
        <Text style={styles.title}>Scan</Text>
        <View style={{ width: 220 }}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setErr('');
              setMode(m);
            }}
            options={[
              { value: 'food', label: 'Food' },
              { value: 'barcode', label: 'Barcode' },
            ]}
          />
        </View>
      </View>

      <View style={styles.frameWrap} pointerEvents="none">
        <View style={mode === 'food' ? styles.frameRound : styles.frameBar} />
        <Text style={styles.hint}>
          {mode === 'food' ? 'Fit the whole plate in the circle' : 'Line the barcode up in the box'}
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 110 }]}>
        {err ? (
          <View style={styles.err} accessibilityRole="alert">
            <Text style={{ color: '#fff', fontSize: 14 }}>{err}</Text>
          </View>
        ) : null}
        {mode === 'food' && (
          <View style={styles.controls}>
            <Pressable onPress={library} style={styles.side} accessibilityRole="button" accessibilityLabel="Choose from photos">
              <Ionicons name="images" size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={shoot}
              disabled={!!busy}
              style={({ pressed }) => [styles.shutter, pressed && { transform: [{ scale: 0.94 }] }]}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterIn} />
            </Pressable>
            <View style={styles.side} />
          </View>
        )}
      </View>

      {busy && (
        <View style={styles.busy}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.busyText}>{busy}</Text>
        </View>
      )}
      {Platform.OS === 'web' && mode === 'food' && !busy && (
        <Text style={styles.webNote}>Camera preview is limited on web. Choose a photo to try it.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dark: { flex: 1, backgroundColor: '#050B16' },
  topBar: { paddingHorizontal: space.l, gap: space.m, alignItems: 'center' },
  title: { fontFamily: font.display, fontSize: 18, color: '#fff' },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  frameRound: { width: 270, height: 270, borderRadius: 135, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  frameBar: { width: 290, height: 150, borderRadius: 18, borderWidth: 3, borderColor: color.needle },
  hint: { color: '#fff', marginTop: space.l, fontSize: 14, opacity: 0.9 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.l, gap: space.l },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl },
  side: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterIn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
  err: { backgroundColor: 'rgba(214,69,61,0.92)', padding: space.m, borderRadius: 12 },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,11,22,0.72)', alignItems: 'center', justifyContent: 'center', gap: space.m },
  busyText: { color: '#fff', fontFamily: font.displayMed, fontSize: 16 },
  webNote: { position: 'absolute', top: 140, alignSelf: 'center', color: '#A9BAD3', fontSize: 12, textAlign: 'center', paddingHorizontal: space.xl },
});
