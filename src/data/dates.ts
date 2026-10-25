// All dates are local calendar days stored as 'YYYY-MM-DD'. Weeks start on Monday.

export const pad = (n: number) => String(n).padStart(2, '0');

export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromKey = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const todayKey = () => toKey(new Date());

export const addDays = (k: string, n: number) => {
  const d = fromKey(k);
  d.setDate(d.getDate() + n);
  return toKey(d);
};

/** 0 = Monday ... 6 = Sunday */
export const weekday = (k: string) => (fromKey(k).getDay() + 6) % 7;

export const weekStart = (k: string) => addDays(k, -weekday(k));
export const weekEnd = (k: string) => addDays(weekStart(k), 6);
export const monthStart = (k: string) => k.slice(0, 8) + '01';
export const monthEnd = (k: string) => {
  const d = fromKey(k);
  return toKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
};
export const daysInMonth = (k: string) => Number(monthEnd(k).slice(8));

export const daysBetween = (a: string, b: string) =>
  Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

/** Inclusive list of day keys from a to b. */
export const range = (a: string, b: string) => {
  const out: string[] = [];
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
  return out;
};

export const WEEKDAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const monthName = (k: string) => fromKey(k).toLocaleDateString('en-US', { month: 'long' });

export const fmtLong = (k: string) =>
  fromKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

export const fmtShort = (k: string) => fromKey(k).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const fmtWeekdayShort = (k: string) => `${WEEKDAY_SHORT[weekday(k)]} ${Number(k.slice(8))}`;

/** "Today", "Tomorrow", "Yesterday", "Mon 26", or "Nov 3" further out. */
export const fmtDue = (k: string, today: string) => {
  const diff = daysBetween(today, k);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return fmtWeekdayShort(k);
  return fmtShort(k);
};

/** ISO-8601 week number (weeks start Monday). */
export const isoWeek = (k: string) => {
  const d = fromKey(k);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
};

export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 3600)}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
};

export const fmtHours = (minutes: number) => {
  const h = minutes / 60;
  return (Math.round(h * 10) / 10).toFixed(1);
};

/** 1.8 -> "1 h 48 m", 3 -> "3 h", 0.25 -> "15 m", 0 -> "0 m" */
export const fmtHM = (hours: number) => {
  const total = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(total / 60), m = total % 60;
  if (!h) return `${m} m`;
  return m ? `${h} h ${m} m` : `${h} h`;
};

/** 1.8 -> "1:48" */
export const fmtHMClock = (hours: number) => {
  const total = Math.max(0, Math.round(hours * 60));
  return `${Math.floor(total / 60)}:${pad(total % 60)}`;
};

/** "1:30", "1.5", "1h 30m", "90m" or "90 min" -> hours, or null. */
export const parseHours = (s: string): number | null => {
  const t = s.trim().toLowerCase().replace(',', '.');
  if (!t) return null;
  let m = t.match(/^(\d+):(\d{1,2})$/);
  if (m) return Number(m[1]) + Number(m[2]) / 60;
  m = t.match(/^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?)?)?)?$/);
  if (m && (m[1] || m[2])) return Number(m[1] ?? 0) + Number(m[2] ?? 0) / 60;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export const isHoursUnit = (unit: string) => /^(h|hr|hrs|hour|hours)$/i.test(unit.trim());

/** 50 -> "0:50", 125 -> "2:05" */
export const fmtSeconds = (sec: number) => `${Math.floor(sec / 60)}:${pad(Math.round(sec % 60))}`;

/** Accepts "50", "0:50", "2:05" or "1:02:05" and returns seconds, or null. */
export const parseSeconds = (s: string): number | null => {
  const t = s.trim();
  if (!t) return null;
  const parts = t.split(':').map((p) => Number(p));
  if (parts.some((p) => !Number.isFinite(p) || p < 0)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
};
