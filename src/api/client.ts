/**
 * The app's requests to the CashFlow API once signed in, modelled on the web's client.ts:
 * the access token on every request, one refresh when it has expired, and an ApiError that
 * carries the server's own reason.
 */
import { getAccessToken, refreshSession, signOutHere } from '@/auth/session';
import { apiBaseUrl } from '@/config';
import i18n from '@/i18n';

const TIMEOUT_MS = 30_000;
/** Uploads cross a phone's link, which can be slow. */
const UPLOAD_TIMEOUT_MS = 120_000;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const noApi = () => new ApiError(0, i18n.t('web:auth.error.noApi'));

/**
 * A refusal the API words with the web's keys, such as "pages:txn.refusal.notNow", in the
 * person's language. The app keeps the web's wording under web:, without its namespace; a value
 * that is itself a key comes as "t:<key>". A key the app does not have is left to the caller.
 */
function translated(body: { messageKey?: unknown; messageValues?: Record<string, unknown> }) {
  const keyOf = (k: string) => `web:${k.replace(/^[a-z]+:/, '')}`;
  if (typeof body.messageKey !== 'string' || !i18n.exists(keyOf(body.messageKey))) return undefined;
  const values = Object.fromEntries(
    Object.entries(body.messageValues ?? {}).map(([k, v]) => [k, typeof v === 'string' && v.startsWith('t:') ? i18n.t(keyOf(v.slice(2))) : v]),
  );
  return i18n.t(keyOf(body.messageKey), values);
}

/** The most useful message in an ASP.NET error body: a translated refusal, a field's complaint, then the rest. */
async function messageFrom(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return `${res.status} ${res.statusText}`;
  try {
    const body = JSON.parse(text);
    if (typeof body === 'string') return body;
    const refusal = translated(body);
    if (refusal) return refusal;
    if (body.errors) {
      const messages = Object.values(body.errors as Record<string, string[]>).map((m) => m?.[0]).filter(Boolean);
      if (messages.length) return messages.join(' ');
    }
    // A refusal whose key the app lacks has the key itself as its detail: never show that.
    if (body.detail && body.detail !== body.messageKey) return body.detail;
    return body.message ?? (body.messageKey ? i18n.t('live.refused') : body.title) ?? text;
  } catch {
    return text;
  }
}

async function send(method: string, path: string, body: unknown, timeoutMs: number): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
  const token = getAccessToken();
  // A form carries its own multipart boundary, so its Content-Type is left for fetch to write.
  const isForm = body instanceof FormData;
  try {
    const res = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined || isForm ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Names inside a refusal come back in the screen's language.
        'Accept-Language': i18n.language,
      },
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: abort.signal,
    });
    if (res.status === 502 || res.status === 503 || res.status === 504) throw noApi();
    return res;
  } catch (e) {
    throw e instanceof ApiError ? e : noApi();
  } finally {
    clearTimeout(timer);
  }
}

/** Sends a request with the session, refreshing an expired access token once, and returns the raw answer. */
async function sendAuthed(method: string, path: string, body?: unknown, timeoutMs = TIMEOUT_MS): Promise<Response> {
  // After the app opens offline there is a session but no access token yet.
  if (!getAccessToken()) await refreshSession();

  let res = await send(method, path, body, timeoutMs);
  // An expired access token is not the caller's failure: refresh once and replay.
  if (res.status === 401) {
    if (await refreshSession()) res = await send(method, path, body, timeoutMs);
    if (res.status === 401) {
      await signOutHere('expired');
      throw new ApiError(401, i18n.t('web:auth.twoFactor.expired'));
    }
  }
  if (!res.ok) throw new ApiError(res.status, await messageFrom(res));
  return res;
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs?: number): Promise<T> {
  const res = await sendAuthed(method, path, body, timeoutMs);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const apiGet = <T>(path: string, timeoutMs?: number) => request<T>('GET', path, undefined, timeoutMs);
export const apiPost = <T>(path: string, body?: unknown, timeoutMs?: number) => request<T>('POST', path, body, timeoutMs);
export const apiPut = <T>(path: string, body?: unknown) => request<T>('PUT', path, body);

/** A file on the phone, as React Native's fetch sends one in a multipart form. */
export interface PhoneFile {
  uri: string;
  name: string;
  type: string;
}

/** Posts one file as multipart/form-data under the field name the API expects. */
export function apiUpload<T>(path: string, file: PhoneFile, field = 'file'): Promise<T> {
  const form = new FormData();
  // React Native's FormData takes { uri, name, type } and streams the file from the phone.
  form.append(field, file as unknown as Blob);
  return request<T>('POST', path, form, UPLOAD_TIMEOUT_MS);
}

/**
 * Fetches a protected file as a data URI an image can show. An image's own request would
 * carry no session and be refused, so the bytes come through here instead.
 */
export async function apiDataUri(path: string): Promise<string> {
  const blob = await (await sendAuthed('GET', path, undefined, UPLOAD_TIMEOUT_MS)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(noApi());
    reader.readAsDataURL(blob);
  });
}
