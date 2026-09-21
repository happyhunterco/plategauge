export type GateState = { hydrated: boolean; onboarded: boolean; signedIn: boolean };

const AUTH_SCREENS = ['account', 'reset-password', 'privacy', 'terms'];

/**
 * Where a user is allowed to be. Returns a path to redirect to, or null to stay.
 * Onboarding comes first, then an account is required before any tracker screen.
 */
export function gateRedirect(s: GateState, segments: string[]): string | null {
  if (!s.hydrated) return null;
  const top = segments[0] ?? '';
  const inSetup = top === 'setup';
  const inAuth = AUTH_SCREENS.includes(top);
  if (!s.signedIn) {
    if (!s.onboarded) return inSetup || inAuth ? null : '/setup';
    return inAuth || inSetup ? null : '/account';
  }
  if (!s.onboarded) return inSetup ? null : '/setup';
  if (top === 'account') return '/';
  return null;
}
