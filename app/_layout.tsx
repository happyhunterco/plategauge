import {
  Lexend_500Medium,
  Lexend_600SemiBold,
  Lexend_700Bold,
  useFonts,
} from '@expo-google-fonts/lexend';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useStore } from '../src/store';
import { color, font } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded] = useFonts({ Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold });
  const hydrated = useStore((s) => s.hydrated);
  const hasGoals = useStore((s) => !!s.goals);
  const segments = useSegments();
  const router = useRouter();
  const ready = loaded && hydrated;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    const inSetup = segments[0] === 'setup';
    if (!hasGoals && !inSetup) router.replace('/setup');
  }, [ready, hasGoals, segments, router]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerTintColor: color.ink,
          headerTitleStyle: { fontFamily: font.display, color: color.ink },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: color.plate },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="setup" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="review" options={{ presentation: 'modal', title: 'Add to log' }} />
        <Stack.Screen name="menus" options={{ title: 'Menus' }} />
        <Stack.Screen name="kitchen" options={{ title: 'Kitchen' }} />
        <Stack.Screen name="goals" options={{ presentation: 'modal', title: 'Goals' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
