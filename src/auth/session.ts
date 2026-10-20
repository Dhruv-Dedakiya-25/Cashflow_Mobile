/**
 * The live session: the /api/AppAuth calls, and where each part is kept.
 *
 *   access token    -> memory only. It lasts 15 minutes and is renewed with the refresh token.
 *   refresh token   -> memory, and the Keychain or Keystore when "Keep me signed in" is on, so
 *                      the app opens signed in. Single use: every refresh replaces it.
 *   trusted device  -> the Keychain or Keystore, after "Trust this device"; it skips the code
 *                      at later sign-ins until it expires, and survives signing out.
 *   signed-in user  -> AsyncStorage. Not a secret: it lets the app open offline, before the
 *                      first refresh can answer.
 *
 * Demo mode never uses this module.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import type { AppSession, AuthenticatorApp, AuthUser, TwoFactorChallenge, TwoFactorSetup } from '@/api/types';
import { apiBaseUrl } from '@/config';

const REFRESH_KEY = 'cashflow.refreshToken';
const TRUSTED_KEY = 'cashflow.trustedDevice';
const USER_KEY = 'cashflow.user';
const TIMEOUT_MS = 20_000;

export type AuthState =
  | { status: 'starting' }
  | { status: 'signedOut'; notice?: 'expired' | 'passwordChanged' }
  | { status: 'signedIn'; user: AuthUser };

/** Why a sign-in step was refused. `wrongCode` lets the person try again; `expired` sends them back. */
export class SignInError extends Error {
  constructor(public readonly reason: 'invalid' | 'tooMany' | 'noApi' | 'wrongCode' | 'expired') {
    super(reason);
    this.name = 'SignInError';
  }
}

let state: AuthState = { status: 'starting' };
let accessToken: string | null = null;
let refreshToken: string | null = null;
/** Kept between confirming a new authenticator and the person leaving the recovery codes screen. */
let pendingSession: AppSession | null = null;
/** The password step's challenge, for the code or set-up screen that follows it. */
let challenge: TwoFactorChallenge | null = null;
export const getChallenge = () => challenge;
const listeners = new Set<() => void>();

const setState = (next: AuthState) => {
  state = next;
  listeners.forEach((l) => l());
};

export const useAuth = () =>
  useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
  );

export const getAccessToken = () => accessToken;

// The web build has no Keychain; live mode there keeps the tokens in memory only.
const secure = {
  get: (key: string) => (Platform.OS === 'web' ? Promise.resolve(null) : SecureStore.getItemAsync(key).catch(() => null)),
  set: (key: string, value: string) => (Platform.OS === 'web' ? Promise.resolve() : SecureStore.setItemAsync(key, value).catch(() => undefined)),
  remove: (key: string) => (Platform.OS === 'web' ? Promise.resolve() : SecureStore.deleteItemAsync(key).catch(() => undefined)),
};

/** A POST to /api/AppAuth. A network failure or a gateway standing in for a stopped API is "cannot reach". */
async function post(path: string, body: unknown): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${apiBaseUrl}/AppAuth/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: abort.signal,
    });
    if (res.status === 502 || res.status === 503 || res.status === 504) throw new SignInError('noApi');
    return res;
  } catch (e) {
    throw e instanceof SignInError ? e : new SignInError('noApi');
  } finally {
    clearTimeout(timer);
  }
}

const codeRefusal = async (res: Response) => {
  if (res.status === 429) return new SignInError('tooMany');
  const body = (await res.json().catch(() => null)) as { reason?: string } | null;
  return new SignInError(body?.reason === 'wrongCode' ? 'wrongCode' : 'expired');
};

/** Keeps a session the API has just issued or renewed. */
async function keep(app: AppSession) {
  challenge = null;
  accessToken = app.session.accessToken;
  refreshToken = app.refreshToken;
  await (app.session.isPersistent ? secure.set(REFRESH_KEY, app.refreshToken) : secure.remove(REFRESH_KEY));
  if (app.trustedDeviceToken) await secure.set(TRUSTED_KEY, app.trustedDeviceToken);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(app.session.user)).catch(() => undefined);
  setState({ status: 'signedIn', user: app.session.user });
}

/** Ends the session on this phone only, such as when the server says it has already ended. */
export async function signOutHere(notice?: 'expired' | 'passwordChanged') {
  accessToken = null;
  refreshToken = null;
  pendingSession = null;
  await secure.remove(REFRESH_KEY);
  await AsyncStorage.removeItem(USER_KEY).catch(() => undefined);
  setState({ status: 'signedOut', notice });
}

/** Opens signed in when the phone kept a session; otherwise at sign-in. Call once at start-up. */
export async function restoreSession() {
  refreshToken = await secure.get(REFRESH_KEY);
  if (!refreshToken) return setState({ status: 'signedOut' });

  if (await refreshSession()) return;
  // No answer (no signal, API down): open with the saved user, and the first request tries again.
  const saved = await AsyncStorage.getItem(USER_KEY).catch(() => null);
  if (refreshToken && saved) setState({ status: 'signedIn', user: JSON.parse(saved) as AuthUser });
  else if (state.status === 'starting') setState({ status: 'signedOut' });
}

/** The password step. Resolves to a challenge when a code (or setting one up) comes next, else signs in. */
export async function login(username: string, password: string, rememberMe: boolean): Promise<TwoFactorChallenge | null> {
  const trustedDeviceToken = (await secure.get(TRUSTED_KEY)) ?? undefined;
  const res = await post('login', { username, password, rememberMe, trustedDeviceToken });
  if (!res.ok) throw new SignInError(res.status === 429 ? 'tooMany' : 'invalid');

  const body = (await res.json()) as AppSession | { challenge: TwoFactorChallenge };
  if ('challenge' in body) return (challenge = body.challenge);
  await keep(body);
  return null;
}

/** The code step: a code from the authenticator app, or a recovery code. */
export async function verifyTwoFactor(challengeToken: string, answer: { code: string } | { recoveryCode: string }, trustDevice: boolean) {
  const res = await post('twoFactor', { challengeToken, ...answer, trustDevice });
  if (!res.ok) throw await codeRefusal(res);
  await keep((await res.json()) as AppSession);
}

/** A new secret, for someone who must use 2FA but has not set it up. */
export async function startEnroll(challengeToken: string): Promise<TwoFactorSetup> {
  const res = await post('twoFactorSetup', { challengeToken });
  if (!res.ok) throw new SignInError(res.status === 429 ? 'tooMany' : 'expired');
  return (await res.json()) as TwoFactorSetup;
}

/**
 * The first code confirms the new authenticator. Resolves to the recovery codes, shown once;
 * the session starts when the person leaves that screen (finishEnroll).
 */
export async function confirmEnroll(challengeToken: string, code: string, app: AuthenticatorApp): Promise<string[]> {
  const res = await post('twoFactorSetup/confirm', { challengeToken, code, app });
  if (!res.ok) throw await codeRefusal(res);
  pendingSession = (await res.json()) as AppSession;
  return pendingSession.session.recoveryCodes ?? [];
}

export async function finishEnroll() {
  if (pendingSession) await keep(pendingSession);
  pendingSession = null;
}

/**
 * Trades the refresh token for a new pair. Callers at the same moment share one request: a
 * refresh token works once, so a second exchange would end the session the first one renewed.
 * Resolves false when there is no session, it has ended, or the API cannot be reached.
 */
let inFlight: Promise<boolean> | null = null;

export function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    if (!refreshToken) return false;
    try {
      const res = await post('refresh', { refreshToken });
      if (!res.ok) {
        await signOutHere('expired');
        return false;
      }
      await keep((await res.json()) as AppSession);
      return true;
    } catch {
      // No signal is not an ended session: keep it and try again later.
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Replaces the signed-in user, such as after re-reading /api/Auth/me. */
export async function updateUser(user: AuthUser) {
  if (state.status !== 'signedIn') return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => undefined);
  setState({ status: 'signedIn', user });
}

export async function logout() {
  const token = refreshToken;
  await signOutHere();
  // Best effort: the server ends the session; this phone has already forgotten it either way.
  if (token) post('logout', { refreshToken: token }).catch(() => undefined);
}
