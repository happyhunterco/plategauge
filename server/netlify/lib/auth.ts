export type AuthenticatedUser = { id: string; email: string | null };

/** Verify a Supabase access token server-side. Never trust a user id supplied by a client. */
export async function authenticatedUser(authorization?: string | null): Promise<AuthenticatedUser | null> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const token = (authorization ?? '').replace(/^Bearer\s+/i, '');
  if (!url || !service || !token) return null;

  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { authorization: `Bearer ${token}`, apikey: service },
  });
  if (!response.ok) return null;
  const user = (await response.json()) as { id?: string; email?: string | null };
  return user.id ? { id: user.id, email: user.email ?? null } : null;
}
