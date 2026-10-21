import { describe, expect, it, jest } from '@jest/globals';
import * as SecureStore from 'expo-secure-store';

import { getAccessToken, refreshSession, restoreSession } from './session';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(async () => undefined), deleteItemAsync: jest.fn(async () => undefined) }));

const fetchMock = jest.fn<(url: string, init?: RequestInit) => Promise<unknown>>();
globalThis.fetch = fetchMock as unknown as typeof fetch;
let issued = 0;
const renewed = () => {
  issued += 1;
  const body = { session: { accessToken: `access-${issued}`, isPersistent: true, user: { username: 'hamed' } }, refreshToken: `refresh-${issued}` };
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true, status: 200, json: async () => body }), 10));
};

describe('session renewal', () => {
  it('renews once when several requests find the session expired at the same time', async () => {
    // A refresh token is single-use: a second refresh with the same one would end the session everywhere.
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('refresh-0');
    fetchMock.mockImplementation(renewed);
    await restoreSession();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBe('access-1');

    const results = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(results).toEqual([true, true, true]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({ refreshToken: 'refresh-1' });
    expect(getAccessToken()).toBe('access-2');
  });
});
