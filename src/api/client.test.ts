import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { refreshSession, signOutHere } from '@/auth/session';
import i18n from '@/i18n';

import { ApiError, apiGet } from './client';

jest.mock('@/auth/session', () => ({ getAccessToken: jest.fn(() => 'access'), refreshSession: jest.fn(), signOutHere: jest.fn() }));

const reply = (status: number, body?: unknown) => ({ status, ok: status >= 200 && status < 300, statusText: '', text: async () => (body === undefined ? '' : JSON.stringify(body)) });
const fetchMock = jest.fn<(url: string, init?: RequestInit) => Promise<unknown>>();
globalThis.fetch = fetchMock as unknown as typeof fetch;
const refusalOf = (request: Promise<unknown>) =>
  request.then(
    () => {
      throw new Error('expected a refusal');
    },
    (e: ApiError) => e,
  );

beforeAll(() => i18n.changeLanguage('en'));
beforeEach(() => {
  jest.clearAllMocks();
});

describe('API client', () => {
  it("shows a refusal in the person's language, in the web's wording", async () => {
    fetchMock.mockResolvedValue(reply(409, { messageKey: 'pages:txn.refusal.amountTooLarge', messageValues: { max: '500.000' } }));
    expect((await refusalOf(apiGet('/x'))).message).toBe('The amount cannot be more than OMR 500.000.');
  });

  it('never shows a key the app has no wording for', async () => {
    fetchMock.mockResolvedValue(reply(409, { messageKey: 'pages:nothing.here', detail: 'pages:nothing.here' }));
    expect((await refusalOf(apiGet('/x'))).message).toBe(i18n.t('live.refused'));
  });

  it("joins the fields' complaints", async () => {
    fetchMock.mockResolvedValue(reply(400, { title: 'One or more validation errors occurred.', errors: { Amount: ['Too big.'], Date: ['Missing.'] } }));
    expect((await refusalOf(apiGet('/x'))).message).toBe('Too big. Missing.');
  });

  it('renews an expired session once and sends the request again', async () => {
    jest.mocked(refreshSession).mockResolvedValue(true);
    fetchMock.mockResolvedValueOnce(reply(401)).mockResolvedValueOnce(reply(200, { id: 1 }));
    await expect(apiGet('/x')).resolves.toEqual({ id: 1 });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('signs out on this phone when the session cannot be renewed', async () => {
    jest.mocked(refreshSession).mockResolvedValue(false);
    fetchMock.mockResolvedValue(reply(401));
    expect((await refusalOf(apiGet('/x'))).status).toBe(401);
    expect(signOutHere).toHaveBeenCalledWith('expired');
  });

  it('reports no signal as out of reach, with status 0', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    const refusal = await refusalOf(apiGet('/x'));
    expect(refusal.status).toBe(0);
    expect(refusal.message).toBe(i18n.t('web:auth.error.noApi'));
  });
});
