/**
 * The app lock. After the first password sign-in the phone keeps the session; opening the app
 * again, fresh or after five minutes away, asks for Face ID, a fingerprint or the phone's
 * passcode. A phone with none of these asks for the password instead, and signing out always
 * does. The person can turn the lock off in Profile (on until they do): then a fresh open asks
 * for the password, and coming back from the background asks nothing.
 *
 * Live mode on a phone only: the web build keeps no session between visits, and demo mode has none.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { getAuthState, signOutHere } from '@/auth/session';
import { authMode } from '@/config';

export const AWAY_MS = 5 * 60_000;
export const lockApplies = authMode === 'api' && Platform.OS !== 'web';
const PREFERENCE_KEY = 'cashflow.appLock';

let locked = false;
/** The person's choice on this phone; read from storage when a kept session opens. */
let enabled = true;
const listeners = new Set<() => void>();
const setLocked = (next: boolean) => {
  locked = next;
  listeners.forEach((l) => l());
};

export const isLocked = () => locked;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export const useLocked = () => useSyncExternalStore(subscribe, () => locked);
export const useLockEnabled = () => useSyncExternalStore(subscribe, () => enabled);

/** Whether this phone can check its owner at all: Face ID, a fingerprint, or at least a passcode. */
export const canCheckOwner = async () =>
  (await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE)) !== LocalAuthentication.SecurityLevel.NONE;

/** A session the phone kept is opening: lock it, or end it when the lock is off or the phone cannot check. */
export async function lockKeptSession() {
  if (!lockApplies) return;
  enabled = (await AsyncStorage.getItem(PREFERENCE_KEY).catch(() => null)) !== 'off';
  if (getAuthState().status !== 'signedIn') return;
  if (enabled && (await canCheckOwner())) setLocked(true);
  else await signOutHere();
}

/** Profile's switch. Turning it on asks for Face ID or a fingerprint once, so it is known to work. */
export async function setLockEnabled(on: boolean, promptMessage: string, cancelLabel: string) {
  if (on) {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: false }).catch(() => ({ success: false }));
    if (!result.success) return false;
  }
  enabled = on;
  listeners.forEach((l) => l());
  await AsyncStorage.setItem(PREFERENCE_KEY, on ? 'on' : 'off').catch(() => undefined);
  return true;
}

/** Face ID or a fingerprint, with the phone's passcode when those fail or are not set up. */
export async function unlock(promptMessage: string, cancelLabel: string) {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, cancelLabel, disableDeviceFallback: false });
  if (result.success) setLocked(false);
  return result.success;
}

/** Signed out, by any path: the next sign-in is a password one and opens unlocked. */
export const clearLock = () => {
  if (locked) setLocked(false);
};

/**
 * Locks again after five minutes in the background. Only "background" counts: the Face ID
 * prompt itself makes the app "inactive", and a quick trip to the camera stays under the limit.
 */
export function watchAway() {
  let leftAt: number | null = null;
  const sub = AppState.addEventListener('change', (next) => {
    if (next === 'background') leftAt = Date.now();
    else if (next === 'active' && leftAt !== null) {
      const away = Date.now() - leftAt;
      leftAt = null;
      // With the lock off, coming back asks nothing; only a fresh open asks for the password.
      if (away >= AWAY_MS && enabled) void lockKeptSession();
    }
  });
  return () => sub.remove();
}
