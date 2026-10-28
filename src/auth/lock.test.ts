import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, type AppStateStatus } from 'react-native';

import { getAuthState, signOutHere } from '@/auth/session';

import { AWAY_MS, clearLock, isLocked, lockKeptSession, unlock, watchAway } from './lock';

jest.mock('@/config', () => ({ authMode: 'api', apiBaseUrl: '' }));
jest.mock('@/auth/session', () => ({ getAuthState: jest.fn(), signOutHere: jest.fn(async () => undefined) }));
jest.mock('expo-local-authentication', () => ({
  SecurityLevel: { NONE: 0, SECRET: 1, BIOMETRIC_WEAK: 2, BIOMETRIC_STRONG: 3 },
  getEnrolledLevelAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

const level = jest.mocked(LocalAuthentication.getEnrolledLevelAsync);
const signedIn = () => jest.mocked(getAuthState).mockReturnValue({ status: 'signedIn', user: { username: 'ahmed' } } as never);

describe('app lock', () => {
  beforeEach(() => {
    clearLock();
    jest.mocked(signOutHere).mockClear();
    signedIn();
  });

  it('locks a kept session on a phone with Face ID or a fingerprint, and opens it on success', async () => {
    level.mockResolvedValue(LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG);
    await lockKeptSession();
    expect(isLocked()).toBe(true);

    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: false, error: 'user_cancel' });
    expect(await unlock('Unlock', 'Cancel')).toBe(false);
    expect(isLocked()).toBe(true);

    jest.mocked(LocalAuthentication.authenticateAsync).mockResolvedValue({ success: true });
    expect(await unlock('Unlock', 'Cancel')).toBe(true);
    expect(isLocked()).toBe(false);
  });

  it('asks for the password instead when the phone has no Face ID, fingerprint or passcode', async () => {
    level.mockResolvedValue(LocalAuthentication.SecurityLevel.NONE);
    await lockKeptSession();
    expect(isLocked()).toBe(false);
    expect(signOutHere).toHaveBeenCalled();
  });

  it('locks again only after five minutes in the background', async () => {
    level.mockResolvedValue(LocalAuthentication.SecurityLevel.SECRET);
    let onChange: (s: AppStateStatus) => void = () => undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_, handler) => {
      onChange = handler as typeof onChange;
      return { remove: () => undefined } as never;
    });
    const clock = jest.spyOn(Date, 'now');
    watchAway();

    clock.mockReturnValue(0);
    onChange('background');
    clock.mockReturnValue(60_000);
    onChange('active');
    await Promise.resolve();
    expect(isLocked()).toBe(false);

    onChange('background');
    clock.mockReturnValue(60_000 + AWAY_MS);
    onChange('active');
    await new Promise((r) => setTimeout(r, 0));
    expect(isLocked()).toBe(true);
    clock.mockRestore();
  });
});
