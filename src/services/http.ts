import { config } from '../config';

export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status = 0,
  ) {
    super(message);
  }
}

const MESSAGES: Record<string, string> = {
  rate_limited: 'Too many requests. Try again in a minute.',
  ai_not_configured: 'AI isn’t connected on the server yet.',
  offline: 'You’re offline. Check your connection and try again.',
  timeout: 'That took too long to process. Try a smaller photo, or try again.',
  upstream: 'The AI service had a problem on its end. Try again in a moment.',
};

/** Photo analysis can take longer than a quick lookup; give it real room before giving up client-side. */
const REQUEST_TIMEOUT_MS = 45_000;

export async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  let res: Response;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        ...(config.appKey ? { 'x-app-key': config.appKey } : {}),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new ApiError(MESSAGES.timeout, 'timeout');
    throw new ApiError(MESSAGES.offline, 'offline');
  } finally {
    clearTimeout(timer);
  }
  const raw = await res.text();
  let data: (T & { error?: string }) | null = null;
  try {
    data = raw ? JSON.parse(raw) : ({} as T);
  } catch {
    data = null;
  }
  if (!res.ok) {
    const code = data?.error ?? (res.status === 502 || res.status === 504 ? 'timeout' : `http_${res.status}`);
    // Prefer a human reason the server passed along (e.g. the real Anthropic error) over a generic message.
    const reason = (data as { reason?: string } | null)?.reason;
    const fallback = raw ? `Server error (${res.status}): ${raw.slice(0, 180)}` : `Server error (${res.status}).`;
    throw new ApiError(reason || MESSAGES[code] || fallback, code, res.status);
  }
  if (data == null) throw new ApiError('The server sent back something Vahla couldn’t read. Try again.', 'bad_response', res.status);
  return data;
}
