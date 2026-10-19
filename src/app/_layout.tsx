import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

import { restoreThemeChoice, useColorScheme } from '@/hooks/use-color-scheme';
import { restoreLanguage } from '@/i18n';
import { useMockState } from '@/mock/store';
import { usePalette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const [languageReady, setLanguageReady] = useState(false);
  const scheme = useColorScheme();
  const palette = usePalette();
  const { session } = useMockState();

  useEffect(() => {
    Promise.all([restoreLanguage(), restoreThemeChoice()]).finally(() => setLanguageReady(true));
  }, []);

  // A font that fails to load falls back to the system font rather than holding the splash screen.
  const ready = (fontsLoaded || fontError != null) && languageReady;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, primary: palette.primary, background: palette.bg, card: palette.card, text: palette.text, border: palette.border },
      }}>
      {/* In a laptop browser the app keeps a phone's width, centred; on a phone it fills the screen as usual. */}
      <View style={{ flex: 1, backgroundColor: palette.surfaceStrong }}>
        <View style={{ flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? 480 : undefined, alignSelf: 'center', overflow: 'hidden', borderLeftWidth: Platform.OS === 'web' ? 1 : 0, borderRightWidth: Platform.OS === 'web' ? 1 : 0, borderColor: palette.border }}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }}>
            <Stack.Protected guard={!!session}>
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
            <Stack.Protected guard={!session}>
              <Stack.Screen name="sign-in" />
              <Stack.Screen name="two-factor" />
            </Stack.Protected>
          </Stack>
        </View>
      </View>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}
