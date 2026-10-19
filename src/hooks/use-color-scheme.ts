import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform, useColorScheme as useSystemScheme } from 'react-native';

export type ThemeChoice = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'cashflow.theme';
let choice: ThemeChoice = 'system';
const listeners = new Set<() => void>();

const apply = (next: ThemeChoice) => {
  choice = next;
  // On a phone this also turns the keyboard and system sheets light or dark; the web has no such switch.
  if (Platform.OS !== 'web') Appearance.setColorScheme(next === 'system' ? 'unspecified' : next);
  listeners.forEach((l) => l());
};

/** Applies the look chosen in Profile earlier, if any. Call once before the splash screen hides. */
export async function restoreThemeChoice() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') apply(saved);
  } catch {
    // Storage unavailable: the phone's setting stays.
  }
}

export async function setThemeChoice(next: ThemeChoice) {
  apply(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not saved: the choice lasts until the app closes.
  }
}

export function useThemeChoice() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => choice,
  );
}

/** Light or dark as the person chose in Profile, or the phone's own setting. */
export function useColorScheme() {
  const system = useSystemScheme();
  const chosen = useThemeChoice();
  return chosen === 'system' ? system : chosen;
}
