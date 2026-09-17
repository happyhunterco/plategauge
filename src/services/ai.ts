import { Alert } from 'react-native';
import { isWeb } from '../config';
import { foodsFromAi, labelFromAi, recipesFromAi, type LabelRead, type Recipe } from '../../shared/prompts';
import type { FoodItem } from '../../shared/food';
import { useStore } from '../store';
import { ApiError } from './http';
import { runAi } from './aiTransport';

/**
 * Apple guideline 5.1.2(i): disclose and get permission before personal data goes to a third-party AI.
 * Asked once; changeable in Profile.
 */
export function ensureAiConsent(): Promise<void> {
  const { aiConsent, setAiConsent } = useStore.getState();
  if (aiConsent === true || isWeb) return Promise.resolve();
  const off = new ApiError('AI features are off. Turn them on in Profile to use this.', 'consent');
  if (aiConsent === false) return Promise.reject(off);
  return new Promise((resolve, reject) => {
    Alert.alert(
      'Use AI food analysis?',
      'To analyze photos and descriptions, PlateGauge sends that photo or text, plus your remaining calories, to Anthropic’s Claude. Your food log and account details are not sent.',
      [
        {
          text: 'Don’t allow',
          style: 'cancel',
          onPress: () => {
            setAiConsent(false);
            reject(off);
          },
        },
        {
          text: 'Allow',
          onPress: () => {
            setAiConsent(true);
            resolve();
          },
        },
      ],
      { cancelable: false },
    );
  });
}

export async function analyzePhoto(base64: string, note?: string): Promise<{ foods: FoodItem[]; notes: string }> {
  await ensureAiConsent();
  const raw = await runAi('photo', { image: base64, note });
  // The server already normalized; the preview path returns raw model JSON.
  const foods = Array.isArray(raw.foods) && (raw.foods as FoodItem[])[0]?.source ? (raw.foods as FoodItem[]) : foodsFromAi(raw, 'photo_estimate');
  return { foods, notes: typeof raw.notes === 'string' ? raw.notes : '' };
}

export async function readLabel(base64: string): Promise<LabelRead> {
  await ensureAiConsent();
  const raw = await runAi('label', { image: base64 });
  return raw.label ? (raw.label as LabelRead) : labelFromAi(raw);
}

export async function describeFood(text: string): Promise<FoodItem[]> {
  await ensureAiConsent();
  const raw = await runAi('text', { text });
  return Array.isArray(raw.foods) && (raw.foods as FoodItem[])[0]?.source ? (raw.foods as FoodItem[]) : foodsFromAi(raw, 'estimate');
}

export async function pantryRecipes(pantry: string[], prompt: string, left: unknown): Promise<Recipe[]> {
  await ensureAiConsent();
  return recipesFromAi(await runAi('kitchen', { pantry, prompt, left }));
}

export async function moodIdeas(text: string): Promise<FoodItem[]> {
  await ensureAiConsent();
  return foodsFromAi(await runAi('ideas', { text }), 'estimate', 'ideas');
}
