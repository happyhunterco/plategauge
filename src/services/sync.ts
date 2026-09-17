import { useStore, type Entry } from '../store';
import { supabase } from './supabase';

/**
 * Cloud copy of the profile and food log (Supabase, row-level security per user).
 * The device store stays the source of truth for speed; writes are pushed best-effort
 * and failed pushes are retried on the next sync.
 */
const uid = () => useStore.getState().account?.id;
const live = () => !!supabase && !!uid() && !useStore.getState().account?.dev;

export async function pushProfile() {
  if (!live()) return;
  const s = useStore.getState();
  const { error } = await supabase!.from('profiles').upsert({
    id: uid(),
    profile: s.profile,
    goals: s.goals,
    goals_manual: s.goalsManual,
    settings: s.settings,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function pushEntry(e: Entry) {
  if (!live()) return;
  const { error } = await supabase!
    .from('food_entries')
    .upsert({ id: e.id, user_id: uid(), day: e.date, meal: e.meal, data: e, updated_at: new Date().toISOString() });
  if (error) useStore.getState().markUnsynced(e.id);
}

export async function removeEntryRemote(id: string) {
  if (!live()) return;
  await supabase!.from('food_entries').delete().eq('id', id);
}

export async function pullAll() {
  if (!live()) return;
  const [{ data: prof }, { data: rows }] = await Promise.all([
    supabase!.from('profiles').select('*').eq('id', uid()).maybeSingle(),
    supabase!.from('food_entries').select('data').eq('user_id', uid()).order('day', { ascending: false }).limit(2000),
  ]);
  useStore.getState().hydrateFromCloud({
    profile: prof?.profile ?? null,
    goals: prof?.goals ?? null,
    goalsManual: !!prof?.goals_manual,
    settings: prof?.settings ?? null,
    entries: (rows ?? []).map((r: { data: Entry }) => r.data),
  });
}

export async function flushUnsynced() {
  if (!live()) return;
  const s = useStore.getState();
  for (const id of s.unsynced) {
    const e = s.entries.find((x) => x.id === id);
    if (e) await pushEntry(e);
  }
  useStore.getState().clearUnsynced();
}
