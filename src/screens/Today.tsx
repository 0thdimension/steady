import { useMemo, useState } from 'react';
import {
  bump, setSettings, setSkipped, setValue, toggleCheck, toggleTodo,
  startTimer, stopTimer, updateProject, useCtx, useStore, storedValue,
} from '../data/store';
import { quoteFor } from '../data/quoteOfDay';
import {
  activeGoals, allowanceInfo, dayInfo, daySummary, goalDays, goalTarget, goalValue, isScheduled, lastWeekSameSpan,
  live, minutesBetween, onPlanRate, parseTags, pctChange, type Ctx,
} from '../data/logic';
import {
  addDays, daysBetween, fmtClock, fmtDue, fmtHM, fmtHMClock, fmtLong, fmtShort, fromKey, isHoursUnit, isoWeek, monthEnd,
  monthName, monthStart, parseHours, range, toKey, WEEKDAY_LETTERS, WEEKDAY_SHORT, weekStart, weekday,
} from '../data/dates';
import type { Goal } from '../data/types';
import { Delta, Empty, Icon, Modal, Panel, Seg, TagChip, rgba, useColor, useFillAlpha } from '../components/ui';
import WorkoutLog from '../components/WorkoutLog';
import { GratitudeEditor, wordCount } from '../components/JournalParts';
import AddHoursModal from '../components/AddHoursModal';

const fmtVal = (n: number) => (Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toFixed(1));

const scheduleText = (g: Goal) => {
  const ds = [...g.days].sort();
  if (ds.length === 7) return 'every day';
  if (ds.length === 5 && [0, 1, 2, 3, 4].every((d) => ds.includes(d))) return 'weekdays';
  if (ds.length === 2 && ds.includes(5) && ds.includes(6)) return 'weekends';
  return ds.map((d) => WEEKDAY_SHORT[d]).join(' ');
};

const planText = (g: Goal) => {
  const amount = g.kind === 'amount' ? `${fmtVal(g.target)} ${g.unit}`.trim() : '';
  const link = g.link === 'workHours' ? 'fills from your hours' : g.link === 'workout' ? 'fills from your workout log' : '';
  return [g.note || amount, scheduleText(g), link].filter(Boolean).join(' · ');
};

type View = 'day' | 'week' | 'month';

// ---------------------------------------------------------------- header

function Header({ view, setView }: { view: View; setView: (v: View) => void }) {
  const viewDate = useStore((s) => s.viewDate);
  const today = useStore((s) => s.today);
  const setViewDate = useStore((s) => s.setViewDate);
  const step = (dir: -1 | 1) => {
    if (view === 'day') return setViewDate(addDays(viewDate, dir));
    if (view === 'week') return setViewDate(addDays(viewDate, dir * 7));
    const d = fromKey(viewDate);
    setViewDate(toKey(new Date(d.getFullYear(), d.getMonth() + dir, 1)));
  };
  const daysLeft = daysBetween(viewDate, monthEnd(viewDate));
  const title = view === 'day' ? fmtLong(viewDate)
    : view === 'week' ? `Week of ${fmtShort(weekStart(viewDate))}`
    : `${monthName(viewDate)} ${viewDate.slice(0, 4)}`;
  const isFuture = viewDate > today;
  return (
    <div className="between">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="label">
          Week {isoWeek(viewDate)} · day {weekday(viewDate) + 1} of 7 · {daysLeft} day{daysLeft === 1 ? '' : 's'} left in {monthName(viewDate)}
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn bare" onClick={() => step(-1)} aria-label={`Previous ${view}`}><Icon name="left" /></button>
          <h1 className="h1" id="today-h">{title}</h1>
          <button className="icon-btn bare" onClick={() => step(1)} aria-label={`Next ${view}`} disabled={isFuture}><Icon name="right" /></button>
          {viewDate !== today && <button className="pill small" onClick={() => setViewDate(today)}>Back to today</button>}
        </div>
      </div>
      <Seg label="View" value={view} onChange={setView} options={[{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }]} />
    </div>
  );
}

// ---------------------------------------------------------------- number tiles

function Kpis({ goals, ctx }: { goals: Goal[]; ctx: Ctx }) {
  const viewDate = useStore((s) => s.viewDate);
  const sum = daySummary(goals, viewDate, ctx);
  const ws = weekStart(viewDate);
  const [lwA, lwB] = lastWeekSameSpan(viewDate);
  const plan = onPlanRate(goals, ws, viewDate, ctx);
  const planLast = onPlanRate(goals, lwA, lwB, ctx);
  const planDiff = plan != null && planLast != null ? Math.round((plan - planLast) * 100) : null;
  const work = minutesBetween(ctx, ws, viewDate);
  const workLast = minutesBetween(ctx, lwA, lwB);
  const workChange = pctChange(work, workLast);
  let left = 0;
  for (const g of goals) {
    if (g.allowance.per === 'month') continue;
    left += allowanceInfo(g, viewDate, ctx).left;
  }
  const tiles = [
    {
      label: viewDate === ctx.today ? 'Goals done today' : 'Goals done',
      value: `${sum.done} / ${sum.scheduled}`,
      pill: sum.scheduled > 0 && sum.done === sum.scheduled ? <Delta tone="up">All done</Delta> : <Delta tone="neutral">{sum.partial} in progress</Delta>,
    },
    {
      label: 'On plan this week',
      value: plan == null ? '–' : `${Math.round(plan * 100)}%`,
      pill: planDiff == null ? <Delta tone="neutral">New week</Delta> : planDiff > 0 ? <Delta tone="up" up>+{planDiff} pts</Delta> : <Delta tone="neutral">{planDiff === 0 ? 'Same as last week' : `${planDiff} pts`}</Delta>,
    },
    {
      label: 'Work this week',
      value: fmtHM(work / 60),
      pill: workChange == null ? <Delta tone="neutral">vs last week</Delta> : workChange > 0 ? <Delta tone="up" up>+{workChange}%</Delta> : <Delta tone="neutral">{workChange}%</Delta>,
    },
    {
      label: 'Weekly skips left',
      value: String(left),
      pill: <Delta tone="neutral">this week</Delta>,
    },
  ];
  return (
    <div className="grid-auto" style={{ ['--min' as string]: '170px' }}>
      {tiles.map((t) => (
        <div key={t.label} className="tile" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '16px 18px' }}>
          <span className="label">{t.label}</span>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <span className="big-num">{t.value}</span>
            {t.pill}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- goal rows

function AmountEditor({ goal, date, value, onDone }: { goal: Goal; date: string; value: number; onDone: () => void }) {
  const hours = isHoursUnit(goal.unit);
  const [text, setText] = useState(hours ? fmtHMClock(value) : fmtVal(value));
  const commit = () => {
    const n = hours ? parseHours(text) : Number(text.replace(',', '.'));
    if (n != null && Number.isFinite(n) && n >= 0) setValue(goal.id, date, n);
    onDone();
  };
  return (
    <span className="row" style={{ gap: 6 }}>
      <input
        className="field num"
        autoFocus
        inputMode="decimal"
        aria-label={hours ? `${goal.name} time, like 1:30` : `${goal.name} amount`}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onDone(); }}
        style={{ width: 80, minHeight: 36, textAlign: 'right' }}
      />
      <span className="muted" style={{ fontSize: 13 }}>/ {hours ? fmtHM(goal.target) : `${fmtVal(goal.target)} ${goal.unit}`}</span>
    </span>
  );
}

/** For time goals: add exact minutes instead of fixed steps. */
function MinutesAdder({ goal, date, onDone }: { goal: Goal; date: string; onDone: () => void }) {
  const [text, setText] = useState('');
  const commit = () => {
    const n = Number(text.trim());
    if (Number.isFinite(n) && n > 0) bump(goal.id, date, n / 60);
    onDone();
  };
  return (
    <span className="row" style={{ gap: 6 }}>
      <span className="muted" style={{ fontSize: 13 }}>Add</span>
      <input
        className="field num"
        autoFocus
        inputMode="numeric"
        aria-label={`Minutes to add to ${goal.name}`}
        placeholder="25"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onDone(); }}
        style={{ width: 64, minHeight: 36, textAlign: 'right' }}
      />
      <span className="muted" style={{ fontSize: 13 }}>min</span>
    </span>
  );
}

function GoalRow({ goal, date, ctx }: { goal: Goal; date: string; ctx: Ctx }) {
  const color = useColor()(goal.color);
  const alpha = useFillAlpha();
  const [editing, setEditing] = useState<false | 'set' | 'add'>(false);
  const [hoursOpen, setHoursOpen] = useState(false);
  const info = dayInfo(goal, date, ctx);
  const allow = allowanceInfo(goal, date, ctx);
  const value = goalValue(goal, date, ctx);
  const target = goalTarget(goal);
  const done = info.status === 'done';
  const derivedDone = done && storedValue(goal.id, date) < target;
  const pct = Math.max(0, Math.min(100, (value / target) * 100));
  const skipped = info.explicit;
  const isTime = goal.kind === 'amount' && isHoursUnit(goal.unit);
  const fromLog = isTime && goal.link === 'workHours';

  const primary = () => {
    if (derivedDone) return;
    if (goal.kind === 'check') toggleCheck(goal.id, date);
    else if (done) setValue(goal.id, date, 0);
    else if (fromLog) setHoursOpen(true);
    else if (isTime) setEditing('add');
    else bump(goal.id, date, goal.step || 1);
  };
  const primaryLabel = derivedDone
    ? `${goal.name} is done from your ${goal.link === 'workHours' ? 'hours log' : 'workout log'}`
    : done ? `Done: ${goal.name}. Select to undo`
    : goal.kind === 'check' ? `Mark done: ${goal.name}`
    : isTime ? `Add time to ${goal.name}`
    : `Add ${fmtVal(goal.step)} ${goal.unit} to ${goal.name}`;

  let valueText: string;
  if (goal.kind === 'check') valueText = done ? 'Done' : skipped ? 'Skipped' : info.status === 'pending' ? 'To do' : info.status === 'future' ? 'Later' : info.status === 'skip' ? 'Skipped' : 'Missed';
  else if (isTime) valueText = `${fmtHM(value)} / ${fmtHM(goal.target)}`;
  else valueText = `${fmtVal(value)} / ${fmtVal(goal.target)} ${goal.unit}`;

  return (
    <div className="goal-row">
      <div className="fill" aria-hidden="true" style={{ width: `${done ? 100 : pct}%`, background: rgba(color, alpha) }} />
      <div className="inner">
        <div>
          <button className="check-ring" onClick={primary} aria-label={primaryLabel} title={derivedDone ? primaryLabel : undefined} style={{ cursor: derivedDone ? 'default' : 'pointer' }}>
            {done ? (
              <span style={{ width: 26, height: 26, border: 0, background: color, color: '#141312' }}><Icon name="check" size={14} /></span>
            ) : (
              <span style={{ width: 26, height: 26, borderColor: color, color }}>{goal.kind === 'amount' && <Icon name="plus" size={12} />}</span>
            )}
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{goal.name}</span>
          <span className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{planText(goal)}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          {editing === 'set' && goal.kind === 'amount' ? (
            <AmountEditor goal={goal} date={date} value={value} onDone={() => setEditing(false)} />
          ) : editing === 'add' ? (
            <MinutesAdder goal={goal} date={date} onDone={() => setEditing(false)} />
          ) : goal.kind === 'amount' ? (
            <button
              className="num"
              onClick={() => (fromLog ? setHoursOpen(true) : setEditing('set'))}
              aria-label={`${goal.name}: ${valueText}. Select to type an amount`}
              style={{ border: 0, background: 'transparent', padding: '2px 0', fontSize: 15, fontWeight: 800, cursor: 'text' }}
            >
              {valueText}
            </button>
          ) : (
            <span className="num" style={{ fontSize: 15, fontWeight: 800 }}>{valueText}</span>
          )}
          <span className="row" style={{ gap: 7, fontSize: 12, fontWeight: 600, color: 'var(--sub)' }}>
            <span className="row" style={{ gap: 3 }} aria-hidden="true">
              {allow.pips.map((p, i) => (
                <span
                  key={i}
                  className="pip"
                  style={p === 'used' ? { background: 'var(--pip-used)' } : p === 'over' ? { background: 'var(--warn-text)' } : { border: '1.5px solid var(--pip-free)' }}
                />
              ))}
            </span>
            {allow.text}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          {!done && info.status !== 'future' && (
            skipped ? (
              <button className="pill small" onClick={() => setSkipped(goal.id, date, false)} aria-label={`Undo skip for ${goal.name}`}>Undo skip</button>
            ) : (
              <button className="pill small rowskip" onClick={() => setSkipped(goal.id, date, true)} aria-label={`Use a skip for ${goal.name}`}>Skip</button>
            )
          )}
        </div>
      </div>
      {hoursOpen && <AddHoursModal onClose={() => setHoursOpen(false)} defaultDate={date} />}
    </div>
  );
}

function DayGoals({ goals, ctx }: { goals: Goal[]; ctx: Ctx }) {
  const viewDate = useStore((s) => s.viewDate);
  const go = useStore((s) => s.go);
  const on = goals.filter((g) => isScheduled(g, viewDate));
  const off = goals.filter((g) => !isScheduled(g, viewDate) && viewDate >= g.startDate);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="between" style={{ padding: '0 4px' }}>
        <h2 className="h2">Daily goals</h2>
        <button className="pill small" onClick={() => go('settings')}>Edit goals</button>
      </div>
      {goals.length === 0 && <Empty>No goals yet. Add your first one in Settings.</Empty>}
      {goals.length > 0 && on.length === 0 && <Empty>Nothing is scheduled for this day.</Empty>}
      {on.map((g) => <GoalRow key={g.id} goal={g} date={viewDate} ctx={ctx} />)}
      {off.length > 0 && (
        <p className="faint" style={{ margin: '4px 6px 0', fontSize: 13 }}>Not scheduled this day: {off.map((g) => g.name).join(', ')}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- week and month views

function WeekGrid({ goals, ctx }: { goals: Goal[]; ctx: Ctx }) {
  const viewDate = useStore((s) => s.viewDate);
  const setViewDate = useStore((s) => s.setViewDate);
  const color = useColor();
  const days = range(weekStart(viewDate), addDays(weekStart(viewDate), 6));
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ minWidth: 640, display: 'grid', gridTemplateColumns: '150px repeat(7, minmax(0, 1fr)) 150px', gap: 6, alignItems: 'center' }}>
        <span />
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setViewDate(d)}
            className="num"
            aria-label={`Open ${fmtLong(d)}`}
            style={{ border: 0, borderRadius: 12, minHeight: 44, background: d === ctx.today ? 'var(--today-band)' : 'transparent', color: d === ctx.today ? 'var(--today-text)' : 'var(--sub)', fontWeight: 800, fontSize: 12 }}
          >
            {WEEKDAY_LETTERS[weekday(d)]} {Number(d.slice(8))}
          </button>
        ))}
        <span className="label" style={{ textAlign: 'right' }}>Skips</span>
        {goals.map((g) => {
          const infos = goalDays(g, days[0], days[6], ctx);
          const c = color(g.color);
          return (
            <div key={g.id} style={{ display: 'contents' }}>
              <span className="row" style={{ gap: 8, fontWeight: 700, fontSize: 14 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flex: 'none' }} />{g.name}</span>
              {days.map((d) => {
                const info = infos.get(d)!;
                const s = info.status;
                const label = `${g.name}, ${fmtLong(d)}: ${s === 'done' ? 'done' : s === 'skip' ? 'skipped' : s === 'over' ? 'missed' : s === 'off' ? 'not scheduled' : s === 'pending' ? 'to do' : s === 'future' ? 'later' : 'not tracked yet'}`;
                const style: React.CSSProperties = { height: 44, borderRadius: 12, border: 0, display: 'grid', placeItems: 'center', color: '#141312' };
                if (s === 'done') Object.assign(style, { background: c });
                else if (s === 'skip') Object.assign(style, { background: 'transparent', border: `1.5px dashed ${c}` });
                else if (s === 'over') Object.assign(style, { background: 'var(--tile)', border: '1.5px solid var(--line)' });
                else if (s === 'pending') Object.assign(style, { background: info.partial ? rgba(c, 0.35) : 'var(--tile)', border: '1.5px solid var(--accent)' });
                else Object.assign(style, { background: s === 'off' ? 'transparent' : 'var(--tile)' });
                const clickable = s !== 'off' && s !== 'before' && s !== 'future';
                return (
                  <button
                    key={d}
                    aria-label={label}
                    disabled={!clickable}
                    onClick={() => (g.kind === 'check' ? toggleCheck(g.id, d) : setViewDate(d))}
                    style={{ ...style, cursor: clickable ? 'pointer' : 'default' }}
                  >
                    {s === 'done' && <Icon name="check" size={14} />}
                    {s === 'off' && <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--faint)' }} />}
                    {(s === 'skip' || s === 'over') && info.partial && <span style={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${c}` }} />}
                  </button>
                );
              })}
              <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: 'var(--sub)' }}>
                {allowanceInfo(g, days[6] < ctx.today ? days[6] : ctx.today < days[0] ? days[0] : ctx.today, ctx).text}
              </span>
            </div>
          );
        })}
      </div>
      <p className="faint" style={{ fontSize: 13, margin: '12px 4px 0' }}>Tap a check-off goal to toggle that day. Tap an amount goal, or a day at the top, to open that day.</p>
    </div>
  );
}

function MonthGrid({ goals, ctx }: { goals: Goal[]; ctx: Ctx }) {
  const viewDate = useStore((s) => s.viewDate);
  const setViewDate = useStore((s) => s.setViewDate);
  const first = monthStart(viewDate);
  const lead = weekday(first);
  const days = range(first, monthEnd(viewDate));
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
        {WEEKDAY_SHORT.map((w) => <span key={w} className="label" style={{ textAlign: 'center', padding: '0 0 4px' }}>{w}</span>)}
        {Array.from({ length: lead }).map((_, i) => <span key={'l' + i} />)}
        {days.map((d) => {
          const rate = d <= ctx.today ? onPlanRate(goals, d, d, ctx) : null;
          const sum = daySummary(goals, d, ctx);
          const isToday = d === ctx.today;
          const bg = rate == null ? 'var(--tile)' : `color-mix(in srgb, var(--accent) ${Math.round(15 + rate * 55)}%, transparent)`;
          return (
            <button
              key={d}
              onClick={() => setViewDate(d)}
              aria-label={`${fmtLong(d)}: ${sum.done} of ${sum.scheduled} done${rate != null ? `, ${Math.round(rate * 100)}% on plan` : ''}`}
              style={{ minHeight: 64, borderRadius: 14, border: isToday ? '2px solid var(--accent)' : 0, background: bg, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between', padding: '8px 10px', color: 'var(--text)' }}
            >
              <span className="num" style={{ fontWeight: 800, fontSize: 14 }}>{Number(d.slice(8))}</span>
              {d <= ctx.today && sum.scheduled > 0 && <span className="num" style={{ fontSize: 12, fontWeight: 700 }}>{sum.done}/{sum.scheduled}</span>}
            </button>
          );
        })}
      </div>
      <p className="faint" style={{ fontSize: 13, margin: '12px 4px 0' }}>Darker days were more on plan (done, or covered by a planned skip). Tap a day to open it.</p>
    </div>
  );
}

// ---------------------------------------------------------------- right column

function Focus({ goals, ctx }: { goals: Goal[]; ctx: Ctx }) {
  const projects = useStore((s) => s.data.projects);
  const focusId = useStore((s) => s.data.settings.focusProjectId);
  const timer = useStore((s) => s.data.settings.timer);
  const now = useStore((s) => s.now);
  const viewDate = useStore((s) => s.viewDate);
  const go = useStore((s) => s.go);
  const [hoursOpen, setHoursOpen] = useState(false);
  const [editingNext, setEditingNext] = useState(false);
  const focus = projects.find((p) => p.id === focusId && !p.deleted);
  const workGoal = goals.find((g) => g.link === 'workHours');
  const target = workGoal ? (workGoal.kind === 'amount' ? workGoal.target : 1) : 0;
  const todayMin = ctx.minutesByDate.get(ctx.today) ?? 0;
  const running = !!timer;
  const runningHere = timer && focus && timer.projectId === focus.id;

  return (
    <Panel id="focus" labelledBy="focus-h" title={<h2 className="label" id="focus-h">Current focus</h2>} actions={<button className="pill small" onClick={() => go('projects')}>Change</button>}>
      {!focus ? (
        <Empty>Pick a project to focus on and its timer shows up here. <button className="pill small" onClick={() => go('projects')} style={{ marginTop: 8 }}>Add a project</button></Empty>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ margin: 0, fontSize: 26, lineHeight: 1.15, fontWeight: 800, letterSpacing: '-0.02em' }}>{focus.name}</p>
            {editingNext ? (
              <input
                className="field"
                autoFocus
                aria-label="Next step"
                defaultValue={focus.next}
                onBlur={(e) => { updateProject(focus.id, { next: e.target.value.trim() }); setEditingNext(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingNext(false); }}
              />
            ) : (
              <button onClick={() => setEditingNext(true)} className="muted" style={{ border: 0, background: 'transparent', padding: 0, textAlign: 'left', fontSize: 14, cursor: 'text' }}>
                {focus.next ? `Next up: ${focus.next}` : 'Add a next step'}
              </button>
            )}
          </div>
          <div className="tile between" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="num" style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em' }}>
                {runningHere ? fmtClock(now - timer!.startedAt) : '0:00:00'}
              </span>
              <span className="muted" style={{ fontSize: 12 }}>
                {fmtHM(todayMin / 60)}{target ? ` of ${fmtHM(target)}` : ''} today{workGoal ? ` toward ${workGoal.name}` : ''}
              </span>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {runningHere ? (
                <button className="pill accent" onClick={stopTimer}><Icon name="stop" size={12} />Stop</button>
              ) : (
                <button className="pill accent" onClick={() => startTimer(focus.id)}><Icon name="play" size={12} />{running ? 'Switch here' : 'Start'}</button>
              )}
              <button className="pill" onClick={() => setHoursOpen(true)}>+ Hours</button>
            </div>
          </div>
        </>
      )}
      {hoursOpen && <AddHoursModal onClose={() => setHoursOpen(false)} defaultProjectId={focus?.id ?? null} defaultDate={viewDate} />}
    </Panel>
  );
}

function NoteModal({ onClose }: { onClose: () => void }) {
  const note = useStore((s) => s.data.settings.selfNote);
  const [editing, setEditing] = useState(!note.trim());
  const [draft, setDraft] = useState(note);
  const save = () => { setSettings({ selfNote: draft.trim() }); setEditing(false); if (!draft.trim()) onClose(); };
  return (
    <Modal
      title="My note"
      onClose={onClose}
      footer={editing ? (
        <>
          {note.trim() && <button className="pill ghost" onClick={() => { setDraft(note); setEditing(false); }}>Cancel</button>}
          <button className="pill accent" onClick={save}>Save note</button>
        </>
      ) : (
        <>
          <button className="pill" onClick={() => { setDraft(note); setEditing(true); }}><Icon name="edit" size={14} />Edit</button>
          <button className="pill accent" onClick={onClose}>Done</button>
        </>
      )}
    >
      {editing ? (
        <label className="form-row">
          <span className="label">Write what you want to read every day</span>
          <textarea
            className="field"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={10}
            placeholder="A reminder, a promise to yourself, the reasons you're doing this…"
            style={{ fontSize: 16, minHeight: 220 }}
          />
        </label>
      ) : (
        <p style={{ margin: 0, fontSize: 19, lineHeight: 1.7, whiteSpace: 'pre-wrap', textWrap: 'pretty' }}>{note}</p>
      )}
    </Modal>
  );
}

function ReflectionCard() {
  const today = useStore((s) => s.today);
  const note = useStore((s) => s.data.settings.selfNote);
  const readOn = useStore((s) => s.data.settings.noteReadOn);
  const showQuote = useStore((s) => s.data.settings.showQuote);
  const [noteOpen, setNoteOpen] = useState(false);
  const [quoteShift, setQuoteShift] = useState(0);
  const quote = showQuote ? quoteFor(today, quoteShift) : null;
  const readToday = readOn === today;
  const openNote = () => {
    setNoteOpen(true);
    if (note.trim() && !readToday) setSettings({ noteReadOn: today });
  };
  return (
    <Panel
      labelledBy="reflect-h"
      title={<h2 className="h2" id="reflect-h">Reflection</h2>}
      actions={
        <button className="pill small" onClick={openNote} aria-label={note.trim() ? (readToday ? 'Open my note, read today' : 'Read my note') : 'Write my note'}>
          <Icon name={readToday ? 'check' : 'edit'} size={14} />
          {note.trim() ? (readToday ? 'My note · read today' : 'Read my note') : 'Write my note'}
        </button>
      }
    >
      {quote ? (
        <figure className="tile" style={{ margin: 0, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <blockquote style={{ margin: 0, fontSize: 16, lineHeight: 1.6, fontWeight: 600, textWrap: 'pretty' }}>{quote.text}</blockquote>
          <div className="between">
            <figcaption className="muted" style={{ fontSize: 13 }}>{quote.source}</figcaption>
            <button className="pill small ghost" onClick={() => setQuoteShift((n) => n + 1)} aria-label="Show another quote">Next</button>
          </div>
        </figure>
      ) : (
        <p className="muted" style={{ margin: 0, fontSize: 14 }}>Keep a short note to yourself here and read it each day.</p>
      )}
      {noteOpen && <NoteModal onClose={() => setNoteOpen(false)} />}
    </Panel>
  );
}

function DoFirst() {
  const todos = useStore((s) => s.data.todos);
  const today = useStore((s) => s.today);
  const go = useStore((s) => s.go);
  const list = useMemo(
    () => live(todos).filter((t) => t.box === 0 && !t.done)
      .sort((a, b) => (a.due && b.due ? (a.due < b.due ? -1 : 1) : a.due ? -1 : b.due ? 1 : a.order - b.order)),
    [todos],
  );
  return (
    <Panel
      labelledBy="first-h"
      title={<h2 className="h3" id="first-h">Urgent &amp; important <span className="num tag" style={{ marginLeft: 6 }}>{list.length}</span></h2>}
      actions={<button className="pill small accent" onClick={() => go('todos')}>All todos</button>}
    >
      {list.length === 0 ? (
        <Empty>Nothing urgent and important. Nice.</Empty>
      ) : (
        <div>
          {list.slice(0, 6).map((t) => {
            const { plain, tags } = parseTags(t.text);
            const soon = t.due != null && t.due <= addDays(today, 1);
            return (
              <div key={t.id} className="list-row">
                <button className="check-ring" onClick={() => toggleTodo(t.id)} aria-label={`Complete: ${plain}`} style={{ marginLeft: -10 }}><span /></button>
                <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600 }}>{plain}</span>
                {tags.slice(0, 2).map((tag) => <TagChip key={tag} tag={tag} />)}
                {t.due && <span className="num" style={{ width: 72, textAlign: 'right', fontSize: 12, fontWeight: 700, color: soon ? 'var(--warn-text)' : 'var(--sub)' }}>{fmtDue(t.due, today)}</span>}
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

function GratitudeCard() {
  const today = useStore((s) => s.today);
  const openJournal = useStore((s) => s.openJournal);
  const text = useStore((s) => s.data.journal.find((j) => !j.deleted && j.date === s.today)?.text ?? '');
  const words = wordCount(text);
  return (
    <Panel
      labelledBy="grat-today-h"
      title={<h2 className="h2" id="grat-today-h">Gratitude</h2>}
      actions={<button className="pill small" onClick={() => openJournal(today)}><Icon name="edit" size={14} />{words ? `Journal · ${words} words` : 'Write in journal'}</button>}
    >
      <GratitudeEditor key={today} date={today} compact />
    </Panel>
  );
}

// ---------------------------------------------------------------- screen

export default function Today() {
  const data = useStore((s) => s.data);
  const viewDate = useStore((s) => s.viewDate);
  const today = useStore((s) => s.today);
  const ctx = useCtx();
  const goals = useMemo(() => activeGoals(data), [data]);
  const [view, setView] = useState<View>('day');

  return (
    <div className="cols">
      <div className="stack" style={{ flex: '1 1 700px' }}>
        <Panel labelledBy="today-h">
          <Header view={view} setView={setView} />
          {viewDate !== today && view === 'day' && (
            <div className="banner">
              <span>{viewDate < today ? `You're editing ${fmtLong(viewDate)}. Changes count for that day.` : `That's a future day. You can plan skips here.`}</span>
            </div>
          )}
          <Kpis goals={goals} ctx={ctx} />
          {view === 'day' && <DayGoals goals={goals} ctx={ctx} />}
          {view === 'week' && <WeekGrid goals={goals} ctx={ctx} />}
          {view === 'month' && <MonthGrid goals={goals} ctx={ctx} />}
        </Panel>
        <Panel className="wide-only" id="workout" labelledBy="ex-h" title={<h2 className="h2" id="ex-h">{viewDate === today ? "Today's workout" : `Workout on ${fmtShort(viewDate)}`}</h2>}
          actions={ctx.workoutDates.has(viewDate) && goals.some((g) => g.link === 'workout') ? <Delta tone="up">Exercise goal checked off</Delta> : undefined}
        >
          <WorkoutLog date={viewDate} />
        </Panel>
      </div>
      <div className="stack" style={{ flex: '1 1 360px', maxWidth: 470 }}>
        <Focus goals={goals} ctx={ctx} />
        <DoFirst />
        <ReflectionCard />
        <GratitudeCard />
      </div>
    </div>
  );
}
