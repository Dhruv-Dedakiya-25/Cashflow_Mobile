import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { queryClient, useLookups } from '@/api/live';
import { clearLock, lockApplies, lockKeptSession, useLocked, watchAway } from '@/auth/lock';
import { restoreSession } from '@/auth/session';
import { personaFor, useAppSession } from '@/auth/use-app-session';
import { LockScreen } from '@/components/lock-screen';
import { StartingUp } from '@/components/starting-up';
import { authMode } from '@/config';
import { restoreThemeChoice, useColorScheme } from '@/hooks/use-color-scheme';
import { restoreLanguage } from '@/i18n';
import { personas } from '@/mock/master';
import { signIn as showSampleAs, signOut as endSample } from '@/mock/store';
import { usePalette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
}

function App() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [languageReady, setLanguageReady] = useState(false);
  const scheme = useColorScheme();
  const palette = usePalette();
  const app = useAppSession();
  const lookups = useLookups(app.signedIn && !app.mustChangePassword);
  const locked = useLocked();

  // A kept session opens behind the lock, so nothing of it shows before Face ID or a fingerprint.
  useEffect(() => {
    Promise.all([restoreLanguage(), restoreThemeChoice(), authMode === 'api' ? restoreSession().then(lockKeptSession) : undefined]).finally(() => setLanguageReady(true));
  }, []);
  useEffect(() => (lockApplies ? watchAway() : undefined), []);
  useEffect(() => {
    if (!app.signedIn) clearLock();
  }, [app.signedIn]);

  // Live mode: the tabs not yet on the API show the sample persona nearest the person's rights,
  // and signing out drops everything loaded for them, so the next person sees none of it.
  const liveUser = app.user;
  useEffect(() => {
    if (authMode !== 'api') return;
    if (liveUser) {
      const persona = personaFor(liveUser);
      showSampleAs(persona, personas.find((p) => p.persona === persona)!.personId);
    } else {
      endSample();
      queryClient.clear();
    }
  }, [liveUser]);

  // A font that fails to load falls back to the system font rather than holding the splash screen.
  const ready = (fontsLoaded || fontError != null) && languageReady && !app.starting;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const signedIn = app.signedIn && !app.mustChangePassword;
  const waitingForNames = authMode === 'api' && signedIn && !lookups.data;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, primary: palette.primary, background: palette.bg, card: palette.card, text: palette.text, border: palette.border },
      }}>
      {/* In a laptop browser the app keeps a phone's width, centred; on a phone it fills the screen as usual. */}
      <View style={{ flex: 1, backgroundColor: palette.surfaceStrong }}>
        <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, alignSelf: 'center', overflow: 'hidden', borderLeftWidth: Platform.OS === 'web' ? 1 : 0, borderRightWidth: Platform.OS === 'web' ? 1 : 0, borderColor: palette.border }}>
          {waitingForNames ? (
            <StartingUp error={lookups.error} onRetry={() => lookups.refetch()} />
          ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
            <Stack.Protected guard={signedIn}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="profile" />
              <Stack.Screen name="language" />
              <Stack.Screen name="claim/[id]" />
              <Stack.Screen name="scan-review" />
              <Stack.Screen name="scan-done" options={{ gestureEnabled: false }} />
              <Stack.Screen name="review/[kind]/[id]" />
              <Stack.Screen name="acknowledge/[id]" />
              <Stack.Screen name="petty-cash" />
              <Stack.Screen name="report/[view]" />
            </Stack.Protected>
            {/* An administrator chose the password: the API refuses everything else until it is changed. */}
            <Stack.Protected guard={app.signedIn && app.mustChangePassword}>
              <Stack.Screen name="change-password" />
            </Stack.Protected>
            <Stack.Protected guard={!app.signedIn}>
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="two-factor" />
              <Stack.Screen name="two-factor-setup" />
            </Stack.Protected>
          </Stack>
          )}
          {/* Over the screens rather than instead of them: unlocking returns to where the person was. */}
          {lockApplies && locked && app.user ? (
            <View style={StyleSheet.absoluteFill}>
              <LockScreen user={app.user} />
            </View>
          ) : null}
        </View>
      </View>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
