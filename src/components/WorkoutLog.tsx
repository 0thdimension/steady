import { useEffect, useMemo, useState } from 'react';
import { addLog, deleteLog, updateLog, useStore } from '../data/store';
import { lastTime, live } from '../data/logic';
import { fmtSeconds, parseSeconds } from '../data/dates';
import type { Exercise, ExerciseLog } from '../data/types';
import { Empty, Icon, useColor } from './ui';

const SETS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** "3 × 10 at 35 lb", "3 × 0:50", "1 × 22:00" */
export const describeLog = (l: ExerciseLog, unit: string) => {
  let s = '';
  if (l.reps != null && l.reps > 0) s = `${l.sets} × ${l.reps}`;
  else if (l.seconds != null && l.seconds > 0) s = `${l.sets} × ${fmtSeconds(l.seconds)}`;
  else s = `${l.sets} set${l.sets === 1 ? '' : 's'}`;
  if (l.weight != null && l.weight > 0) s += ` at ${l.weight} ${unit}`;
  if (l.reps != null && l.reps > 0 && l.seconds != null && l.seconds > 0) s += ` · ${fmtSeconds(l.seconds)}`;
  return s;
};

const COLS = 'minmax(0, 2.4fr) 84px 84px 104px 96px 44px';

const css = `
.wlog-grid { display: grid; grid-template-columns: ${COLS}; gap: 10px; align-items: start; }
.wlog-head { padding: 0 4px; font-size: 12px; font-weight: 700; color: var(--sub); }
.wlog-mini { display: none; font-size: 11px; font-weight: 700; color: var(--sub); margin-bottom: 4px; }
@media (max-width: 700px) {
  .wlog-head { display: none; }
  .wlog-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) 44px; padding: 12px; border-radius: 16px; background: var(--tile); }
  .wlog-grid .wlog-ex { grid-column: 1 / -1; }
  .wlog-mini { display: block; }
}
`;

const toNum = (s: string): number | null => {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

function NumField({ value, onCommit, label, step, mini }: { value: number | null; onCommit: (v: number | null) => void; label: string; step?: number; mini: string }) {
  const [text, setText] = useState(value == null ? '' : String(value));
  const [focused, setFocused] = useState(false);
  // While typing, the field keeps its own text so "2." on the way to "2.5" isn't overwritten.
  useEffect(() => { if (!focused) setText(value == null ? '' : String(value)); }, [value, focused]);
  return (
    <div>
      <span className="wlog-mini" aria-hidden="true">{mini}</span>
      <input
        className="field num"
        type="number"
        inputMode="decimal"
        min={0}
        step={step ?? 1}
        aria-label={label}
        placeholder="–"
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const n = toNum(e.target.value);
          if (e.target.value.trim() === '' || n != null) onCommit(n);
        }}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

function TimeField({ value, onCommit, label }: { value: number | null; onCommit: (v: number | null) => void; label: string }) {
  const [text, setText] = useState(value == null ? '' : fmtSeconds(value));
  useEffect(() => { setText(value == null ? '' : fmtSeconds(value)); }, [value]);
  const commit = () => {
    const s = parseSeconds(text);
    if (text.trim() === '') onCommit(null);
    else if (s != null) { onCommit(s); setText(fmtSeconds(s)); }
    else setText(value == null ? '' : fmtSeconds(value));
  };
  return (
    <div>
      <span className="wlog-mini" aria-hidden="true">Time</span>
      <input
        className="field num"
        inputMode="numeric"
        aria-label={label}
        placeholder="–"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
      />
    </div>
  );
}

function LogRow({ log, exercises, all, allLogs, unit, date }: { log: ExerciseLog; exercises: Exercise[]; all: Exercise[]; allLogs: ExerciseLog[]; unit: string; date: string }) {
  const color = useColor();
  const ex = all.find((e) => e.id === log.exerciseId);
  const prev = lastTime(log.exerciseId, date, allLogs);
  const name = ex?.name ?? 'this exercise';
  // Keep an archived exercise visible in its old rows.
  const options = ex && !exercises.some((e) => e.id === ex.id) ? [ex, ...exercises] : exercises;
  return (
    <div className="wlog-grid">
      <div className="wlog-ex" style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
        <div className="row" style={{ gap: 8 }}>
          <span aria-hidden="true" style={{ flex: 'none', width: 8, height: 8, borderRadius: '50%', background: color(ex?.color) }} />
          <select className="field" aria-label="Exercise" value={log.exerciseId} onChange={(e) => updateLog(log.id, { exerciseId: e.target.value })}>
            {options.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <span className="muted" style={{ paddingLeft: 20, fontSize: 12 }}>
          {prev ? `Last time: ${describeLog(prev, unit)}` : 'First time logging this'}
        </span>
      </div>
      <div>
        <span className="wlog-mini" aria-hidden="true">Sets</span>
        <select className="field num" aria-label={`Sets of ${name}`} value={log.sets} onChange={(e) => updateLog(log.id, { sets: Number(e.target.value) })}>
          {SETS.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <NumField mini="Reps" label={`Reps of ${name}`} value={log.reps} onCommit={(v) => updateLog(log.id, { reps: v })} />
      <NumField mini={`Weight (${unit})`} label={`Weight of ${name} in ${unit === 'lb' ? 'pounds' : 'kilograms'}`} step={2.5} value={log.weight} onCommit={(v) => updateLog(log.id, { weight: v })} />
      <TimeField label={`Time for ${name}, minutes and seconds`} value={log.seconds} onCommit={(v) => updateLog(log.id, { seconds: v })} />
      <button className="icon-btn bare" aria-label={`Remove ${name} from this workout`} onClick={() => deleteLog(log.id)}>
        <Icon name="trash" />
      </button>
    </div>
  );
}

export default function WorkoutLog({ date }: { date: string }) {
  const allLogs = useStore((s) => s.data.exLogs);
  const allExercises = useStore((s) => s.data.exercises);
  const unit = useStore((s) => s.data.settings.weightUnit);
  const go = useStore((s) => s.go);
  const screen = useStore((s) => s.screen);

  const exercises = useMemo(() => live(allExercises).filter((e) => !e.archived).sort((a, b) => a.order - b.order), [allExercises]);
  const everyExercise = useMemo(() => live(allExercises), [allExercises]);
  const logs = useMemo(() => live(allLogs).filter((l) => l.date === date).sort((a, b) => a.order - b.order), [allLogs, date]);

  const add = () => {
    if (!exercises.length) return;
    const used = new Set(logs.map((l) => l.exerciseId));
    const pick = exercises.find((e) => !used.has(e.id)) ?? exercises[0];
    const prev = lastTime(pick.id, date, allLogs);
    addLog(date, pick.id, prev ? { sets: prev.sets, reps: prev.reps, weight: prev.weight, seconds: prev.seconds } : {});
  };

  const addButton = (
    <button className="pill" onClick={add} disabled={!exercises.length}>
      <Icon name="plus" /> Add exercise
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <style>{css}</style>
      {!exercises.length && (
        <Empty>
          You don't have any saved exercises yet.{' '}
          {screen !== 'exercise' && <button className="pill small" onClick={() => go('exercise')}>Add exercises</button>}
          {screen === 'exercise' && 'Add one under Saved exercises.'}
        </Empty>
      )}
      {exercises.length > 0 && logs.length === 0 && (
        <Empty>Nothing logged for this day yet. Add an exercise and it fills in from last time.</Empty>
      )}
      {logs.length > 0 && (
        <>
          <div className="wlog-grid wlog-head" aria-hidden="true">
            <span>Exercise</span><span>Sets</span><span>Reps</span><span>Weight ({unit})</span><span>Time</span><span />
          </div>
          {logs.map((l) => (
            <LogRow key={l.id} log={l} exercises={exercises} all={everyExercise} allLogs={allLogs} unit={unit} date={date} />
          ))}
        </>
      )}
      {exercises.length > 0 && <div>{addButton}</div>}
    </div>
  );
}
