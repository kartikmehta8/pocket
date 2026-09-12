/**
 * The transport. Every call answers a result union, so a failing panel
 * degrades instead of taking the page down, and the credential never leaves
 * the server.
 */

import 'server-only';

import { sessionToken } from './session';

/** Successful call carrying the unwrapped payload. */
export interface ApiOk<T> {
  ok: true;
  data: T;
}

/** Failed call carrying a display-safe message and the contract error code. */
export interface ApiErr {
  ok: false;
  code: string;
  message: string;
}

/** Result of any Pocket API call — the transport never throws at the call site. */
export type ApiResult<T> = ApiOk<T> | ApiErr;

const DEFAULT_BASE_URL = 'http://localhost:8080';

/** Resolve the API base URL from the server environment, without a trailing slash. */
function baseUrl(): string {
  return (process.env.POCKET_API_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
}

/** Narrow an unknown JSON body to a plain object, or `null` if it is not one. */
function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Pull `{ error: { code, message } }` out of a contract failure envelope. */
function readError(body: unknown, status: number): ApiErr {
  const envelope = asRecord(asRecord(body)?.['error']);
  const code = typeof envelope?.['code'] === 'string' ? envelope['code'] : `HTTP_${status}`;
  const message =
    typeof envelope?.['message'] === 'string'
      ? envelope['message']
      : `Request failed with status ${status}.`;
  return { ok: false, code, message };
}

/**
 * Resolve the credential this request should present.
 *
 * The signed-in person's token wins. `POCKET_API_KEY` is a fallback for running
 * the dashboard against a single tenant with no identity provider configured,
 * which is what local development and the offline demo do.
 *
 * @returns The bearer token, or `null` when the caller is anonymous.
 */
async function credential(): Promise<string | null> {
  return (await sessionToken()) ?? process.env.POCKET_API_KEY ?? null;
}

/**
 * Perform one authenticated request against the Pocket API.
 *
 * The credential never leaves the server: this module is marked `server-only`,
 * so it cannot be pulled into the browser bundle.
 *
 * @param method HTTP verb.
 * @param path Path below the base URL, starting with `/v1`.
 * @param init Optional JSON body and extra headers.
 * @returns A result union — transport failures become `ApiErr`, never a throw.
 *
 * @remarks No content is an answer, not a malformed one, and a delete says so
 * this way.
 *
 * ponytail: the envelope is trusted to match API_CONTRACT.md rather than being
 * re-validated field by field. Ceiling: contract drift surfaces as a blank cell
 * instead of a caught error. Upgrade path: a zod schema per endpoint, parsed
 * right here.
 */
export async function request<T>(
  method: string,
  path: string,
  init: { body?: unknown; headers?: Record<string, string> } = {},
): Promise<ApiResult<T>> {
  const key = await credential();
  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        ...init.headers,
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      cache: 'no-store',
    });

    if (response.status === 204) return { ok: true, data: {} as T };

    const body: unknown = await response.json().catch(() => null);
    if (!response.ok) return readError(body, response.status);

    const record = asRecord(body);
    if (record === null) {
      return { ok: false, code: 'MALFORMED_RESPONSE', message: 'The API returned a non-object.' };
    }
    return { ok: true, data: record as T };
  } catch {
    return {
      ok: false,
      code: 'UNREACHABLE',
      message: 'Could not reach the Pocket API. Check that it is running.',
    };
  }
}

/** Build a query string from defined, non-empty values only. */
export function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
