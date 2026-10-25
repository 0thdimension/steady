import { useMemo, useState } from 'react';
import { addExercise, deleteExercise, updateExercise, useStore } from '../data/store';
import { live } from '../data/logic';
import { addDays, fmtLong } from '../data/dates';
import WorkoutLog, { describeLog } from '../components/WorkoutLog';
import { Empty, Icon, Panel, useColor } from '../components/ui';
import { ColorPicker, ConfirmDelete, InlineText } from './Projects';

export default function ExerciseScreen() {
  const today = useStore((s) => s.today);
  const allExercises = useStore((s) => s.data.exercises);
  const allLogs = useStore((s) => s.data.exLogs);
  const unit = useStore((s) => s.data.settings.weightUnit);
  const color = useColor();
  const [date, setDate] = useState(today);
  const [newName, setNewName] = useState('');
  const [newLower, setNewLower] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const exercises = useMemo(() => live(allExercises).sort((a, b) => a.order - b.order), [allExercises]);
  const active = exercises.filter((e) => !e.archived);
  const archived = exercises.filter((e) => e.archived);

  const recent = useMemo(() => {
    const logs = live(allLogs);
    const dates = [...new Set(logs.map((l) => l.date))].sort((a, b) => (a < b ? 1 : -1)).slice(0, 10);
    return dates.map((d) => ({
      date: d,
      text: logs
        .filter((l) => l.date === d)
        .sort((a, b) => a.order - b.order)
        .map((l) => `${exercises.find((e) => e.id === l.exerciseId)?.name ?? 'Exercise'} ${describeLog(l, unit)}`)
        .join(' · '),
    }));
  }, [allLogs, exercises, unit]);

  const add = () => {
    const n = newName.trim();
    if (!n) return;
    addExercise(n, newLower);
    setNewName('');
    setNewLower(false);
  };

  const dayLabel = date === today ? 'Today' : date === addDays(today, -1) ? 'Yesterday' : fmtLong(date);

  return (
    <div className="cols">
      <div className="stack" style={{ flex: '2 1 640px' }}>
        <Panel
          title={
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="label">Workout</span>
              <h1 className="h1" id="workout-h">{dayLabel}</h1>
              {date !== today && <span className="muted" style={{ fontSize: 13 }}>{fmtLong(date)}</span>}
            </div>
          }
          labelledBy="workout-h"
          actions={
            <>
              <button className="icon-btn" aria-label="Previous day" onClick={() => setDate(addDays(date, -1))}><Icon name="left" /></button>
              <label className="sr-only" htmlFor="workout-date">Workout date</label>
              <input id="workout-date" className="field" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} style={{ width: 170 }} />
              <button className="icon-btn" aria-label="Next day" disabled={date >= today} onClick={() => setDate(addDays(date, 1))} style={date >= today ? { opacity: 0.4 } : undefined}><Icon name="right" /></button>
              {date !== today && <button className="pill small" onClick={() => setDate(today)}>Today</button>}
            </>
          }
        >
          <WorkoutLog date={date} />
        </Panel>

        <Panel title="Recent workouts">
          {recent.length === 0 && <Empty>Your workouts show up here once you log one.</Empty>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {recent.map((r) => (
              <button
                key={r.date}
                className="list-row"
                onClick={() => { setDate(r.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                aria-current={r.date === date ? 'date' : undefined}
                style={{ width: '100%', border: 0, borderTop: '1px solid var(--line)', background: r.date === date ? 'var(--tile)' : 'transparent', borderRadius: 12, padding: '10px 12px', textAlign: 'left', alignItems: 'flex-start', flexDirection: 'column', gap: 3 }}
              >
                <span style={{ fontWeight: 800, fontSize: 14 }}>{r.date === today ? 'Today' : fmtLong(r.date)}</span>
                <span className="muted" style={{ fontSize: 13, lineHeight: 1.5 }}>{r.text}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <div className="stack" style={{ flex: '1 1 360px', maxWidth: 560 }}>
        <Panel title="Saved exercises">
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>These fill the exercise dropdown. Archive one to hide it from the list but keep its history.</p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {active.length === 0 && <Empty>No saved exercises yet. Add your first one below.</Empty>}
            {active.map((e) => (
              <div key={e.id} className="list-row" style={{ flexWrap: 'wrap', gap: 6, padding: '4px 0' }}>
                <ColorPicker value={e.color} label={e.name} onChange={(c) => updateExercise(e.id, { color: c })} />
                <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                  <InlineText value={e.name} label="Exercise name" required onCommit={(name) => updateExercise(e.id, { name })} style={{ fontWeight: 800 }} />
                </div>
                <button
                  className="pill small"
                  aria-pressed={e.lowerIsBetter}
                  onClick={() => updateExercise(e.id, { lowerIsBetter: !e.lowerIsBetter })}
                  title="For timed things like a run, a smaller time counts as better"
                  style={e.lowerIsBetter ? { background: 'var(--accent)', color: 'var(--on-accent)' } : undefined}
                >
                  {e.lowerIsBetter && <Icon name="check" size={12} />} Lower time is better
                </button>
                <button className="pill small ghost" onClick={() => updateExercise(e.id, { archived: true })}>Archive</button>
                <ConfirmDelete what={e.name} onConfirm={() => deleteExercise(e.id)} />
              </div>
            ))}
          </div>
          <form className="form-grid" onSubmit={(ev) => { ev.preventDefault(); add(); }} style={{ gap: 10 }}>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <label className="sr-only" htmlFor="new-exercise">New exercise name</label>
              <input id="new-exercise" className="field field-pill" style={{ flex: '1 1 200px' }} placeholder="Add an exercise, like Lunges" value={newName} onChange={(ev) => setNewName(ev.target.value)} />
              <button type="submit" className="pill accent" disabled={!newName.trim()}><Icon name="plus" /> Add</button>
            </div>
            <button
              type="button"
              className="pill small ghost"
              aria-pressed={newLower}
              onClick={() => setNewLower(!newLower)}
              style={{ alignSelf: 'flex-start', ...(newLower ? { color: 'var(--text)', background: 'var(--tile2)' } : {}) }}
            >
              <span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: 5, border: '1.8px solid var(--ring)', display: 'grid', placeItems: 'center', background: newLower ? 'var(--accent)' : 'transparent', color: 'var(--on-accent)' }}>
                {newLower && <Icon name="check" size={11} />}
              </span>
              It's timed and a lower time is better
            </button>
          </form>
          {archived.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="pill ghost small" style={{ alignSelf: 'flex-start' }} aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>
                <Icon name={showArchived ? 'down' : 'right'} size={12} /> Archived ({archived.length})
              </button>
              {showArchived && archived.map((e) => (
                <div key={e.id} className="list-row" style={{ gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: color(e.color), marginLeft: 18 }} />
                  <span className="muted" style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{e.name}</span>
                  <button className="pill small" onClick={() => updateExercise(e.id, { archived: false })}>Unarchive</button>
                  <ConfirmDelete what={e.name} onConfirm={() => deleteExercise(e.id)} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
