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
};

export async function api<T>(path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${config.apiUrl}${path}`, {
      ...init,
      headers: {
        'content-type': 'application/json',
        ...(config.appKey ? { 'x-app-key': config.appKey } : {}),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError(MESSAGES.offline, 'offline');
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    const code = data?.error ?? `http_${res.status}`;
    throw new ApiError(MESSAGES[code] ?? 'PlateGauge couldn’t reach the nutrition service. Try again.', code, res.status);
  }
  return data;
}
