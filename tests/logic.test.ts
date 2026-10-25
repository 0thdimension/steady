// Run with: npm test
import assert from 'node:assert/strict';
import { allowanceInfo, currentStreak, dayCodes, dayInfo, goalDays, makeCtx, onPlanRate, parseTags, streakRuns } from '../src/data/logic';
import { addDays, fmtHM, isoWeek, monthEnd, parseHours, parseSeconds, fmtSeconds, weekStart, weekday } from '../src/data/dates';
import { newGoal, seedData, stamp } from '../src/data/seed';
import type { Data, Entry, Goal } from '../src/data/types';

let passed = 0;
const test = (name: string, fn: () => void) => {
  try { fn(); passed++; } catch (e) { console.error('FAIL', name); throw e; }
};

const TODAY = '2026-10-24'; // a Saturday
const entry = (g: Goal, date: string, value: number, skipped = false): Entry => ({ ...stamp(), goalId: g.id, date, value, skipped });
const dataWith = (goals: Goal[], entries: Entry[], extra: Partial<Data> = {}): Data => ({ ...seedData(TODAY), goals, entries, ...extra });

test('dates: Monday weeks, ISO week, month end, time parsing', () => {
  assert.equal(weekStart('2026-10-25'), '2026-10-19');
  assert.equal(weekStart('2026-10-19'), '2026-10-19');
  assert.equal(weekday('2026-10-19'), 0);
  assert.equal(weekday('2026-10-25'), 6);
  assert.equal(isoWeek('2026-10-24'), 43);
  assert.equal(monthEnd('2026-02-10'), '2026-02-28');
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(parseSeconds('0:50'), 50);
  assert.equal(parseSeconds('2:05'), 125);
  assert.equal(parseSeconds('45'), 45);
  assert.equal(parseSeconds('abc'), null);
  assert.equal(fmtSeconds(125), '2:05');
  assert.equal(fmtHM(1.8), '1 h 48 m');
  assert.equal(fmtHM(3), '3 h');
  assert.equal(fmtHM(0.25), '15 m');
  assert.equal(parseHours('1:30'), 1.5);
  assert.equal(parseHours('90m'), 1.5);
  assert.equal(parseHours('1h 15m'), 1.25);
  assert.equal(parseHours('2.5'), 2.5);
  assert.equal(parseHours('nope'), null);
});

test('weekly allowance: misses use skips in order, then run out', () => {
  const g = newGoal({ name: 'Work', kind: 'amount', target: 3, unit: 'h', allowance: { per: 'week', count: 2 } }, 0, '2026-10-12');
  const es = [entry(g, '2026-10-19', 3), entry(g, '2026-10-20', 3), entry(g, '2026-10-22', 3), entry(g, '2026-10-23', 1)];
  const ctx = makeCtx(dataWith([g], es), TODAY);
  const days = goalDays(g, '2026-10-19', '2026-10-25', ctx);
  assert.equal(days.get('2026-10-21')!.status, 'skip');
  assert.equal(days.get('2026-10-23')!.status, 'skip');
  assert.equal(days.get('2026-10-23')!.partial, true);
  assert.equal(days.get('2026-10-24')!.status, 'pending');
  assert.equal(days.get('2026-10-25')!.status, 'future');
  const a = allowanceInfo(g, TODAY, ctx);
  assert.deepEqual([a.used, a.left, a.over], [2, 0, 0]);
  assert.equal(a.text, 'None left this week');
});

test('past the allowance: counted, but no "over by" notice', () => {
  const g = newGoal({ name: 'Read', kind: 'check', allowance: { per: 'week', count: 1 } }, 0, '2026-10-12');
  const es = ['2026-10-19', '2026-10-21', '2026-10-23'].map((d) => entry(g, d, 1));
  const ctx = makeCtx(dataWith([g], es), TODAY);
  assert.equal(dayInfo(g, '2026-10-20', ctx).status, 'skip');
  assert.equal(dayInfo(g, '2026-10-22', ctx).status, 'over');
  const a = allowanceInfo(g, TODAY, ctx);
  assert.equal(a.over, 1);
  assert.equal(a.text, 'None left this week');
  assert.deepEqual(a.pips, ['used']);
});

test('skipping today on purpose uses an allowance right away', () => {
  const g = newGoal({ name: 'Teeth', kind: 'check', allowance: { per: 'week', count: 2 } }, 0, '2026-10-19');
  const es = range5(g).concat(entry(g, TODAY, 0, true));
  const ctx = makeCtx(dataWith([g], es), TODAY);
  assert.equal(dayInfo(g, TODAY, ctx).status, 'skip');
  assert.equal(allowanceInfo(g, TODAY, ctx).text, '1 skip left this week');
});
function range5(g: Goal) { return ['2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23'].map((d) => entry(g, d, 1)); }

test('monthly allowance resets on the 1st', () => {
  const g = newGoal({ name: 'Meditate', kind: 'check', allowance: { per: 'month', count: 2 } }, 0, '2026-10-01');
  const missed = new Set(['2026-10-05', '2026-10-15', '2026-10-28', '2026-11-02']);
  const es: Entry[] = [];
  for (let d = '2026-10-01'; d <= '2026-11-05'; d = addDays(d, 1)) if (!missed.has(d)) es.push(entry(g, d, 1));
  const ctx = makeCtx(dataWith([g], es), '2026-11-06');
  assert.equal(dayInfo(g, '2026-10-05', ctx).status, 'skip');
  assert.equal(dayInfo(g, '2026-10-15', ctx).status, 'skip');
  assert.equal(dayInfo(g, '2026-10-28', ctx).status, 'over');
  assert.equal(dayInfo(g, '2026-11-02', ctx).status, 'skip');
  assert.equal(allowanceInfo(g, '2026-10-31', ctx).text, 'None left in October');
  assert.equal(allowanceInfo(g, '2026-11-06', ctx).text, '1 skip left in November');
});

test('set weekdays: unscheduled days never use skips', () => {
  const g = newGoal({ name: 'Exercise', kind: 'check', days: [0, 2, 4, 5], allowance: { per: 'month', count: 2 } }, 0, '2026-10-19');
  const ctx = makeCtx(dataWith([g], [entry(g, '2026-10-19', 1), entry(g, '2026-10-21', 1), entry(g, '2026-10-23', 1)]), TODAY);
  assert.equal(dayInfo(g, '2026-10-20', ctx).status, 'off');
  assert.equal(dayInfo(g, '2026-10-22', ctx).status, 'off');
  assert.equal(allowanceInfo(g, TODAY, ctx).used, 0);
});

test('days before tracking started never count', () => {
  const g = newGoal({ name: 'New', kind: 'check', allowance: { per: 'week', count: 0 } }, 0, '2026-10-22');
  const ctx = makeCtx(dataWith([g], []), TODAY);
  assert.equal(dayInfo(g, '2026-10-21', ctx).status, 'before');
  assert.equal(dayInfo(g, '2026-10-22', ctx).status, 'over');
  assert.equal(allowanceInfo(g, TODAY, ctx).text, 'No skips planned');
});

test('linked goals fill from hours and workouts', () => {
  const work = newGoal({ name: 'Work', kind: 'amount', target: 3, unit: 'h', link: 'workHours' }, 0, '2026-10-19');
  const ex = newGoal({ name: 'Exercise', kind: 'check', link: 'workout' }, 1, '2026-10-19');
  const base = seedData(TODAY);
  const data = dataWith([work, ex], [], {
    time: [{ ...stamp(), projectId: 'p', date: '2026-10-23', minutes: 180, source: 'manual' }],
    exLogs: [{ ...stamp(), exerciseId: base.exercises[0].id, date: '2026-10-23', sets: 3, reps: 10, weight: 35, seconds: null, order: 0 }],
  });
  const ctx = makeCtx(data, TODAY);
  assert.equal(dayInfo(work, '2026-10-23', ctx).status, 'done');
  assert.equal(dayInfo(ex, '2026-10-23', ctx).status, 'done');
  assert.equal(dayInfo(ex, '2026-10-22', ctx).status, 'over');
});

test('a running timer counts toward today', () => {
  const work = newGoal({ name: 'Work', kind: 'amount', target: 1, unit: 'h', link: 'workHours' }, 0, '2026-10-19');
  const data = dataWith([work], []);
  const start = new Date(2026, 9, 24, 9, 0, 0).getTime();
  data.settings = { ...data.settings, timer: { projectId: 'p', startedAt: start } };
  const ctx = makeCtx(data, TODAY, start + 61 * 60000);
  assert.equal(dayInfo(work, TODAY, ctx).status, 'done');
});

test('streak bars: skips bridge, over budget and partial days break', () => {
  const one = streakRuns('ddsdd');
  assert.equal(one.bars.length, 1);
  assert.equal(one.bars[0].count, 4);
  assert.deepEqual(one.bars[0].skips, [2]);
  const two = streakRuns('ddmdd');
  assert.equal(two.bars.length, 2);
  assert.deepEqual(two.marks, [{ at: 2, kind: 'over' }]);
  const off = streakRuns('dodod');
  assert.equal(off.bars.length, 1);
  assert.equal(off.bars[0].count, 3);
  const lone = streakRuns('sdd');
  assert.deepEqual(lone.marks, [{ at: 0, kind: 'skip' }]);
});

test('current streak counts done days back from today', () => {
  const g = newGoal({ name: 'Teeth', kind: 'check', allowance: { per: 'week', count: 2 } }, 0, '2026-10-19');
  const es = ['2026-10-19', '2026-10-20', '2026-10-22', '2026-10-23'].map((d) => entry(g, d, 1));
  const ctx = makeCtx(dataWith([g], es), TODAY);
  assert.equal(dayCodes(g, '2026-10-19', TODAY, ctx), 'ddsddt');
  assert.equal(currentStreak(g, ctx), 4);
});

test('on-plan rate counts planned skips as on plan', () => {
  const g = newGoal({ name: 'Read', kind: 'check', allowance: { per: 'week', count: 1 } }, 0, '2026-10-19');
  const ctx = makeCtx(dataWith([g], [entry(g, '2026-10-19', 1)]), TODAY);
  // Mon done, Tue skip, Wed-Fri over
  assert.equal(onPlanRate([g], '2026-10-19', '2026-10-23', ctx), 2 / 5);
});

test('tags: parsed, lowercased, stripped from the text', () => {
  const r = parseTags('Call dentist #Health and #home');
  assert.deepEqual(r.tags, ['#health', '#home']);
  assert.equal(r.plain, 'Call dentist and');
  assert.deepEqual(parseTags('No tags here').tags, []);
  assert.deepEqual(parseTags('Price is 5#3').tags, []);
});

console.log(`logic tests: ${passed} passed`);
