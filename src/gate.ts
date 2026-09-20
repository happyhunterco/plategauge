import { useRouter } from 'expo-router';
import { useStore } from './store';

/** Returns true if the user has an active Pro subscription. */
export function isPro(): boolean {
  const sub = useStore.getState().subscription;
  return sub?.status === 'active' || sub?.status === 'trialing';
}

/** Call before a Pro-only action. Returns true if allowed, redirects to /upgrade if not. */
export function requirePro(router: ReturnType<typeof useRouter>): boolean {
  if (isPro()) return true;
  router.push('/upgrade');
  return false;
}
