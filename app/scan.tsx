import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { checkDigitValid } from '../shared/barcode';
import { useHandoff } from '../src/building';
import { Segmented, success, tap } from '../src/components/UI';
import { analyzePhoto, readLabel } from '../src/services/ai';
import { aiAvailable } from '../src/services/aiTransport';
import { lookupBarcode } from '../src/services/foods';
import { useStore } from '../src/store';
import { color, font, space } from '../src/theme';

type Mode = 'food' | 'barcode' | 'label';

async function toBase64(uri: string) {
  // Smaller photos mean a faster round trip to Claude — this stays plenty sharp for reading a plate or a label.
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 1024 });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ base64: true, compress: 0.6, format: SaveFormat.JPEG });
  return out.base64 ?? '';
}

export default function Scan() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: Mode; code?: string }>();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const stage = useStore((s) => s.stage);
  const setProduct = useHandoff((s) => s.setProduct);
  const setLabelPrefill = useHandoff((s) => s.setLabelPrefill);
  const [perm, requestPerm] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>(params.mode ?? 'food');
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [torch, setTorch] = useState(false);
  const [manual, setManual] = useState('');
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [slowFor, setSlowFor] = useState<Mode | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const slow = slowFor === mode;
  const cam = useRef<CameraView>(null);
  const lastCode = useRef('');
  const [scanY] = useState(() => new Animated.Value(0));

  useEffect(() => {
    aiAvailable().then((a) => setAiReady(!!a));
    // Auto-request camera permission on first visit so the user isn't
    // asked to tap "Allow" every single time they open the scanner.
    if (perm && !perm.granted && perm.canAskAgain) {
      requestPerm();
    }
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  // If nothing scans after a while, suggest light or typing the number.
  useEffect(() => {
    if (mode !== 'barcode') return;
    const t = setTimeout(() => setSlowFor('barcode'), 9000);
    return () => clearTimeout(t);
  }, [mode]);

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

  const handleImage = (uri: string) =>
    run(mode === 'label' ? 'Reading the label…' : 'Analyzing your meal…', async () => {
      const b64 = await toBase64(uri);
      if (mode === 'label') {
        const label = await readLabel(b64);
        if (!label.readable) throw new Error('The label is hard to read. Fill the frame with the Nutrition Facts panel and avoid glare.');
        setLabelPrefill({ code: params.code, name: label.name, brand: label.brand, serving: label.serving, grams: label.grams, nutrients: label.nutrients });
        router.replace('/create-food');
        return;
      }
      const { foods, notes } = await analyzePhoto(b64);
      if (!foods.length) throw new Error(notes || 'No food found in that photo. Get the whole plate in frame and try again.');
      success();
      stage(foods.map((item) => ({ item, qty: 1, via: 'photo' as const })));
      router.replace('/review');
    });

  const shoot = async () => {
    tap();
    const pic = await cam.current?.takePictureAsync({ quality: 0.8 });
    if (pic?.uri) handleImage(pic.uri);
  };

  const library = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets[0]) handleImage(res.assets[0].uri);
  };

  const find = (code: string) =>
    run('Looking up product…', async () => {
      const r = await lookupBarcode(code);
      success();
      setProduct(r);
      router.replace('/product');
    });

  const onCode = ({ data }: BarcodeScanningResult) => {
    if (busy || data === lastCode.current) return;
    lastCode.current = data;
    setTimeout(() => (lastCode.current = ''), 4000);
    find(data);
  };

  const cameraOk = !!perm?.granted;
  // A red line sweeping the box makes it obvious the scanner is actively looking.
  useEffect(() => {
    if (mode !== 'barcode' || !cameraOk) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanY, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scanY, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [mode, cameraOk, scanY]);
  const aiBlocked = mode !== 'barcode' && aiReady === false;
  const needsCamera = true;

  return (
    <View style={styles.dark}>
      {cameraOk && focused ? (
        <CameraView
          ref={cam}
          style={StyleSheet.absoluteFill}
          facing="back"
          autofocus="on"
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'code128', 'code39'] }}
          onCameraReady={() => setCameraReady(true)}
          onMountError={(event) => setErr(event.message || 'The camera could not start. Close the scanner and try again.')}
          onBarcodeScanned={mode === 'barcode' && cameraReady && !busy ? onCode : undefined}
        />
      ) : null}

      <View style={[styles.topBar, { paddingTop: insets.top + space.s }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Close scanner">
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, maxWidth: 300 }}>
          <Segmented
            value={mode}
            onChange={(m) => {
              setErr('');
              setMode(m);
            }}
            options={[
              { value: 'food', label: 'Meal' },
              { value: 'barcode', label: 'Barcode' },
              { value: 'label', label: 'Label' },
            ]}
          />
        </View>
        <Pressable
          onPress={() => setTorch(!torch)}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Turn off light' : 'Turn on light'}
          disabled={!cameraOk}
        >
          <Ionicons name={torch ? 'flash' : 'flash-off'} size={22} color={cameraOk ? '#fff' : '#51607A'} />
        </Pressable>
      </View>

      {!perm ? null : !perm.granted && needsCamera ? (
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={36} color="#fff" />
          <Text style={styles.centerTitle}>Camera access needed</Text>
          <Text style={styles.centerBody}>
            {mode === 'barcode' ? 'Scan a barcode to pull the product’s label data and score.' : 'Take a photo so PlateGauge can analyze it.'}
          </Text>
          {perm.canAskAgain ? (
            <Pressable style={styles.primary} onPress={requestPerm} accessibilityRole="button">
              <Text style={styles.primaryText}>Allow camera</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.primary} onPress={() => Linking.openSettings()} accessibilityRole="button">
              <Text style={styles.primaryText}>Open Settings</Text>
            </Pressable>
          )}
          {mode !== 'barcode' ? (
            <Pressable style={styles.secondary} onPress={library} accessibilityRole="button">
              <Text style={styles.secondaryText}>Choose a photo instead</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <View style={styles.frameWrap} pointerEvents="none">
          {cameraOk && mode === 'barcode' ? (
            <View style={styles.frameBar}>
              <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanY.interpolate({ inputRange: [0, 1], outputRange: [6, 138] }) }] }]} />
            </View>
          ) : cameraOk ? (
            <View style={mode === 'food' ? styles.frameRound : styles.frameLabel} />
          ) : null}
          <Text style={styles.hint}>
            {mode === 'food'
              ? 'Fit the whole meal in the circle'
              : mode === 'barcode'
                ? cameraOk
                  ? 'Point at a barcode — it scans automatically'
                  : 'Type the barcode number below'
                : 'Fill the frame with the Nutrition Facts panel'}
          </Text>
          {mode === 'barcode' && slow && cameraOk ? (
            <Text style={styles.subHint}>Not scanning? Turn on the light, hold steady about 6 inches away, or type the number.</Text>
          ) : null}
        </View>
      )}

      <View style={[styles.bottom, { paddingBottom: insets.bottom + space.l }]}>
        {aiBlocked ? (
          <View style={styles.errBox}>
            <Text style={styles.errText}>AI analysis isn’t connected yet, so meal and label scanning are off. Barcode scanning still works.</Text>
          </View>
        ) : null}
        {err ? (
          <View style={styles.errBox} accessibilityRole="alert">
            <Text style={styles.errText}>{err}</Text>
          </View>
        ) : null}

        {mode === 'barcode' ? (
          <View style={styles.manual}>
            <TextInput
              value={manual}
              onChangeText={(t) => setManual(t.replace(/\D/g, ''))}
              placeholder="Or type the barcode number"
              placeholderTextColor="#8C9BB3"
              inputMode="numeric"
              keyboardType="number-pad"
              maxLength={14}
              style={styles.manualInput}
              returnKeyType="search"
              onSubmitEditing={() => manual.length >= 8 && find(manual)}
              accessibilityLabel="Barcode number"
            />
            <Pressable
              disabled={manual.length < 8 || !!busy}
              onPress={() => find(manual)}
              style={[styles.manualBtn, manual.length < 8 && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel="Look up barcode"
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </Pressable>
          </View>
        ) : null}
        {mode === 'barcode' && manual.length >= 8 && !checkDigitValid(manual) ? (
          <Text style={styles.subHint}>That number’s check digit doesn’t match. Double-check it.</Text>
        ) : null}

        {mode !== 'barcode' ? (
          <View style={styles.controls}>
            <Pressable
              onPress={library}
              disabled={aiBlocked || !!busy}
              style={[styles.side, aiBlocked && { opacity: 0.4 }]}
              accessibilityRole="button"
              accessibilityLabel="Choose from photos"
            >
              <Ionicons name="images" size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={shoot}
              disabled={!cameraOk || aiBlocked || !!busy}
              style={({ pressed }) => [styles.shutter, (!cameraOk || aiBlocked) && { opacity: 0.4 }, pressed && { transform: [{ scale: 0.94 }] }]}
              accessibilityRole="button"
              accessibilityLabel="Take photo"
            >
              <View style={styles.shutterIn} />
            </Pressable>
            <View style={styles.side} />
          </View>
        ) : null}
      </View>

      {busy ? (
        <View style={styles.busy}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.busyText}>{busy}</Text>
          {mode !== 'barcode' ? <Text style={styles.subHint}>This can take up to half a minute.</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dark: { flex: 1, backgroundColor: '#050B16' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.l },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl, gap: space.s },
  centerTitle: { color: '#fff', fontFamily: font.display, fontSize: 20, marginTop: space.s },
  centerBody: { color: '#A9BAD3', fontSize: 15, textAlign: 'center', lineHeight: 21 },
  primary: {
    marginTop: space.l,
    backgroundColor: color.gauge,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondary: { minHeight: 44, justifyContent: 'center' },
  secondaryText: { color: '#fff', fontSize: 15, textDecorationLine: 'underline' },
  frameWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  frameRound: { width: 270, height: 270, borderRadius: 135, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  frameBar: { width: 290, height: 150, borderRadius: 18, borderWidth: 3, borderColor: color.gauge, overflow: 'hidden' },
  scanLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: '#FF4D4D',
    shadowColor: '#FF4D4D',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  frameLabel: { width: 250, height: 330, borderRadius: 14, borderWidth: 3, borderColor: 'rgba(255,255,255,0.85)' },
  hint: { color: '#fff', marginTop: space.l, fontSize: 15, textAlign: 'center' },
  subHint: { color: '#A9BAD3', marginTop: space.s, fontSize: 13, textAlign: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.l, gap: space.m, maxWidth: 560, marginHorizontal: 'auto' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl },
  side: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  shutter: { width: 78, height: 78, borderRadius: 39, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterIn: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#fff' },
  errBox: { backgroundColor: 'rgba(214,69,61,0.92)', padding: space.m, borderRadius: 12 },
  errText: { color: '#fff', fontSize: 14, lineHeight: 19 },
  manual: { flexDirection: 'row', gap: space.s, alignItems: 'center' },
  manualInput: {
    flex: 1,
    minWidth: 0,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    color: '#fff',
    paddingHorizontal: space.l,
    fontSize: 17,
    letterSpacing: 1,
    outlineWidth: 0,
  },
  manualBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: color.gauge, alignItems: 'center', justifyContent: 'center' },
  busy: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,11,22,0.78)', alignItems: 'center', justifyContent: 'center', gap: space.m },
  busyText: { color: '#fff', fontFamily: font.displayMed, fontSize: 16 },
});
