import { useState } from 'react';
import { addGoal, updateGoal } from '../data/store';
import { WEEKDAY_LETTERS, WEEKDAY_SHORT, fmtLong } from '../data/dates';
import { PALETTE, PALETTE_KEYS } from '../data/palette';
import type { AllowancePer, Goal, GoalLink, PaletteKey } from '../data/types';
import { Icon, Modal, Seg, useColor } from './ui';

const ALL = [0, 1, 2, 3, 4, 5, 6];
const WEEKDAYS = [0, 1, 2, 3, 4];

/** "3 h a day · every day · 2 skips a week · fills from work hours" */
export const goalSummary = (g: Goal) => {
  const parts: string[] = [];
  parts.push(g.kind === 'amount' ? `${g.target} ${g.unit || 'a day'}${g.unit ? ' a day' : ''}` : 'Check off');
  const days = [...g.days].sort();
  if (days.length === 7) parts.push('every day');
  else if (days.join() === WEEKDAYS.join()) parts.push('weekdays');
  else parts.push(days.map((d) => WEEKDAY_SHORT[d]).join(' '));
  if (g.allowance.per === 'none' || g.allowance.count === 0) parts.push('no skips');
  else parts.push(`${g.allowance.count} skip${g.allowance.count === 1 ? '' : 's'} a ${g.allowance.per}`);
  if (g.link === 'workHours') parts.push('fills from work hours');
  if (g.link === 'workout') parts.push('checks off with any workout');
  return parts.join(' · ');
};

export default function GoalEditor({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const color = useColor();
  const [name, setName] = useState(goal?.name ?? '');
  const [swatch, setSwatch] = useState<PaletteKey>(goal?.color ?? 'sky');
  const [kind, setKind] = useState<Goal['kind']>(goal?.kind ?? 'check');
  const [target, setTarget] = useState(String(goal && goal.kind === 'amount' ? goal.target : 8));
  const [unit, setUnit] = useState(goal?.unit ?? 'cups');
  const [step, setStep] = useState(String(goal && goal.kind === 'amount' ? goal.step : 1));
  const [days, setDays] = useState<number[]>(goal?.days ?? [...ALL]);
  const [per, setPer] = useState<AllowancePer>(goal?.allowance.per ?? 'week');
  const [count, setCount] = useState(String(goal?.allowance.count ?? 2));
  const [link, setLink] = useState<GoalLink>(goal?.link ?? 'none');
  const [note, setNote] = useState(goal?.note ?? '');
  const [error, setError] = useState('');

  const toggleDay = (d: number) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort());

  const save = () => {
    const n = name.trim();
    if (!n) { setError('Give the goal a name.'); return; }
    if (!days.length) { setError('Pick at least one day.'); return; }
    const t = Number(target.replace(',', '.'));
    const st = Number(step.replace(',', '.'));
    if (kind === 'amount') {
      if (!Number.isFinite(t) || t <= 0) { setError('The daily target needs to be more than 0.'); return; }
      if (!Number.isFinite(st) || st <= 0) { setError('The + step needs to be more than 0.'); return; }
    }
    const c = Math.round(Number(count));
    const maxCount = per === 'week' ? 7 : 31;
    if (per !== 'none' && (!Number.isFinite(c) || c < 0 || c > maxCount)) { setError(`Skips a ${per} can be 0 to ${maxCount}.`); return; }
    const patch: Partial<Goal> = {
      name: n,
      color: swatch,
      kind,
      target: kind === 'amount' ? t : 1,
      unit: kind === 'amount' ? unit.trim() : '',
      step: kind === 'amount' ? st : 1,
      days,
      allowance: { per, count: per === 'none' ? 0 : c },
      link,
      note: note.trim(),
    };
    if (goal) updateGoal(goal.id, patch);
    else addGoal(patch);
    onClose();
  };

  return (
    <Modal
      title={goal ? `Edit ${goal.name}` : 'New goal'}
      onClose={onClose}
      footer={
        <>
          <button className="pill ghost" onClick={onClose}>Cancel</button>
          <button className="pill accent" onClick={save}>{goal ? 'Save changes' : 'Add goal'}</button>
        </>
      }
    >
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="form-row">
          <span className="label">Name</span>
          <input className="field" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} placeholder="Like Stretch or Floss" />
        </label>

        <div className="form-row">
          <span className="label" id="goal-color">Color</span>
          <div className="row" role="group" aria-labelledby="goal-color" style={{ gap: 2, flexWrap: 'wrap' }}>
            {PALETTE_KEYS.map((k) => (
              <button key={k} type="button" className="icon-btn bare" aria-label={PALETTE[k].label} aria-pressed={k === swatch} onClick={() => setSwatch(k)}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: color(k), boxShadow: k === swatch ? '0 0 0 2px var(--panel-solid), 0 0 0 4px var(--text)' : 'none' }} />
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <span className="label">Type</span>
          <Seg label="Goal type" value={kind} onChange={setKind} options={[{ value: 'check', label: 'Check off' }, { value: 'amount', label: 'Amount' }]} />
        </div>

        {kind === 'amount' && (
          <div className="grid-auto" style={{ ['--min' as string]: '130px' }}>
            <label className="form-row">
              <span className="label">Daily target</span>
              <input className="field num" type="number" min={0} step="any" inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <label className="form-row">
              <span className="label">Unit</span>
              <input className="field" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="cups, min, h, times" list="goal-units" />
              <datalist id="goal-units"><option value="cups" /><option value="min" /><option value="h" /><option value="times" /><option value="pages" /><option value="steps" /></datalist>
            </label>
            <label className="form-row">
              <span className="label">Each tap of + adds</span>
              <input className="field num" type="number" min={0} step="any" inputMode="decimal" value={step} onChange={(e) => setStep(e.target.value)} />
            </label>
          </div>
        )}

        <div className="form-row">
          <div className="between">
            <span className="label" id="goal-days">Which days</span>
            <span className="row" style={{ gap: 4 }}>
              <button type="button" className="pill small ghost" onClick={() => setDays([...ALL])}>Every day</button>
              <button type="button" className="pill small ghost" onClick={() => setDays([...WEEKDAYS])}>Weekdays</button>
            </span>
          </div>
          <div className="row" role="group" aria-labelledby="goal-days" style={{ gap: 6, flexWrap: 'wrap' }}>
            {ALL.map((d) => (
              <button
                key={d}
                type="button"
                className="icon-btn"
                aria-pressed={days.includes(d)}
                aria-label={WEEKDAY_SHORT[d]}
                onClick={() => toggleDay(d)}
                style={days.includes(d) ? { background: 'var(--accent)', color: 'var(--on-accent)', fontWeight: 800 } : { color: 'var(--sub)', fontWeight: 700 }}
              >
                {WEEKDAY_LETTERS[d]}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <span className="label">Skips allowed</span>
          <div className="row" style={{ flexWrap: 'wrap' }}>
            {per !== 'none' && (
              <input className="field num" type="number" min={0} max={per === 'week' ? 7 : 31} aria-label="Number of skips" value={count} onChange={(e) => setCount(e.target.value)} style={{ width: 90 }} />
            )}
            <Seg label="Skips per" value={per} onChange={setPer} options={[{ value: 'week', label: 'Per week' }, { value: 'month', label: 'Per month' }, { value: 'none', label: 'No skips' }]} />
          </div>
          <span className="faint" style={{ fontSize: 12 }}>A missed day uses a skip. Weeks start Monday.</span>
        </div>

        <div className="form-row">
          <span className="label">Fill in automatically</span>
          <Seg label="Fill in automatically" value={link} onChange={setLink} options={[{ value: 'none', label: 'No' }, { value: 'workHours', label: 'From work hours' }, { value: 'workout', label: 'From any workout' }]} />
          {link === 'workHours' && <span className="faint" style={{ fontSize: 12 }}>Timer and added hours count toward it. Use Amount with "h" as the unit, like 3 h.</span>}
          {link === 'workout' && <span className="faint" style={{ fontSize: 12 }}>Logging any exercise that day checks it off.</span>}
        </div>

        <label className="form-row">
          <span className="label">Note (optional)</span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Like Lights out by 11 pm" />
        </label>

        {goal && <span className="faint" style={{ fontSize: 12 }}>Tracking started {fmtLong(goal.startDate)}. Earlier days never count as missed.</span>}
        {error && <p role="alert" style={{ margin: 0, color: 'var(--warn-text)', fontWeight: 700, fontSize: 14 }}><Icon name="x" size={12} /> {error}</p>}
        <button type="submit" className="sr-only">Save</button>
      </form>
    </Modal>
  );
}
