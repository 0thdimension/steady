import { useEffect, useRef, useState } from 'react';
import { setJournal, useStore } from '../data/store';
import { Icon } from './ui';

// Typing is kept locally and saved a moment after you pause (and when you leave), so each
// keystroke doesn't rewrite the data file.
function useDebouncedCommit<T>(commit: (v: T) => void, delay = 500) {
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<{ v: T } | null>(null);
  const flush = () => {
    window.clearTimeout(timer.current);
    if (pending.current) { commit(pending.current.v); pending.current = null; }
  };
  useEffect(() => flush, []); // save on unmount
  return {
    push: (v: T) => {
      pending.current = { v };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delay);
    },
    flush,
  };
}

const padTo3 = (xs: string[]) => (xs.length >= 3 ? xs : [...xs, ...Array(3 - xs.length).fill('')]);

/** Numbered gratitude lines for one day. Give it key={date} so it resets when the day changes. */
export function GratitudeEditor({ date, compact = false }: { date: string; compact?: boolean }) {
  const stored = useStore((s) => s.data.journal.find((j) => !j.deleted && j.date === date)?.gratitude);
  const [items, setItems] = useState<string[]>(() => padTo3(stored ?? []));
  const save = useDebouncedCommit<string[]>((next) => setJournal(date, { gratitude: next.map((x) => x.trim()).filter(Boolean) }));

  const change = (i: number, v: string) => {
    const next = items.slice();
    next[i] = v;
    setItems(next);
    save.push(next);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((v, i) => (
        <div key={i} className="row" style={{ gap: 10 }}>
          <span aria-hidden="true" className="tile num" style={{ flex: 'none', width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>{i + 1}</span>
          <label className="sr-only" htmlFor={`grat-${date}-${i}`}>Grateful for, number {i + 1}</label>
          <input
            id={`grat-${date}-${i}`}
            className="field"
            value={v}
            onChange={(e) => change(i, e.target.value)}
            onBlur={save.flush}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget.closest('div')?.nextElementSibling?.querySelector('input') as HTMLInputElement | null)?.focus(); }}
            style={{ minHeight: compact ? 40 : 44 }}
          />
        </div>
      ))}
      {!compact && (
        <button className="pill small ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setItems((xs) => [...xs, ''])}>
          <Icon name="plus" size={12} /> Add another
        </button>
      )}
    </div>
  );
}

export const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** The free-writing page for one day. Give it key={date}. */
export function JournalEditor({ date }: { date: string }) {
  const stored = useStore((s) => s.data.journal.find((j) => !j.deleted && j.date === date)?.text);
  const saveState = useStore((s) => s.saveState);
  const [text, setText] = useState(stored ?? '');
  const [dirty, setDirty] = useState(false);
  const save = useDebouncedCommit<string>((v) => { setJournal(date, { text: v }); setDirty(false); }, 700);
  const words = wordCount(text);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <label className="sr-only" htmlFor={`journal-${date}`}>Journal</label>
      <textarea
        id={`journal-${date}`}
        className="field"
        value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true); save.push(e.target.value); }}
        onBlur={save.flush}
        style={{ minHeight: 340, fontSize: 16, lineHeight: 1.7, fontWeight: 500 }}
      />
      <div className="between">
        <span className="muted" style={{ fontSize: 13 }}>{words} word{words === 1 ? '' : 's'}</span>
        <span className="faint" style={{ fontSize: 13 }}>{dirty ? 'Saving…' : saveState === 'error' ? "Couldn't save" : 'Saved'}</span>
      </div>
    </div>
  );
}
