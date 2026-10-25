import { useMemo, useState } from 'react';
import { useCtx, useStore, useTheme } from '../data/store';
import {
  activeGoals, currentStreak, dayCodes, dayInfo, doneRate, exerciseSeries, live, onPlanRate, streakRuns,
} from '../data/logic';
import type { Ctx, ExMetric } from '../data/logic';
import { fmtHM,
  addDays, daysBetween, fmtSeconds, fmtShort, fromKey, range, weekStart, weekday, WEEKDAY_LETTERS,
} from '../data/dates';
import type { Exercise, Goal } from '../data/types';
import { Delta, Empty, Panel, Seg, rgba, scaleY, smoothPath, useColor } from '../components/ui';

type RangeKey = '14' | '30' | '90';
const RANGES: Array<{ value: RangeKey; label: string }> = [
  { value: '14', label: '2 weeks' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

const STRIPES = 'repeating-linear-gradient(135deg, rgba(20,19,18,0.55) 0 3px, rgba(20,19,18,0) 3px 7px)';

const avg = (xs: Array<number | null>) => {
  const v = xs.filter((x): x is number => x != null);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};
const sum = (xs: Array<number | null>) => xs.reduce<number>((s, x) => s + (x ?? 0), 0);
const signedPct = (now: number | null, before: number | null) => {
  if (now == null || before == null || before === 0) return null;
  const p = Math.round(((now - before) / before) * 100);
  return p;
};
const pctText = (p: number) => (p > 0 ? '+' : p < 0 ? '−' : '') + Math.abs(p) + '%';
const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- trend cards

interface CardData {
  key: string;
  label: string;
  color: string;
  cur: Array<number | null>;
  prev: Array<number | null>;
  value: string;
  sub: string;
  delta: string | null;
  tone: 'up' | 'neutral';
  empty: boolean;
  aria: string;
}

function TrendCard({ c }: { c: CardData }) {
  const vals: number[] = [];
  for (const v of [...c.cur, ...c.prev]) if (v != null) vals.push(v);
  const Y = scaleY(vals.length ? vals : [0, 1], 12, 80);
  const X = (i: number) => 12 + i * (276 / 6);
  const toPts = (a: Array<number | null>) => {
    const out: Array<[number, number]> = [];
    a.forEach((v, i) => { if (v != null) out.push([X(i), Y(v)]); });
    return out;
  };
  const cp = toPts(c.cur);
  const pp = toPts(c.prev);
  const last = cp[cp.length - 1];
  return (
    <section className="glass panel" style={{ gap: 6, padding: '18px 20px 14px' }} aria-label={c.label}>
      <div className="between" style={{ flexWrap: 'nowrap' }}>
        <h2 className="caps">{c.label}</h2>
        {c.delta && <Delta tone={c.tone} up={c.tone === 'up'}>{c.delta}</Delta>}
      </div>
      <svg className="chart-svg" viewBox="0 0 300 90" role="img" aria-label={c.aria}>
        {c.empty ? (
          <path d="M12 50 H288" fill="none" stroke="var(--prev-line)" strokeWidth="2.5" strokeDasharray="4 6" strokeLinecap="round" />
        ) : (
          <>
            <path d={smoothPath(pp)} fill="none" stroke="var(--prev-line)" strokeWidth="2.5" strokeLinecap="round" />
            <path d={smoothPath(cp)} fill="none" stroke={c.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {last && <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--dot-fill)" stroke={c.color} strokeWidth="2.5" />}
          </>
        )}
      </svg>
      <div className="between" style={{ alignItems: 'baseline', flexWrap: 'nowrap' }}>
        <span className="num" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{c.empty ? '–' : c.value}</span>
        <span className="muted" style={{ fontSize: 12, textAlign: 'right' }}>{c.empty ? 'Shows up after a few days' : c.sub}</span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- streak grid

interface StreakRow {
  goal: Goal;
  color: string;
  bars: ReturnType<typeof streakRuns>['bars'];
  marks: ReturnType<typeof streakRuns>['marks'];
  now: number;
  aria: string;
}

function StreakGrid({ rows, days, today }: { rows: StreakRow[]; days: string[]; today: string }) {
  const n = days.length;
  const cw = 100 / n;
  const inset = n > 45 ? 1.5 : 3;
  const minCount = n > 45 ? 3 : 1;
  const todayIdx = days.indexOf(today);
  const sparse = n > 45;
  const months: Array<{ at: number; label: string }> = [];
  days.forEach((d, i) => {
    if (i === 0 || d.endsWith('-01')) months.push({ at: i, label: fromKey(d).toLocaleDateString('en-US', { month: 'short' }) });
  });
  const band = todayIdx >= 0 ? (
    <div aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayIdx * cw}%`, width: `${cw}%`, background: 'var(--today-band)' }} />
  ) : null;
  const cols = '130px minmax(0, 1fr) 52px';

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: n > 45 ? 900 : 640, display: 'flex', flexDirection: 'column' }}>
        <div aria-hidden="true" style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'end' }}>
          <span />
          <div style={{ position: 'relative', paddingBottom: 6 }}>
            {todayIdx >= 0 && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${todayIdx * cw}%`, width: `${cw}%`, borderRadius: '10px 10px 0 0', background: 'var(--today-band)' }} />
            )}
            <div style={{ position: 'relative', height: 16 }}>
              {months.map((m) => (
                <span key={m.at} style={{ position: 'absolute', left: `${m.at * cw}%`, fontSize: 11, fontWeight: 800, color: 'var(--sub)', whiteSpace: 'nowrap', paddingLeft: 2 }}>{m.label}</span>
              ))}
            </div>
            <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
              {days.map((d, i) => {
                const isToday = i === todayIdx;
                const show = !sparse || weekday(d) === 0 || isToday;
                const color = isToday ? 'var(--today-text)' : 'var(--sub)';
                return (
                  <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, paddingTop: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color, visibility: show ? 'visible' : 'hidden' }}>{WEEKDAY_LETTERS[weekday(d)]}</span>
                    <span className="num" style={{ fontSize: 11, fontWeight: isToday ? 800 : 600, color, visibility: show ? 'visible' : 'hidden' }}>{Number(d.slice(8))}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--sub)', textAlign: 'right', paddingBottom: 8 }}>Now</span>
        </div>

        {rows.map((r) => (
          <div key={r.goal.id} style={{ display: 'grid', gridTemplateColumns: cols, gap: 12, alignItems: 'center', height: 44 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, fontSize: 14, fontWeight: 700 }}>
              <span aria-hidden="true" style={{ flex: 'none', width: 8, height: 8, borderRadius: '50%', background: r.color }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.goal.name}</span>
            </span>
            <div role="img" aria-label={r.aria} style={{ position: 'relative', height: 44 }}>
              {band}
              {r.marks.map((m) => {
                if (m.kind === 'skip') {
                  return <span key={'s' + m.at} aria-hidden="true" style={{ position: 'absolute', top: 16, height: 12, boxSizing: 'border-box', borderRadius: 6, border: `1.5px dashed ${r.color}`, left: `calc(${m.at * cw}% + ${inset + 1}px)`, width: `calc(${cw}% - ${(inset + 1) * 2}px)` }} />;
                }
                const base: React.CSSProperties = { position: 'absolute', top: 17, width: 10, height: 10, boxSizing: 'border-box', borderRadius: '50%', left: `calc(${(m.at + 0.5) * cw}% - 5px)` };
                return m.kind === 'over'
                  ? <span key={'o' + m.at} aria-hidden="true" style={{ ...base, width: 6, height: 6, top: 19, left: `calc(${(m.at + 0.5) * cw}% - 3px)`, background: 'var(--faint)' }} />
                  : <span key={'p' + m.at} aria-hidden="true" style={{ ...base, border: `2.5px solid ${r.color}` }} />;
              })}
              {r.bars.map((b) => {
                const span = b.to - b.from + 1;
                return (
                  <div
                    key={b.from}
                    aria-hidden="true"
                    style={{
                      position: 'absolute', top: 8, height: 28, boxSizing: 'border-box', borderRadius: 14, overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: span >= minCount ? 9 : 0,
                      left: `calc(${b.from * cw}% + ${inset}px)`, width: `calc(${span * cw}% - ${inset * 2}px)`, background: r.color,
                    }}
                  >
                    {b.skips.map((i) => (
                      <span key={i} style={{ position: 'absolute', top: 0, bottom: 0, background: STRIPES, left: `${((i - b.from) / span) * 100}%`, width: `${100 / span}%` }} />
                    ))}
                    {span >= minCount && <span className="num" style={{ position: 'relative', fontSize: 12, fontWeight: 800, color: '#141312' }}>{b.count}</span>}
                  </div>
                );
              })}
            </div>
            <span className="num" style={{ textAlign: 'right', fontSize: 15, fontWeight: 800, color: 'var(--sub)' }}>{r.now}</span>
          </div>
        ))}

        <div aria-hidden="true" style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginTop: 12, paddingLeft: 142, fontSize: 12, fontWeight: 600, color: 'var(--sub)' }}>
          <span className="row" style={{ gap: 8 }}><span style={{ width: 26, height: 12, borderRadius: 6, background: 'var(--legend)' }} />Done in a row</span>
          <span className="row" style={{ gap: 8 }}><span style={{ width: 26, height: 12, borderRadius: 6, background: `${STRIPES}, var(--legend)` }} />Planned skip</span>
          <span className="row" style={{ gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--faint)' }} />Missed</span>
          <span className="row" style={{ gap: 8 }}><span style={{ width: 10, height: 10, boxSizing: 'border-box', borderRadius: '50%', border: '2px solid var(--legend)' }} />Partly done</span>
          <span className="row" style={{ gap: 8 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: 'var(--today-band)' }} />Today</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- exercise cards

interface ExCard {
  ex: Exercise;
  color: string;
  metricLabel: string;
  latest: string;
  note: string;
  better: boolean;
  line: string;
  area: string;
  dot: [number, number] | null;
  firstLabel: string;
  lastLabel: string;
  aria: string;
}

const fmtMetric = (metric: ExMetric, v: number, unit: string) =>
  metric === 'weight' ? `${round1(v)} ${unit}` : metric === 'reps' ? `${v} reps` : fmtSeconds(v);

function ExerciseCard({ c, fillAlpha }: { c: ExCard; fillAlpha: number }) {
  return (
    <div className="tile" style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 16 }}>
      <span className="row" style={{ gap: 8, fontSize: 14, fontWeight: 800 }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flex: 'none' }} />
        {c.ex.name}
      </span>
      <span className="label" style={{ fontSize: 12, fontWeight: 600 }}>{c.metricLabel}</span>
      <span className="big-num" style={{ marginTop: 6, fontSize: 24 }}>{c.latest}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: c.better ? 'var(--up-text)' : 'var(--sub)' }}>{c.note}</span>
      <svg className="chart-svg" viewBox="0 0 220 80" role="img" aria-label={c.aria} style={{ marginTop: 8 }}>
        {c.area && <path d={c.area} fill={rgba(c.color, fillAlpha)} stroke="none" />}
        {c.line && <path d={c.line} fill="none" stroke={c.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}
        {c.dot && <circle cx={c.dot[0]} cy={c.dot[1]} r="3.5" fill="var(--dot-fill)" stroke={c.color} strokeWidth="2.2" />}
      </svg>
      <div aria-hidden="true" className="num faint" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span>{c.firstLabel}</span><span>{c.lastLabel}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- screen

const countStatus = (goals: Goal[], d: string, ctx: Ctx) => {
  let n = 0;
  for (const g of goals) {
    const s = dayInfo(g, d, ctx).status;
    if (s === 'skip' || s === 'over') n++;
  }
  return n;
};

export default function Progress() {
  const data = useStore((s) => s.data);
  const today = useStore((s) => s.today);
  const ctx = useCtx();
  const color = useColor();
  const theme = useTheme();
  const [rangeKey, setRangeKey] = useState<RangeKey>('30');
  const [off, setOff] = useState<Record<string, boolean>>({});
  const [exOff, setExOff] = useState<Record<string, boolean>>({});

  const goals = useMemo(() => activeGoals(data), [data]);
  const on = useMemo(() => goals.filter((g) => !off[g.id]), [goals, off]);
  const n = Number(rangeKey);
  const from = addDays(today, -(n - 1));
  const days = useMemo(() => range(from, today), [from, today]);

  const ws = weekStart(today);
  const lastWs = addDays(ws, -7);
  const thisDays = useMemo(() => range(ws, today), [ws, today]);
  const lastDays = useMemo(() => range(lastWs, addDays(ws, -1)), [lastWs, ws]);
  const lastSpan = useMemo(() => range(lastWs, addDays(today, -7)), [lastWs, today]);
  const spanLabel = thisDays.length === 7 ? 'the end of last week' : `last ${WEEKDAY_SHORT_FULL[weekday(today)]}`;

  // ---- trend cards
  const cards = useMemo<CardData[]>(() => {
    const out: CardData[] = [];

    // (a) goals hit
    const aCur = thisDays.map((d) => doneRate(on, d, ctx));
    const aPrev = lastDays.map((d) => doneRate(on, d, ctx));
    const aNow = avg(aCur);
    const aBefore = avg(lastSpan.map((d) => doneRate(on, d, ctx)));
    const aP = signedPct(aNow, aBefore);
    out.push({
      key: 'goals', label: 'Goals hit · this week', color: color('green'), cur: aCur, prev: aPrev,
      value: aNow == null ? '–' : `${Math.round(aNow)}%`,
      sub: aBefore == null ? 'Nothing to compare yet' : `${Math.round(aBefore)}% by ${spanLabel}`,
      delta: aP == null ? null : pctText(aP), tone: aP != null && aP > 0 ? 'up' : 'neutral',
      empty: aCur.every((v) => v == null) && aPrev.every((v) => v == null),
      aria: `Share of goals done each day this week against last week${aNow == null ? '' : `: ${Math.round(aNow)} percent so far`}${aBefore == null ? '' : `, ${Math.round(aBefore)} percent by this point last week`}`,
    });

    // (b) work hours
    const workGoal = goals.find((g) => g.link === 'workHours');
    const hrs = (d: string) => (ctx.minutesByDate.get(d) ?? 0) / 60;
    const bCur = thisDays.map(hrs);
    const bPrev = lastDays.map(hrs);
    const bNow = sum(bCur);
    const bBefore = sum(lastSpan.map(hrs));
    const bP = signedPct(bNow, bBefore);
    out.push({
      key: 'work', label: 'Work hours · this week', color: color(workGoal?.color ?? 'blue'), cur: bCur, prev: bPrev,
      value: fmtHM(bNow), sub: `${fmtHM(bBefore)} by ${spanLabel}`,
      delta: bP == null ? null : pctText(bP), tone: bP != null && bP > 0 ? 'up' : 'neutral',
      empty: bNow === 0 && sum(bPrev) === 0,
      aria: `Work hours each day this week against last week: ${round1(bNow)} hours so far, ${round1(bBefore)} by this point last week`,
    });

    // (c) skips used
    const cCur = thisDays.map((d) => countStatus(goals, d, ctx));
    const cPrev = lastDays.map((d) => countStatus(goals, d, ctx));
    const cNow = sum(cCur);
    const cBefore = sum(lastSpan.map((d) => countStatus(goals, d, ctx)));
    const cDiff = cNow - cBefore;
    const anyTracked = goals.some((g) => g.startDate <= addDays(today, -1));
    out.push({
      key: 'skips', label: 'Skips used · this week', color: color('gold'), cur: cCur, prev: cPrev,
      value: String(cNow), sub: `${cBefore} by ${spanLabel}`,
      delta: !anyTracked ? null : cDiff === 0 ? 'Same' : (cDiff > 0 ? '+' : '−') + Math.abs(cDiff), tone: 'neutral',
      empty: !anyTracked,
      aria: `Skips used each day this week against last week: ${cNow} so far, ${cBefore} by this point last week`,
    });

    // (d) first plain amount goal, or the on-plan rate
    const amountGoal = goals.find((g) => g.kind === 'amount' && g.link === 'none');
    if (amountGoal) {
      const val = (d: string) => {
        const info = dayInfo(amountGoal, d, ctx);
        return info.status === 'off' || info.status === 'before' || info.status === 'future' ? null : info.value;
      };
      const dCur = thisDays.map(val);
      const dPrev = lastDays.map(val);
      const dNow = avg(dCur);
      const dBefore = avg(lastSpan.map(val));
      const dP = signedPct(dNow, dBefore);
      const unit = amountGoal.unit ? ` ${amountGoal.unit}` : '';
      out.push({
        key: 'amount', label: `${amountGoal.name} · ${amountGoal.unit || 'amount'} a day`, color: color(amountGoal.color), cur: dCur, prev: dPrev,
        value: dNow == null ? '–' : `${round1(dNow)}${unit}`,
        sub: dBefore == null ? 'Nothing to compare yet' : `Last week ${round1(dBefore)} a day`,
        delta: dP == null ? null : dP === 0 ? 'Same' : pctText(dP), tone: dP != null && dP > 0 ? 'up' : 'neutral',
        empty: dCur.every((v) => v == null) && dPrev.every((v) => v == null),
        aria: `${amountGoal.name} each day this week against last week${dNow == null ? '' : `: about ${round1(dNow)}${unit} a day`}`,
      });
    } else {
      const rate = (d: string) => { const r = onPlanRate(goals, d, d, ctx); return r == null ? null : r * 100; };
      const eCur = thisDays.map(rate);
      const ePrev = lastDays.map(rate);
      const eNow = avg(eCur);
      const eBefore = avg(lastSpan.map(rate));
      const eP = signedPct(eNow, eBefore);
      out.push({
        key: 'plan', label: 'On plan · this week', color: color('sky'), cur: eCur, prev: ePrev,
        value: eNow == null ? '–' : `${Math.round(eNow)}%`,
        sub: eBefore == null ? 'Nothing to compare yet' : `${Math.round(eBefore)}% by ${spanLabel}`,
        delta: eP == null ? null : pctText(eP), tone: eP != null && eP > 0 ? 'up' : 'neutral',
        empty: eCur.every((v) => v == null) && ePrev.every((v) => v == null),
        aria: 'Share of finished days that were done or covered by a planned skip, this week against last week',
      });
    }
    return out;
  }, [on, goals, ctx, thisDays, lastDays, lastSpan, color, today, spanLabel]);

  // ---- streak rows
  const streakRows = useMemo<StreakRow[]>(() => on.map((g) => {
    const codes = dayCodes(g, from, today, ctx);
    const { bars, marks } = streakRuns(codes);
    const now = currentStreak(g, ctx);
    const best = bars.reduce((m, b) => Math.max(m, b.count), 0);
    const skips = [...codes].filter((c) => c === 's').length;
    const overs = [...codes].filter((c) => c === 'm').length;
    return {
      goal: g, color: color(g.color), bars, marks, now,
      aria: `${g.name}: current streak ${now} ${now === 1 ? 'day' : 'days'}, longest ${best} in the last ${n} days, ${skips} planned ${skips === 1 ? 'skip' : 'skips'}, ${overs} missed`,
    };
  }), [on, from, today, ctx, color, n]);

  // ---- exercise
  const unit = data.settings.weightUnit;
  const exercises = useMemo(() => live(data.exercises).filter((e) => !e.archived).sort((a, b) => a.order - b.order), [data.exercises]);
  const exWithData = useMemo(() => exercises
    .map((ex) => ({ ex, series: exerciseSeries(ex, data.exLogs, from, today) }))
    .filter((x) => x.series.points.length > 0), [exercises, data.exLogs, from, today]);
  const exCards = useMemo<ExCard[]>(() => exWithData.filter((x) => !exOff[x.ex.id]).map(({ ex, series }) => {
    const { metric, points } = series;
    const c = color(ex.color);
    const vals = points.map((p) => p.value);
    const Y = scaleY(vals, 10, 70);
    const span = Math.max(1, n - 1);
    const pts: Array<[number, number]> = points.map((p) => [8 + (daysBetween(from, p.date) / span) * 204, Y(p.value)]);
    const first = points[0], last = points[points.length - 1];
    const dv = last.value - first.value;
    const lowerBetter = ex.lowerIsBetter && metric === 'seconds';
    const better = lowerBetter ? dv < 0 : dv > 0;
    const since = fmtShort(first.date);
    const size = Math.abs(dv);
    let note: string;
    if (points.length < 2) note = 'First log in this range';
    else if (dv === 0) note = `Same as ${since}`;
    else if (metric === 'weight') note = `${dv > 0 ? 'Up' : 'Down'} ${round1(size)} ${unit} since ${since}`;
    else if (metric === 'reps') note = `${dv > 0 ? '+' : '−'}${size} reps since ${since}`;
    else if (lowerBetter) note = `${fmtSeconds(size)} ${dv < 0 ? 'faster' : 'slower'} since ${since}`;
    else note = `${dv > 0 ? '+' : '−'}${fmtSeconds(size)} since ${since}`;
    const metricLabel = metric === 'weight' ? `Top weight (${unit})` : metric === 'reps' ? 'Reps per set' : lowerBetter ? 'Time · lower is better' : 'Hold time';
    const line = pts.length > 1 ? smoothPath(pts) : '';
    const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)} 78 L${pts[0][0].toFixed(1)} 78 Z` : '';
    return {
      ex, color: c, metricLabel, latest: fmtMetric(metric, last.value, unit), note, better: points.length > 1 && better,
      line, area, dot: pts[pts.length - 1] ?? null,
      firstLabel: fmtShort(first.date), lastLabel: fmtShort(last.date),
      aria: `${ex.name}, ${metricLabel}: ${fmtMetric(metric, first.value, unit)} on ${fmtShort(first.date)}, ${fmtMetric(metric, last.value, unit)} on ${fmtShort(last.date)}, ${points.length} workouts`,
    };
  }), [exWithData, exOff, color, n, from, unit]);

  // ---- this week vs last
  const week = useMemo(() => {
    let ahead = 0, behind = 0;
    const count = (g: Goal, ds: string[]) => {
      let done = 0, sched = 0;
      for (const d of ds) {
        const s = dayInfo(g, d, ctx).status;
        if (s === 'off' || s === 'before' || s === 'future') continue;
        sched++;
        if (s === 'done') done++;
      }
      return { done, sched };
    };
    const maxDays = Math.max(1, thisDays.length);
    const rows = on.map((g) => {
      const now = count(g, thisDays);
      const last = count(g, lastSpan);
      if (now.done > last.done) ahead++;
      else if (now.done < last.done) behind++;
      return {
        goal: g, color: color(g.color),
        nowPct: (now.done / maxDays) * 100, lastPct: (last.done / maxDays) * 100,
        now: `${now.done} of ${now.sched}`, last: `${last.done} of ${last.sched}`,
        aria: `${g.name}: done ${now.done} of ${now.sched} days this week, ${last.done} of ${last.sched} by this point last week`,
      };
    });
    let note: string;
    if (!on.length) note = 'Pick a habit above to compare weeks.';
    else if (!ahead && !behind) note = 'Even with last week on every habit so far. Today still counts.';
    else note = `Ahead of last week on ${ahead} of ${on.length} ${on.length === 1 ? 'habit' : 'habits'} and behind on ${behind}. Today still counts.`;
    return { rows, note };
  }, [on, thisDays, lastSpan, ctx, color]);

  const chipStyle = (isOn: boolean, c: string): React.CSSProperties =>
    isOn ? { borderColor: rgba(c, 0.7), background: rgba(c, theme === 'dark' ? 0.16 : 0.18), color: 'var(--text)' } : {};
  const dotStyle = (isOn: boolean, c: string): React.CSSProperties => (isOn ? { background: c, borderColor: c } : {});
  const sameSpanLabel = thisDays.length === 7 ? 'Last week, Mon–Sun' : `Last week, Mon–${WEEKDAY_SHORT_FULL[weekday(today)].slice(0, 3)}`;
  const thisSpanLabel = thisDays.length === 1 ? 'This week, today' : `This week, Mon–${WEEKDAY_SHORT_FULL[weekday(today)].slice(0, 3)}`;

  return (
    <div className="stack">
      <div className="grid-auto" style={{ ['--min' as string]: '270px', gap: 20 } as React.CSSProperties}>
        {cards.map((c) => <TrendCard key={c.key} c={c} />)}
      </div>

      <Panel
        labelledBy="streak-h"
        title={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <h2 className="h2" id="streak-h" style={{ fontSize: 20 }}>Streaks</h2>
            <span className="muted" style={{ fontSize: 13 }}>Done days join into one bar. A planned skip keeps the streak going, shown striped.</span>
          </div>
        }
        actions={<Seg label="Time range" options={RANGES} value={rangeKey} onChange={setRangeKey} />}
      >
        {goals.length > 0 && (
          <div role="group" aria-label="Habits to show" className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {goals.map((g) => {
              const isOn = !off[g.id];
              const c = color(g.color);
              return (
                <button key={g.id} className="chip" aria-pressed={isOn} style={chipStyle(isOn, c)} onClick={() => setOff((o) => ({ ...o, [g.id]: !o[g.id] }))}>
                  <span className="dot" style={dotStyle(isOn, c)} />{g.name}
                </button>
              );
            })}
            <button className="pill ghost small" style={{ minHeight: 44 }} onClick={() => setOff({})}>Show all</button>
          </div>
        )}
        {goals.length === 0 ? (
          <Empty>Add a goal in Settings to see streaks here.</Empty>
        ) : on.length === 0 ? (
          <Empty>Pick at least one habit to see its streaks.</Empty>
        ) : (
          <StreakGrid rows={streakRows} days={days} today={today} />
        )}
      </Panel>

      <div className="cols" style={{ alignItems: 'stretch' }}>
        <Panel
          labelledBy="ex-h"
          title="Exercise"
          style={{ flex: '2 1 620px' }}
          actions={exWithData.length > 0 ? (
            <div role="group" aria-label="Exercises to show" className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {exWithData.map(({ ex }) => {
                const isOn = !exOff[ex.id];
                const c = color(ex.color);
                return (
                  <button key={ex.id} className="chip" aria-pressed={isOn} style={chipStyle(isOn, c)} onClick={() => setExOff((o) => ({ ...o, [ex.id]: !o[ex.id] }))}>
                    <span className="dot" style={dotStyle(isOn, c)} />{ex.name}
                  </button>
                );
              })}
            </div>
          ) : undefined}
        >
          {exWithData.length === 0 ? (
            <Empty>No workouts logged in this range yet. Log one on Today or the Exercise page and its trend shows up here.</Empty>
          ) : exCards.length === 0 ? (
            <Empty>Pick an exercise above to see its trend.</Empty>
          ) : (
            <div className="grid-auto" style={{ ['--min' as string]: '190px' } as React.CSSProperties}>
              {exCards.map((c) => <ExerciseCard key={c.ex.id} c={c} fillAlpha={theme === 'dark' ? 0.18 : 0.22} />)}
            </div>
          )}
        </Panel>

        <Panel labelledBy="wk-h" title="This week vs last" style={{ flex: '1 1 340px', gap: 12 }}>
          <p className="body" style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>{week.note}</p>
          {week.rows.length > 0 && (
            <>
              <div aria-hidden="true" className="row" style={{ gap: 16, flexWrap: 'wrap', fontSize: 12, fontWeight: 600, color: 'var(--sub)' }}>
                <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, borderRadius: 4, background: 'var(--legend)' }} />{thisSpanLabel}</span>
                <span className="row" style={{ gap: 6 }}><span style={{ width: 14, height: 8, borderRadius: 4, background: 'var(--prev-bar)' }} />{sameSpanLabel === 'Last week, Mon–Sun' ? 'Last week' : sameSpanLabel}</span>
              </div>
              {week.rows.map((w) => (
                <div key={w.goal.id} role="img" aria-label={w.aria} style={{ display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)', gap: 12, alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.goal.name}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <div style={{ height: 10, borderRadius: 5, width: `${Math.max(w.nowPct, 2)}%`, maxWidth: '78%', background: w.color }} />
                      <span className="num" style={{ fontSize: 11, fontWeight: 800 }}>{w.now}</span>
                    </div>
                    <div className="row" style={{ gap: 8 }}>
                      <div style={{ height: 10, borderRadius: 5, width: `${Math.max(w.lastPct, 2)}%`, maxWidth: '78%', background: 'var(--prev-bar)' }} />
                      <span className="num muted" style={{ fontSize: 11, fontWeight: 600 }}>{w.last}</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}

const WEEKDAY_SHORT_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
