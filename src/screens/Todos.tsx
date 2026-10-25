import { useMemo, useRef, useState } from 'react';
import { addTodo, deleteTodo, moveTodo, toggleTodo, updateTodo, useStore } from '../data/store';
import { BOX_NAMES, live, parseTags } from '../data/logic';
import { addDays, daysBetween, fmtDue, fmtShort, monthStart, toKey, weekStart } from '../data/dates';
import { tagColorKey } from '../data/palette';
import type { Box, Todo } from '../data/types';
import { Empty, Icon, Panel, Seg, TagChip, useColor } from '../components/ui';

// Row tools (move, delete) stay quiet until the row is hovered or focused.
const LOCAL_CSS = `
.todo-grid { display: grid; gap: 20px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (max-width: 900px) { .todo-grid { grid-template-columns: minmax(0, 1fr); } }
.todo-row { position: relative; }
.todo-row .todo-tools {
  position: absolute; right: 0; top: 50%; transform: translateY(-50%);
  display: flex; align-items: center; gap: 4px; padding: 4px; border-radius: 999px;
  background: var(--panel-solid); box-shadow: 0 6px 18px rgba(0, 0, 0, .18);
  opacity: 0; pointer-events: none; transition: opacity .15s;
}
.todo-row:hover .todo-tools, .todo-row:focus-within .todo-tools { opacity: 1; pointer-events: auto; }
@media (hover: none) { .todo-row .todo-tools { position: static; transform: none; box-shadow: none; background: transparent; opacity: 1; pointer-events: auto; } }
.todo-row[draggable='true'] { cursor: grab; }
.todo-row.dragging { opacity: .45; }
.todo-text { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; width: 100%; min-height: 44px; padding: 8px 0; border: 0; background: transparent; text-align: left; font-size: 14px; font-weight: 600; color: var(--text); cursor: text; }
.todo-move { min-height: 36px; width: auto; padding: 0 8px; font-size: 12px; border-radius: 999px; }
.todo-date { border: 0; background: transparent; color: inherit; font: inherit; font-size: 13px; font-weight: 700; min-height: 40px; outline: none; }
.todo-date::-webkit-calendar-picker-indicator { cursor: pointer; }
.tag-head { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 44px; padding: 0 10px; border: 0; border-radius: 12px; background: transparent; text-align: left; font-weight: 800; font-size: 14px; color: var(--text); }
.tag-head:hover, .tag-head[aria-pressed='true'] { background: var(--tile2); }
.box-panel { transition: outline-color .15s; outline: 2px dashed transparent; outline-offset: -2px; }
.box-panel.drop { outline-color: var(--accent); }
`;

const BOXES: Box[] = [0, 1, 2, 3];
const BOX_OPTIONS = BOXES.map((b) => ({ value: String(b) as '0' | '1' | '2' | '3', label: BOX_NAMES[b] }));

const sortOpen = (a: Todo, b: Todo) => {
  if (a.due && b.due) return a.due < b.due ? -1 : a.due > b.due ? 1 : a.order - b.order;
  if (a.due) return -1;
  if (b.due) return 1;
  return a.order - b.order;
};

function TodoRow({ t, today, dragId, setDragId }: {
  t: Todo; today: string; dragId: string | null; setDragId: (id: string | null) => void;
}) {
  const { tags, plain } = parseTags(t.text);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(t.text);
  const [due, setDue] = useState(t.due ?? '');
  const cancelled = useRef(false);

  const soon = !!t.due && daysBetween(today, t.due) <= 1;

  const start = () => {
    setText(t.text);
    setDue(t.due ?? '');
    cancelled.current = false;
    setEditing(true);
  };
  const save = () => {
    if (cancelled.current) { cancelled.current = false; setEditing(false); return; }
    const next = text.trim();
    if (next && (next !== t.text || (due || null) !== t.due)) updateTodo(t.id, { text: next, due: due || null });
    setEditing(false);
  };

  return (
    <div
      className={'todo-row list-row' + (dragId === t.id ? ' dragging' : '')}
      draggable={!editing}
      onDragStart={(e) => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; setDragId(t.id); }}
      onDragEnd={() => setDragId(null)}
    >
      <button className="check-ring" aria-label={`Complete: ${plain}`} onClick={() => toggleTodo(t.id)}><span /></button>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div
            className="row"
            style={{ flexWrap: 'wrap', gap: 8, padding: '6px 0' }}
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) save(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); save(); }
              if (e.key === 'Escape') { e.preventDefault(); cancelled.current = true; save(); }
            }}
          >
            <label className="sr-only" htmlFor={`edit-${t.id}`}>Edit task</label>
            <input id={`edit-${t.id}`} className="field" autoFocus value={text} onChange={(e) => setText(e.target.value)} style={{ flex: '1 1 220px', minHeight: 40 }} />
            <label className="pill small" style={{ gap: 6 }}>
              <Icon name="calendar" size={14} />
              <span className="sr-only">Due date</span>
              <input type="date" className="todo-date" value={due} onChange={(e) => setDue(e.target.value)} />
            </label>
            {due && <button className="pill small ghost" onClick={() => setDue('')}>No date</button>}
          </div>
        ) : (
          <button className="todo-text" onClick={start} aria-label={`Edit: ${plain}`}>
            <span>{plain}</span>
            {tags.map((tag) => <TagChip key={tag} tag={tag} />)}
          </button>
        )}
      </div>
      {!editing && t.due && (
        <span className="num" style={{ fontSize: 12, whiteSpace: 'nowrap', color: soon ? 'var(--warn-text)' : 'var(--sub)', fontWeight: soon ? 800 : 700 }}>
          {fmtDue(t.due, today)}
        </span>
      )}
      {!editing && (
        <div className="todo-tools">
          <label className="sr-only" htmlFor={`move-${t.id}`}>Move to box</label>
          <select
            id={`move-${t.id}`}
            className="field todo-move"
            aria-label="Move to box"
            value={t.box}
            onChange={(e) => moveTodo(t.id, Number(e.target.value) as Box)}
          >
            {BOXES.map((b) => <option key={b} value={b}>{BOX_NAMES[b]}</option>)}
          </select>
          <button className="icon-btn bare small" aria-label={`Delete: ${plain}`} onClick={() => deleteTodo(t.id)}>
            <Icon name="trash" />
          </button>
        </div>
      )}
    </div>
  );
}

type DoneRange = 'today' | 'week' | 'month' | 'all';
const DONE_RANGES: DoneRange[] = ['today', 'week', 'month', 'all'];
const DONE_LABEL: Record<DoneRange, string> = { today: 'Today', week: 'This week', month: 'This month', all: 'All time' };

const doneDay = (doneAt: number, today: string) => {
  const k = toKey(new Date(doneAt));
  const diff = daysBetween(k, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return fmtShort(k);
};

export default function Todos() {
  const allTodos = useStore((s) => s.data.todos);
  const today = useStore((s) => s.today);
  const color = useColor();

  const [text, setText] = useState('');
  const [box, setBox] = useState<Box>(0);
  const [due, setDue] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropBox, setDropBox] = useState<Box | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [doneRange, setDoneRange] = useState<DoneRange>('today');
  const inputRef = useRef<HTMLInputElement>(null);

  const todos = useMemo(() => live(allTodos), [allTodos]);
  const open = useMemo(() => todos.filter((t) => !t.done), [todos]);

  const dueSoon = open.filter((t) => t.due && t.due <= addDays(today, 3)).length;

  const byBox = useMemo(() => {
    const out: Record<Box, Todo[]> = { 0: [], 1: [], 2: [], 3: [] };
    for (const t of open) {
      if (tagFilter && !parseTags(t.text).tags.includes(tagFilter)) continue;
      out[t.box].push(t);
    }
    for (const b of BOXES) out[b].sort(sortOpen);
    return out;
  }, [open, tagFilter]);

  const tagGroups = useMemo(() => {
    const groups = new Map<string, Todo[]>();
    for (const t of open) {
      for (const tag of parseTags(t.text).tags) {
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag)!.push(t);
      }
    }
    return [...groups.entries()]
      .map(([tag, items]) => ({ tag, items: items.slice().sort((a, b) => a.box - b.box || sortOpen(a, b)) }))
      .sort((a, b) => b.items.length - a.items.length || (a.tag < b.tag ? -1 : 1));
  }, [open]);

  const doneAll = useMemo(
    () => todos
      .filter((t) => t.done && t.doneAt != null)
      .map((t) => ({ t, day: toKey(new Date(t.doneAt!)) }))
      .sort((a, b) => (b.t.doneAt ?? 0) - (a.t.doneAt ?? 0)),
    [todos],
  );
  const since: Record<DoneRange, string> = { today, week: weekStart(today), month: monthStart(today), all: '' };
  const doneCount = (r: DoneRange) => doneAll.filter((d) => d.day >= since[r]).length;
  const doneShown = doneAll.filter((d) => d.day >= since[doneRange]).map((d) => d.t);

  const submit = () => {
    if (!text.trim()) { inputRef.current?.focus(); return; }
    addTodo(text, box, due || null);
    setText('');
    setDue('');
    inputRef.current?.focus();
  };

  const addHere = (b: Box) => {
    setBox(b);
    inputRef.current?.focus();
  };

  const onDrop = (b: Box, e: React.DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setDropBox(null);
    setDragId(null);
    if (!id) return;
    const t = todos.find((x) => x.id === id);
    if (t && t.box !== b) moveTodo(id, b);
  };

  return (
    <div className="stack">
      <style>{LOCAL_CSS}</style>

      <Panel>
        <div className="between">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p className="label">
              {open.length} open{dueSoon > 0 ? ` · ${dueSoon} due in the next 3 days` : ''}
            </p>
            <h1 className="h1">Todos</h1>
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
          <label className="sr-only" htmlFor="new-todo">New task</label>
          <input
            id="new-todo"
            ref={inputRef}
            className="field field-pill"
            placeholder="Add a task. Type #tags anywhere, like #home"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            style={{ flex: '1 1 320px', width: 'auto' }}
          />
          <Seg
            label="Which box"
            options={BOX_OPTIONS}
            value={String(box) as '0' | '1' | '2' | '3'}
            onChange={(v) => setBox(Number(v) as Box)}
          />
          <label className="pill" style={{ gap: 8 }}>
            <Icon name="calendar" />
            <span className="sr-only">Due date (optional)</span>
            <input type="date" className="todo-date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          {due && (
            <button className="icon-btn bare" aria-label="Clear the due date" onClick={() => setDue('')}>
              <Icon name="x" />
            </button>
          )}
          <button className="pill accent" onClick={submit} style={{ minHeight: 48, padding: '0 24px', fontSize: 15 }}>Add</button>
        </div>
      </Panel>

      <div className="cols">
        <div className="stack" style={{ flex: '999 1 640px' }}>
          {tagFilter && (
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <span className="label">Showing</span>
              <TagChip tag={tagFilter} />
              <span className="label">only</span>
              <button className="pill small" onClick={() => setTagFilter(null)}>Show all</button>
            </div>
          )}

          <div className="todo-grid">
            {BOXES.map((b) => (
              <section
                key={b}
                className={'glass panel box-panel' + (dropBox === b ? ' drop' : '')}
                aria-labelledby={`box-${b}`}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dropBox !== b) setDropBox(b); }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropBox(null); }}
                onDrop={(e) => onDrop(b, e)}
                style={{ gap: 8 }}
              >
                <div className="between">
                  <div className="row" style={{ gap: 8 }}>
                    <h2 className="h2" id={`box-${b}`}>{BOX_NAMES[b]}</h2>
                    <span className="delta neutral">{byBox[b].length}</span>
                  </div>
                  <button className="pill small" onClick={() => addHere(b)} aria-label={`Add to ${BOX_NAMES[b]}`}>
                    <Icon name="plus" size={12} /> Add
                  </button>
                </div>
                {byBox[b].length === 0 ? (
                  <p className="muted" style={{ margin: '6px 0 4px', fontSize: 14 }}>
                    {tagFilter ? `Nothing tagged ${tagFilter} here.` : b === 0 ? 'Nothing urgent and important right now.' : 'Nothing here yet. Drag a task in or add one.'}
                  </p>
                ) : (
                  <div>
                    {byBox[b].map((t) => <TodoRow key={t.id} t={t} today={today} dragId={dragId} setDragId={setDragId} />)}
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="glass panel" style={{ gap: 8, padding: '12px 18px' }}>
            <div className="between">
              <button
                className="pill ghost"
                aria-expanded={showDone}
                aria-controls="done-list"
                onClick={() => setShowDone((v) => !v)}
                style={{ paddingLeft: 10 }}
              >
                <Icon name={showDone ? 'down' : 'right'} size={14} />
                Done {DONE_LABEL[doneRange].toLowerCase()}
                <span className="delta up">{doneCount(doneRange)}</span>
              </button>
              <Seg
                label="Show what was done"
                value={doneRange}
                onChange={(r) => { setDoneRange(r); setShowDone(true); }}
                options={DONE_RANGES.map((r) => ({ value: r, label: `${DONE_LABEL[r]} · ${doneCount(r)}` }))}
              />
            </div>
            {showDone && (
              <div id="done-list">
                {doneShown.length === 0 ? (
                  <p className="muted" style={{ margin: '4px 10px 8px', fontSize: 14 }}>Nothing checked off {DONE_LABEL[doneRange].toLowerCase()} yet.</p>
                ) : (
                  doneShown.slice(0, 300).map((t) => {
                    const { tags, plain } = parseTags(t.text);
                    return (
                      <div key={t.id} className="todo-row list-row">
                        <button className="check-ring done" aria-label={`Mark not done: ${plain}`} onClick={() => toggleTodo(t.id)}>
                          <span><Icon name="check" size={12} /></span>
                        </button>
                        <div className="row" style={{ flex: 1, minWidth: 0, flexWrap: 'wrap', gap: 6 }}>
                          <span className="muted" style={{ fontSize: 14, fontWeight: 600, textDecoration: 'line-through' }}>{plain}</span>
                          {tags.map((tag) => <TagChip key={tag} tag={tag} />)}
                        </div>
                        <span className="faint num" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{doneDay(t.doneAt!, today)}</span>
                        <button className="pill small ghost" onClick={() => toggleTodo(t.id)}>Undo</button>
                        <button className="icon-btn bare small" aria-label={`Delete: ${plain}`} onClick={() => deleteTodo(t.id)}>
                          <Icon name="trash" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <aside style={{ flex: '1 1 340px', maxWidth: 400, minWidth: 0 }}>
          <Panel title="Tags" labelledBy="tags-h" actions={tagFilter ? <button className="pill small" onClick={() => setTagFilter(null)}>Show all</button> : undefined}>
            <p className="muted" style={{ margin: '-6px 0 0', fontSize: 13 }}>Tagged tasks also stay in their box.</p>
            {tagGroups.length === 0 ? (
              <Empty>Add a #tag to any task, like “Call the dentist #health”, and it shows up here too.</Empty>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tagGroups.map((g) => (
                  <div key={g.tag} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      className="tag-head"
                      aria-pressed={tagFilter === g.tag}
                      onClick={() => setTagFilter(tagFilter === g.tag ? null : g.tag)}
                      aria-label={`${tagFilter === g.tag ? 'Stop filtering by' : 'Show only'} ${g.tag}`}
                    >
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: color(tagColorKey(g.tag)), flex: 'none' }} />
                      <span style={{ flex: 1 }}>{g.tag}</span>
                      <span className="delta neutral">{g.items.length}</span>
                    </button>
                    {g.items.map((t) => (
                      <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '6px 10px 6px 27px' }}>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{parseTags(t.text).plain}</span>
                        <span className="faint" style={{ fontSize: 12, fontWeight: 600 }}>
                          {BOX_NAMES[t.box]}{t.due ? ` · ${fmtDue(t.due, today)}` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
