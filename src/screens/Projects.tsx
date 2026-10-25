import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  addProject, deleteProject, deleteTime, setFocus, startTimer, stopTimer, updateProject, updateTime, useStore,
} from '../data/store';
import { live } from '../data/logic';
import { addDays, fmtClock, fmtHours, fmtLong, monthStart, toKey, weekStart } from '../data/dates';
import { PALETTE, PALETTE_KEYS } from '../data/palette';
import type { PaletteKey, Project } from '../data/types';
import AddHoursModal from '../components/AddHoursModal';
import { Empty, Icon, Panel, useClickAway, useColor } from '../components/ui';

// ---------------------------------------------------------------- small shared editors (also used by Exercise)

/** A text field that looks like plain text until focused; saves on blur or Enter, Escape undoes. */
export function InlineText({ value, onCommit, label, placeholder, required, style }: {
  value: string; onCommit: (v: string) => void; label: string; placeholder?: string; required?: boolean; style?: CSSProperties;
}) {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [value]);
  const commit = () => {
    const t = text.trim();
    if (required && !t) { setText(value); return; }
    if (t !== value) onCommit(t);
  };
  return (
    <input
      className="field"
      aria-label={label}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setText(value); (e.target as HTMLInputElement).blur(); }
      }}
      style={{ background: 'transparent', borderColor: 'transparent', minWidth: 0, ...style }}
    />
  );
}

/** A color dot that opens a small row of palette swatches. */
export function ColorPicker({ value, onChange, label }: { value: PaletteKey; onChange: (k: PaletteKey) => void; label: string }) {
  const color = useColor();
  const [open, setOpen] = useState(false);
  const ref = useClickAway(() => setOpen(false), open);
  return (
    <div ref={ref} style={{ position: 'relative', flex: 'none' }}>
      <button
        className="icon-btn bare"
        aria-label={`${label} color: ${PALETTE[value]?.label ?? 'Sky'}. Change color`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span style={{ width: 14, height: 14, borderRadius: '50%', background: color(value) }} />
      </button>
      {open && (
        <div className="glass" role="group" aria-label={`${label} colors`} style={{ position: 'absolute', top: 46, left: 0, zIndex: 30, padding: 6, display: 'flex', gap: 2, borderRadius: 16 }}>
          {PALETTE_KEYS.map((k) => (
            <button
              key={k}
              className="icon-btn small bare"
              aria-label={PALETTE[k].label}
              aria-pressed={k === value}
              onClick={() => { onChange(k); setOpen(false); }}
            >
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: color(k), boxShadow: k === value ? '0 0 0 2px var(--text)' : 'none' }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Two-step delete: the first click asks, the second does it. */
export function ConfirmDelete({ what, onConfirm, small = true }: { what: string; onConfirm: () => void; small?: boolean }) {
  const [asking, setAsking] = useState(false);
  if (asking) {
    return (
      <span className="row" style={{ gap: 4 }} role="group" aria-label={`Delete ${what}?`}>
        <span className="muted" style={{ fontSize: 13, fontWeight: 700 }}>Delete?</span>
        <button className={'pill danger' + (small ? ' small' : '')} onClick={() => { setAsking(false); onConfirm(); }}>Yes, delete</button>
        <button className={'pill ghost' + (small ? ' small' : '')} onClick={() => setAsking(false)}>Keep</button>
      </span>
    );
  }
  return (
    <button className="icon-btn bare" aria-label={`Delete ${what}`} onClick={() => setAsking(true)}>
      <Icon name="trash" />
    </button>
  );
}

// ---------------------------------------------------------------- hours helpers

const useMinutes = () => {
  const time = useStore((s) => s.data.time);
  const timer = useStore((s) => s.data.settings.timer);
  const now = useStore((s) => s.now);
  return (projectId: string, from: string, to: string) => {
    let m = 0;
    for (const t of time) if (!t.deleted && t.projectId === projectId && t.date >= from && t.date <= to) m += t.minutes;
    if (timer && timer.projectId === projectId) {
      const d = toKey(new Date(timer.startedAt));
      if (d >= from && d <= to) m += Math.max(0, (now - timer.startedAt) / 60000);
    }
    return m;
  };
};

function HoursField({ minutes, onCommit, label }: { minutes: number; onCommit: (m: number) => void; label: string }) {
  const shown = fmtHours(minutes);
  const [text, setText] = useState(shown);
  useEffect(() => { setText(shown); }, [shown]);
  const commit = () => {
    const h = Number(text.trim().replace(',', '.'));
    if (Number.isFinite(h) && h > 0 && h <= 24) {
      const m = Math.round(h * 60 * 10) / 10;
      if (Math.abs(m - minutes) > 0.05) onCommit(m);
    } else setText(shown);
  };
  return (
    <span className="row" style={{ gap: 6 }}>
      <input
        className="field num"
        type="number"
        min={0}
        step={0.25}
        inputMode="decimal"
        aria-label={label}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        style={{ width: 84 }}
      />
      <span className="muted" style={{ fontSize: 13 }}>h</span>
    </span>
  );
}

// ---------------------------------------------------------------- screen

function ProjectRow({ p, focused, week, month }: { p: Project; focused: boolean; week: number; month: number }) {
  return (
    <div className="list-row" style={{ flexWrap: 'wrap', padding: '6px 0', gap: 6 }}>
      <ColorPicker value={p.color} label={p.name} onChange={(color) => updateProject(p.id, { color })} />
      <div style={{ flex: '1 1 160px', minWidth: 0 }}>
        <InlineText value={p.name} label="Project name" required onCommit={(name) => updateProject(p.id, { name })} style={{ fontWeight: 800 }} />
      </div>
      <div style={{ flex: '2 1 200px', minWidth: 0 }}>
        <InlineText value={p.next} label={`Next step for ${p.name}`} placeholder="Next step" onCommit={(next) => updateProject(p.id, { next })} style={{ fontWeight: 600, color: 'var(--sub)' }} />
      </div>
      <span className="num" style={{ width: 132, textAlign: 'right', fontSize: 13, fontWeight: 700 }} aria-label={`${fmtHours(week)} hours this week, ${fmtHours(month)} this month`}>
        {fmtHours(week)} h <span className="faint" style={{ fontWeight: 600 }}>week</span> · {fmtHours(month)} h <span className="faint" style={{ fontWeight: 600 }}>month</span>
      </span>
      <button
        className="icon-btn bare"
        aria-pressed={focused}
        aria-label={focused ? `${p.name} is your focus` : `Make ${p.name} your focus`}
        onClick={() => setFocus(focused ? null : p.id)}
        style={focused ? { color: 'var(--accent)', background: 'var(--tile2)' } : undefined}
      >
        <Icon name="pin" />
      </button>
      <button className="pill small ghost" onClick={() => { updateProject(p.id, { archived: true }); if (focused) setFocus(null); }}>Archive</button>
      <ConfirmDelete what={p.name} onConfirm={() => deleteProject(p.id)} />
    </div>
  );
}

export default function Projects() {
  const data = useStore((s) => s.data);
  const today = useStore((s) => s.today);
  const now = useStore((s) => s.now);
  const color = useColor();
  const minutes = useMinutes();
  const [modal, setModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const timer = data.settings.timer;
  const focusId = data.settings.focusProjectId;
  const all = useMemo(() => live(data.projects).sort((a, b) => a.order - b.order), [data.projects]);
  const active = all.filter((p) => !p.archived);
  const archived = all.filter((p) => p.archived);
  const focus = active.find((p) => p.id === focusId) ?? null;
  const running = timer ? all.find((p) => p.id === timer.projectId) : null;
  const ws = weekStart(today);
  const ms = monthStart(today);

  const groups = useMemo(() => {
    const from = addDays(today, -29);
    const byDate = new Map<string, typeof data.time>();
    for (const t of data.time) {
      if (t.deleted || t.date < from) continue;
      byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
    }
    return [...byDate.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([date, list]) => ({ date, list: list.sort((a, b) => (a.start ?? a.createdAt) - (b.start ?? b.createdAt)) }));
  }, [data.time, today]);

  const add = () => {
    const n = newName.trim();
    if (!n) return;
    addProject(n);
    setNewName('');
  };

  return (
    <div className="cols">
      <div className="stack" style={{ flex: '1 1 380px', maxWidth: 520 }}>
        <Panel title="Focus" labelledBy="focus-h">
          {active.length === 0 ? (
            <Empty>Add a project to track your hours and pick what you're focusing on.</Empty>
          ) : (
            <>
              <label className="form-row">
                <span className="label">Current focus</span>
                <select className="field" value={focus?.id ?? ''} onChange={(e) => setFocus(e.target.value || null)}>
                  <option value="">No focus</option>
                  {active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              {focus && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <p style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>{focus.name}</p>
                  <InlineText value={focus.next} label="Next up" placeholder="What's next on it?" onCommit={(next) => updateProject(focus.id, { next })} style={{ paddingLeft: 0, color: 'var(--sub)' }} />
                </div>
              )}
              <div className="tile between" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="num" style={{ fontSize: 34, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.02em' }} aria-live="off">
                    {fmtClock(timer ? now - timer.startedAt : 0)}
                  </span>
                  <span className="muted" style={{ fontSize: 12 }}>
                    {timer ? `Running on ${running?.name ?? 'a project'}` : focus ? `${fmtHours(minutes(focus.id, today, today))} h today · ${fmtHours(minutes(focus.id, ws, today))} h this week` : 'Pick a focus to start the timer'}
                  </span>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  {timer ? (
                    <button className="pill accent" onClick={stopTimer}><Icon name="stop" size={12} /> Stop</button>
                  ) : (
                    <button className="pill accent" disabled={!focus} onClick={() => focus && startTimer(focus.id)}><Icon name="play" size={12} /> Start</button>
                  )}
                  <button className="pill" onClick={() => setModal(true)}><Icon name="plus" /> Hours</button>
                </div>
              </div>
            </>
          )}
        </Panel>

        <Panel title="Hours log" actions={<button className="pill small" onClick={() => setModal(true)}><Icon name="plus" /> Add hours</button>}>
          {groups.length === 0 && <Empty>No hours in the last 30 days yet. Start the timer or add hours by hand.</Empty>}
          {groups.map((g) => {
            const total = g.list.reduce((s, t) => s + t.minutes, 0);
            return (
              <div key={g.date} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="between" style={{ padding: '4px 0' }}>
                  <h3 className="h3">{g.date === today ? 'Today' : fmtLong(g.date)}</h3>
                  <span className="num muted" style={{ fontSize: 13, fontWeight: 700 }}>{fmtHours(total)} h</span>
                </div>
                {g.list.map((t) => {
                  const p = all.find((x) => x.id === t.projectId) ?? data.projects.find((x) => x.id === t.projectId);
                  const name = p?.name ?? 'Deleted project';
                  return (
                    <div key={t.id} className="list-row" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: color(p?.color) }} />
                      <span style={{ flex: '1 1 120px', minWidth: 0, fontWeight: 700, fontSize: 14 }}>
                        {name}
                        {t.note && <span className="faint" style={{ fontWeight: 600 }}> · {t.note}</span>}
                      </span>
                      <span className="tag">{t.source === 'timer' ? 'Timer' : 'Added'}</span>
                      <HoursField minutes={t.minutes} label={`Hours on ${name}`} onCommit={(m) => updateTime(t.id, { minutes: m })} />
                      <ConfirmDelete what={`${fmtHours(t.minutes)} hours on ${name}`} onConfirm={() => deleteTime(t.id)} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Panel>
      </div>

      <div className="stack" style={{ flex: '2 1 560px' }}>
        <Panel title="Projects">
          <form className="row" style={{ flexWrap: 'wrap' }} onSubmit={(e) => { e.preventDefault(); add(); }}>
            <label className="sr-only" htmlFor="new-project">New project</label>
            <input id="new-project" className="field field-pill" style={{ flex: '1 1 240px' }} placeholder="Add a project" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <button type="submit" className="pill accent" disabled={!newName.trim()}><Icon name="plus" /> Add</button>
          </form>
          {active.length === 0 && <Empty>No projects yet.</Empty>}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {active.map((p) => (
              <ProjectRow key={p.id} p={p} focused={p.id === focusId} week={minutes(p.id, ws, today)} month={minutes(p.id, ms, today)} />
            ))}
          </div>
          {archived.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button className="pill ghost small" style={{ alignSelf: 'flex-start' }} aria-expanded={showArchived} onClick={() => setShowArchived(!showArchived)}>
                <Icon name={showArchived ? 'down' : 'right'} size={12} /> Archived ({archived.length})
              </button>
              {showArchived && archived.map((p) => (
                <div key={p.id} className="list-row" style={{ gap: 8 }}>
                  <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: '50%', background: color(p.color), marginLeft: 18 }} />
                  <span style={{ flex: 1, minWidth: 0, fontWeight: 700 }} className="muted">{p.name}</span>
                  <button className="pill small" onClick={() => updateProject(p.id, { archived: false })}>Unarchive</button>
                  <ConfirmDelete what={p.name} onConfirm={() => deleteProject(p.id)} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {modal && <AddHoursModal onClose={() => setModal(false)} defaultProjectId={focusId} defaultDate={today} />}
    </div>
  );
}
