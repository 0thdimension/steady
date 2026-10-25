import type { Data, Entry, Exercise, ExerciseLog, Goal } from './types';
import {
  addDays, daysBetween, monthEnd, monthName, monthStart, range, toKey, weekEnd, weekStart, weekday,
} from './dates';

export const live = <T extends { deleted?: boolean }>(xs: T[]) => xs.filter((x) => !x.deleted);

export const activeGoals = (data: Data) =>
  live(data.goals).filter((g) => !g.archived).sort((a, b) => a.order - b.order);

// ---------------------------------------------------------------- context

export interface Ctx {
  today: string;
  entries: Map<string, Entry>;
  minutesByDate: Map<string, number>;
  workoutDates: Set<string>;
}

export const entryKey = (goalId: string, date: string) => goalId + '|' + date;

export const makeCtx = (data: Data, today: string, now = Date.now()): Ctx => {
  const entries = new Map<string, Entry>();
  for (const e of data.entries) if (!e.deleted) entries.set(entryKey(e.goalId, e.date), e);
  const minutesByDate = new Map<string, number>();
  for (const t of data.time) if (!t.deleted) minutesByDate.set(t.date, (minutesByDate.get(t.date) ?? 0) + t.minutes);
  const timer = data.settings.timer;
  if (timer) {
    const d = toKey(new Date(timer.startedAt));
    minutesByDate.set(d, (minutesByDate.get(d) ?? 0) + Math.max(0, (now - timer.startedAt) / 60000));
  }
  const workoutDates = new Set(live(data.exLogs).map((l) => l.date));
  return { today, entries, minutesByDate, workoutDates };
};

// ---------------------------------------------------------------- one goal, one day

export const isScheduled = (g: Goal, date: string) =>
  !g.archived && date >= g.startDate && g.days.includes(weekday(date));

export const goalTarget = (g: Goal) => (g.kind === 'check' ? 1 : g.target);

/** The day's value, including what logged hours or workouts fill in automatically. */
export const goalValue = (g: Goal, date: string, ctx: Ctx) => {
  const stored = ctx.entries.get(entryKey(g.id, date))?.value ?? 0;
  if (g.link === 'workHours') {
    const hours = (ctx.minutesByDate.get(date) ?? 0) / 60;
    return g.kind === 'check' ? Math.max(stored, hours >= g.target ? 1 : 0) : Math.max(stored, hours);
  }
  if (g.link === 'workout' && ctx.workoutDates.has(date)) return Math.max(stored, goalTarget(g));
  return stored;
};

export const isDone = (g: Goal, value: number) => value >= goalTarget(g) - 1e-9;

export type DayStatus = 'before' | 'off' | 'future' | 'done' | 'pending' | 'skip' | 'over';

export interface DayInfo {
  status: DayStatus;
  value: number;
  /** Some progress but short of the target. */
  partial: boolean;
  /** Marked "Skip today" on purpose. */
  explicit: boolean;
}

const periodKey = (g: Goal, d: string) =>
  g.allowance.per === 'week' ? weekStart(d) : g.allowance.per === 'month' ? monthStart(d) : weekStart(d);

/**
 * Status of every day from `from` to `to`. Misses use the allowance in date order inside
 * each week or month; once it runs out, a miss is "over" (shown gently, never a reset).
 * Today stays "pending" until it ends, unless it was skipped on purpose.
 */
export const goalDays = (g: Goal, from: string, to: string, ctx: Ctx): Map<string, DayInfo> => {
  const out = new Map<string, DayInfo>();
  const start = g.allowance.per === 'month' ? monthStart(from) : weekStart(from);
  let pk = '';
  let used = 0;
  const allowed = g.allowance.per === 'none' ? 0 : g.allowance.count;
  for (const d of range(start, to)) {
    const k = periodKey(g, d);
    if (k !== pk) { pk = k; used = 0; }
    let info: DayInfo;
    if (!isScheduled(g, d)) {
      info = { status: d < g.startDate ? 'before' : 'off', value: 0, partial: false, explicit: false };
    } else if (d > ctx.today) {
      info = { status: 'future', value: 0, partial: false, explicit: !!ctx.entries.get(entryKey(g.id, d))?.skipped };
    } else {
      const value = goalValue(g, d, ctx);
      const explicit = !!ctx.entries.get(entryKey(g.id, d))?.skipped;
      const done = isDone(g, value);
      let status: DayStatus;
      if (done) status = 'done';
      else if (d === ctx.today && !explicit) status = 'pending';
      else { status = used < allowed ? 'skip' : 'over'; used++; }
      info = { status, value, partial: !done && value > 0, explicit };
    }
    if (d >= from) out.set(d, info);
  }
  return out;
};

export const dayInfo = (g: Goal, date: string, ctx: Ctx) => goalDays(g, date, date, ctx).get(date)!;

// ---------------------------------------------------------------- allowance

export interface AllowanceInfo {
  per: Goal['allowance']['per'];
  count: number;
  used: number;
  over: number;
  left: number;
  text: string;
  /** For the little squares: 'used' | 'free' | 'over' */
  pips: Array<'used' | 'free' | 'over'>;
}

export const allowanceInfo = (g: Goal, date: string, ctx: Ctx): AllowanceInfo => {
  const per = g.allowance.per;
  const [a, b] = per === 'month' ? [monthStart(date), monthEnd(date)] : [weekStart(date), weekEnd(date)];
  const days = goalDays(g, a, b, ctx);
  let misses = 0;
  for (const [d, info] of days) if (d <= date && (info.status === 'skip' || info.status === 'over')) misses++;
  const count = per === 'none' ? 0 : g.allowance.count;
  const used = Math.min(misses, count);
  const over = Math.max(0, misses - count);
  const left = Math.max(0, count - misses);
  const isThisWeek = weekStart(date) === weekStart(ctx.today);
  const when = per === 'month' ? `in ${monthName(date)}` : isThisWeek ? 'this week' : 'that week';
  // No "over by" notices: once the skips are used up, it just says none are left.
  let text: string;
  if (per === 'none' || count === 0) text = 'No skips planned';
  else if (left === 0) text = `None left ${when}`;
  else text = `${left} skip${left === 1 ? '' : 's'} left ${when}`;
  const pips: AllowanceInfo['pips'] = [];
  for (let i = 0; i < count; i++) pips.push(i < used ? 'used' : 'free');
  return { per, count, used, over, left, text, pips };
};

// ---------------------------------------------------------------- the day's numbers

export interface DaySummary {
  scheduled: number;
  done: number;
  partial: number;
}

export const daySummary = (goals: Goal[], date: string, ctx: Ctx): DaySummary => {
  let scheduled = 0, done = 0, partial = 0;
  for (const g of goals) {
    if (!isScheduled(g, date)) continue;
    scheduled++;
    const info = dayInfo(g, date, ctx);
    if (info.status === 'done') done++;
    else if (info.partial) partial++;
  }
  return { scheduled, done, partial };
};

/** Share of finished days that were done or covered by a planned skip. */
export const onPlanRate = (goals: Goal[], from: string, to: string, ctx: Ctx) => {
  let good = 0, all = 0;
  for (const g of goals) {
    for (const [, info] of goalDays(g, from, to, ctx)) {
      if (info.status === 'done' || info.status === 'skip') { good++; all++; }
      else if (info.status === 'over') all++;
    }
  }
  return all ? good / all : null;
};

/** Share of scheduled days that were done (skips count as not done). */
export const doneRate = (goals: Goal[], date: string, ctx: Ctx) => {
  let n = 0, d = 0;
  for (const g of goals) {
    const info = dayInfo(g, date, ctx);
    if (info.status === 'off' || info.status === 'before' || info.status === 'future') continue;
    if (date === ctx.today && info.status === 'pending') { n++; continue; }
    n++;
    if (info.status === 'done') d++;
    else if (info.partial && g.kind === 'amount') d += Math.min(0.99, info.value / g.target) * 0.5;
  }
  return n ? (d / n) * 100 : null;
};

export const minutesBetween = (ctx: Ctx, from: string, to: string) =>
  range(from, to).reduce((s, d) => s + (ctx.minutesByDate.get(d) ?? 0), 0);

/** Same days of last week, so "this week so far" compares fairly. */
export const lastWeekSameSpan = (date: string): [string, string] => {
  const ws = weekStart(date);
  return [addDays(ws, -7), addDays(date, -7)];
};

export const pctChange = (now: number, before: number) => (before ? Math.round(((now - before) / before) * 100) : null);

// ---------------------------------------------------------------- streaks and history codes

/** One character per day: d done, s planned skip, m over budget, h partly done, o not scheduled, t today still open, b before tracking, f future */
export const dayCodes = (g: Goal, from: string, to: string, ctx: Ctx) => {
  const days = goalDays(g, from, to, ctx);
  return range(from, to).map((d) => {
    const info = days.get(d)!;
    switch (info.status) {
      case 'done': return 'd';
      case 'skip': return 's';
      case 'over': return info.partial ? 'h' : 'm';
      case 'pending': return 't';
      case 'off': return 'o';
      case 'before': return 'b';
      default: return 'f';
    }
  }).join('');
};

export interface StreakBar { from: number; to: number; count: number; skips: number[] }
export interface StreakMark { at: number; kind: 'skip' | 'over' | 'partial' }

/** Done days join into bars; planned skips and unscheduled days inside a run keep it going. */
export const streakRuns = (codes: string) => {
  const bars: StreakBar[] = [];
  const marks: StreakMark[] = [];
  const flush = (a: number, b: number) => {
    let f = -1, l = -1, count = 0;
    for (let i = a; i <= b; i++) if (codes[i] === 'd') { if (f < 0) f = i; l = i; count++; }
    for (let i = a; i <= b; i++) if (codes[i] === 's' && (f < 0 || i < f || i > l)) marks.push({ at: i, kind: 'skip' });
    if (f < 0) return;
    const skips: number[] = [];
    for (let i = f; i <= l; i++) if (codes[i] === 's') skips.push(i);
    bars.push({ from: f, to: l, count, skips });
  };
  let a = 0;
  for (let i = 0; i < codes.length; i++) {
    const c = codes[i];
    if (c === 'm' || c === 'h' || c === 't' || c === 'b' || c === 'f') {
      if (i - 1 >= a) flush(a, i - 1);
      if (c === 'm') marks.push({ at: i, kind: 'over' });
      if (c === 'h') marks.push({ at: i, kind: 'partial' });
      a = i + 1;
    }
  }
  if (a <= codes.length - 1) flush(a, codes.length - 1);
  return { bars, marks };
};

/** Done days in the current run, counting back from today (skips bridge, over budget ends it). */
export const currentStreak = (g: Goal, ctx: Ctx, lookback = 400) => {
  const from = addDays(ctx.today, -lookback);
  const codes = dayCodes(g, from, ctx.today, ctx);
  let n = 0;
  for (let i = codes.length - 1; i >= 0; i--) {
    const c = codes[i];
    if (c === 'd') n++;
    else if (c === 's' || c === 'o' || c === 't') continue;
    else break;
  }
  return n;
};

// ---------------------------------------------------------------- exercise

export type ExMetric = 'weight' | 'reps' | 'seconds';

export const exerciseMetric = (logs: ExerciseLog[]): ExMetric => {
  if (logs.some((l) => l.weight != null && l.weight > 0)) return 'weight';
  if (logs.some((l) => l.reps != null && l.reps > 0)) return 'reps';
  return 'seconds';
};

/** One point per workout day: the best set that day for the exercise's main measure. */
export const exerciseSeries = (ex: Exercise, allLogs: ExerciseLog[], from: string, to: string) => {
  const logs = live(allLogs).filter((l) => l.exerciseId === ex.id);
  const metric = exerciseMetric(logs);
  const byDay = new Map<string, number>();
  for (const l of logs) {
    if (l.date < from || l.date > to) continue;
    const v = metric === 'weight' ? l.weight : metric === 'reps' ? l.reps : l.seconds;
    if (v == null || !(v > 0)) continue;
    const prev = byDay.get(l.date);
    const better = prev == null ? true : ex.lowerIsBetter && metric === 'seconds' ? v < prev : v > prev;
    if (better) byDay.set(l.date, v);
  }
  const points = [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([date, value]) => ({ date, value }));
  return { metric, points };
};

/** The most recent earlier log of an exercise, for the "Last time" hint. */
export const lastTime = (exerciseId: string, beforeDate: string, logs: ExerciseLog[]) => {
  const prev = live(logs)
    .filter((l) => l.exerciseId === exerciseId && l.date < beforeDate)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.order - a.order));
  return prev[0] ?? null;
};

// ---------------------------------------------------------------- todos

const TAG_RE = /(^|\s)#([\p{L}\p{N}_-]+)/gu;

export const parseTags = (text: string) => {
  const tags: string[] = [];
  for (const m of text.matchAll(TAG_RE)) {
    const t = '#' + m[2].toLowerCase();
    if (!tags.includes(t)) tags.push(t);
  }
  const plain = text.replace(TAG_RE, '$1').replace(/\s+/g, ' ').trim();
  return { tags, plain: plain || text.trim() };
};

export const BOX_NAMES = ['Urgent & important', 'Important', 'Urgent', 'Other'] as const;

// ---------------------------------------------------------------- misc

export const daysSince = (from: string, to: string) => daysBetween(from, to);
