/**
 * The app lock. After the first password sign-in the phone keeps the session; opening the app
 * again, fresh or after five minutes away, asks for Face ID, a fingerprint or the phone's
 * passcode. A phone with none of these asks for the password instead, and signing out always
 * does.
 *
 * Live mode on a phone only: the web build keeps no session between visits, and demo mode has none.
 */
import * as LocalAuthentication from 'expo-local-authentication';
import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { getAuthState, signOutHere } from '@/auth/session';
import { authMode } from '@/config';

export const AWAY_MS = 5 * 60_000;
export const lockApplies = authMode === 'api' && Platform.OS !== 'web';

let locked = false;
const listeners = new Set<() => void>();
const setLocked = (next: boolean) => {
  locked = next;
  listeners.forEach((l) => l());
};

export const isLocked = () => locked;

export const useLocked = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => locked,
  );

/** A session the phone kept is opening: lock it, or end it when the phone cannot tell who holds it. */
export async function lockKeptSession() {
  if (!lockApplies || getAuthState().status !== 'signedIn') return;
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  if (level === LocalAuthentication.SecurityLevel.NONE) await signOutHere();
  else setLocked(true);
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
      if (away >= AWAY_MS) void lockKeptSession();
    }
  });
  return () => sub.remove();
}
