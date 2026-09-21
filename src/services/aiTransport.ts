import { hasServer, isWeb } from '../config';
import { extractJson, PROMPTS, type AiTask } from '../../shared/prompts';
import { api, ApiError } from './http';

/**
 * Where AI requests go:
 *  1. The Vahla server (the real app).
 *  2. Inside the claude.ai preview, Claude via the page's `sample` capability.
 *  3. Nowhere — the feature says it isn't connected. It never returns made-up food.
 */

type SampleFn = ((input: string, opts?: { images?: Blob[]; modelTier?: string; cache?: boolean }) => Promise<{ text: string }>) & {
  limits?: () => Promise<{ images?: unknown }>;
};
type ClaudeRuntime = { use: (name: string) => Promise<unknown> };

let samplePromise: Promise<SampleFn | null> | null = null;
function previewSample(): Promise<SampleFn | null> {
  if (!isWeb) return Promise.resolve(null);
  const rt = (globalThis as { claude?: ClaudeRuntime }).claude;
  if (!rt?.use) return Promise.resolve(null);
  samplePromise ??= rt
    .use('sample')
    .then((s) => (s as SampleFn) ?? null)
    .catch(() => null);
  return samplePromise;
}

export async function aiAvailable(): Promise<'server' | 'preview' | null> {
  if (hasServer) return 'server';
  return (await previewSample()) ? 'preview' : null;
}

function base64ToBlob(b64: string, type = 'image/jpeg'): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

const PREVIEW_ERRORS: Record<string, string> = {
  not_granted: 'Allow Claude in the preview to analyze food.',
  rate_limited: 'Too many requests. Try again in a minute.',
  images_unavailable: 'Photo analysis isn’t available in this view.',
  image_rejected: 'That photo couldn’t be read. Try another one.',
};

/** Returns the parsed JSON the task's prompt asks for. */
export async function runAi(
  task: AiTask,
  payload: { text?: string; image?: string; note?: string; left?: unknown; pantry?: string[]; prompt?: string },
): Promise<Record<string, unknown>> {
  if (hasServer) return api('/api/ai', { method: 'POST', body: JSON.stringify({ task, ...payload }) });

  const sample = await previewSample();
  if (!sample) throw new ApiError('AI food analysis isn’t connected yet. Add your server URL to turn it on.', 'ai_not_configured');

  const lines: string[] = [PROMPTS[task]];
  if (task === 'photo') lines.push(`Analyze this meal.${payload.note ? ` The person says: ${payload.note}` : ''}`);
  if (task === 'label') lines.push('Read this nutrition label.');
  if (task === 'text') lines.push(`What I ate: ${payload.text ?? ''}`);
  if (task === 'kitchen')
    lines.push(
      `Remaining today: ${JSON.stringify(payload.left)}\nPantry: ${(payload.pantry ?? []).join(', ')}\nIn the mood for: ${payload.prompt || 'anything'}`,
    );
  if (task === 'ideas') lines.push(payload.text ?? '');
  try {
    const images = payload.image ? [base64ToBlob(payload.image)] : undefined;
    const { text } = await sample(lines.join('\n\n'), { images, cache: false });
    return extractJson(text);
  } catch (e) {
    const code = (e as { code?: string }).code ?? 'ai_failed';
    if (e instanceof SyntaxError) throw new ApiError('Couldn’t read the analysis. Try again.', 'parse');
    throw new ApiError(PREVIEW_ERRORS[code] ?? 'Analysis failed. Try again.', code);
  }
}
