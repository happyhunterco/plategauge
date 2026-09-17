export const dayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const shiftKey = (k: string, days: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + days);
  return dayKey(d);
};

export const prettyDay = (k: string) => {
  const today = dayKey();
  if (k === today) return 'Today';
  if (k === shiftKey(today, -1)) return 'Yesterday';
  return fromKey(k).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

export const longDate = (k: string) => fromKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
export const timeOf = (ms: number) => new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

export const mealForNow = () => {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast' as const;
  if (h < 15) return 'lunch' as const;
  if (h < 21) return 'dinner' as const;
  return 'snack' as const;
};

/** Monday-first week containing the day */
export const weekOf = (k: string) => {
  const d = fromKey(k);
  const offset = (d.getDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => shiftKey(k, i - offset));
};
