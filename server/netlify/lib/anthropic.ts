import { env } from './http';

type Content = { type: 'text'; text: string } | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } };

/** Minimal Claude Messages call. The key stays on the server. */
export async function claude(system: string, content: Content[], maxTokens = 1500): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: env('ANTHROPIC_MODEL') || 'claude-sonnet-5', max_tokens: maxTokens, system, messages: [{ role: 'user', content }] }),
  });
  if (res.status === 429) throw Object.assign(new Error('rate_limited'), { status: 429 });
  if (!res.ok) {
    console.error('anthropic', res.status, (await res.text()).slice(0, 500));
    throw Object.assign(new Error('upstream'), { status: 502 });
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (data.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
}

export const aiConfigured = () => !!env('ANTHROPIC_API_KEY');
