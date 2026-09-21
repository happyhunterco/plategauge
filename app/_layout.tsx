import { Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold, useFonts } from '@expo-google-fonts/lexend';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { gateRedirect } from '../shared/gate';
import { UndoToast } from '../src/components/Kit';
import { authMode, watchSession } from '../src/services/auth';
import { flushUnsynced } from '../src/services/sync';
import { useStore } from '../src/store';
import { color, font } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold });
  const hydrated = useStore((s) => s.hydrated);
  const authReady = useStore((s) => s.authReady);
  const onboarded = useStore((s) => !!s.profile && !!s.goals);
  const account = useStore((s) => s.account);
  const recovery = useStore((s) => s.recovery);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (authMode !== 'supabase') {
      useStore.getState().setAuthReady(true);
      return;
    }
    return watchSession();
  }, []);

  // A development account only counts when development mode is on.
  const signedIn = !!account && (!account.dev || authMode === 'development');
  const ready = fontsLoaded && hydrated && authReady;

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => {});
    if (recovery && segments[0] !== 'reset-password') return router.replace('/reset-password');
    const to = gateRedirect({ hydrated: true, onboarded, signedIn }, segments as string[]);
    if (to) router.replace(to as never);
  }, [ready, onboarded, signedIn, segments, router, recovery]);

  useEffect(() => {
    if (ready && signedIn) flushUnsynced().catch(() => {});
  }, [ready, signedIn]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

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
        <Stack.Screen name="account" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="reset-password" options={{ title: 'Reset password' }} />
        <Stack.Screen name="add" options={{ presentation: 'transparentModal', headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="scan" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
        <Stack.Screen name="product" options={{ title: 'Product' }} />
        <Stack.Screen name="review" options={{ presentation: 'modal', title: 'Add to log' }} />
        <Stack.Screen name="build" options={{ title: 'Build it' }} />
        <Stack.Screen name="entry" options={{ presentation: 'modal', title: 'Edit entry' }} />
        <Stack.Screen name="create-food" options={{ presentation: 'modal', title: 'Create food' }} />
        <Stack.Screen name="recipe" options={{ title: 'Create recipe' }} />
        <Stack.Screen name="quick" options={{ presentation: 'modal', title: '' }} />
        <Stack.Screen name="kitchen" options={{ title: 'Cook with what you have' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="targets" options={{ title: 'Goals & targets' }} />
      </Stack>
      <UndoToast />
    </SafeAreaProvider>
  );
}
