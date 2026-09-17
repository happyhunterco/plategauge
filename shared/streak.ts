/**
 * A day counts toward the streak when at least one food is logged.
 * If today has nothing yet, the streak through yesterday is still shown
 * (the day isn't over), flagged so the UI can nudge without shaming.
 */
export function shiftDay(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function streakInfo(loggedDays: Iterable<string>, today: string) {
  const days = new Set(loggedDays);
  const todayLogged = days.has(today);
  let current = 0;
  for (let d = todayLogged ? today : shiftDay(today, -1); days.has(d); d = shiftDay(d, -1)) current++;
  let best = 0;
  const sorted = [...days].filter((d) => d <= today).sort();
  let run = 0;
  let prev = '';
  for (const d of sorted) {
    run = prev && shiftDay(prev, 1) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return { current, best, todayLogged };
}
