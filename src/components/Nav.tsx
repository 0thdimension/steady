import { useMemo, useState } from 'react';
import { startTimer, stopTimer, toggleTheme, useStore } from '../data/store';
import { activeGoals, live, parseTags } from '../data/logic';
import { fmtClock, fmtShort } from '../data/dates';
import type { Screen } from '../data/types';
import { Icon, Logo, useClickAway } from './ui';

const LINKS: Array<{ screen: Screen; label: string }> = [
  { screen: 'today', label: 'Today' },
  { screen: 'todos', label: 'Todos' },
  { screen: 'journal', label: 'Journal' },
  { screen: 'progress', label: 'Progress' },
  { screen: 'exercise', label: 'Exercise' },
  { screen: 'projects', label: 'Projects' },
];

function Search() {
  const data = useStore((s) => s.data);
  const go = useStore((s) => s.go);
  const openJournal = useStore((s) => s.openJournal);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useClickAway(() => setOpen(false), open);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: Array<{ key: string; label: string; where: string; screen: Screen; date?: string }> = [];
    for (const t of live(data.todos)) {
      if (t.done) continue;
      if (t.text.toLowerCase().includes(s)) out.push({ key: t.id, label: parseTags(t.text).plain, where: 'Todo', screen: 'todos' });
    }
    for (const g of activeGoals(data)) if (g.name.toLowerCase().includes(s)) out.push({ key: g.id, label: g.name, where: 'Goal', screen: 'today' });
    for (const p of live(data.projects)) if (!p.archived && p.name.toLowerCase().includes(s)) out.push({ key: p.id, label: p.name, where: 'Project', screen: 'projects' });
    for (const e of live(data.exercises)) if (!e.archived && e.name.toLowerCase().includes(s)) out.push({ key: e.id, label: e.name, where: 'Exercise', screen: 'exercise' });
    for (const j of live(data.journal).sort((a, b) => (a.date < b.date ? 1 : -1))) {
      const hit = j.gratitude.find((g) => g.toLowerCase().includes(s)) ?? (j.text.toLowerCase().includes(s) ? j.text : null);
      if (hit) out.push({ key: j.id, label: `${fmtShort(j.date)}: ${hit.trim().slice(0, 60)}`, where: 'Journal', screen: 'journal', date: j.date });
    }
    return out.slice(0, 8);
  }, [q, data]);

  return (
    <div className="search" ref={ref}>
      <label className="search-box">
        <Icon name="search" />
        <span className="sr-only">Search</span>
        <input
          value={q}
          placeholder="Search tasks, goals, journal"
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setQ(''); setOpen(false); } }}
        />
      </label>
      {open && q.trim() && (
        <div className="glass search-results" role="listbox" aria-label="Search results">
          {results.length === 0 && <p className="muted" style={{ margin: '10px 14px' }}>Nothing matches “{q.trim()}”.</p>}
          {results.map((r) => (
            <button key={r.key} role="option" aria-selected="false" onClick={() => { if (r.date) openJournal(r.date); else go(r.screen); setOpen(false); setQ(''); }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
              <span className="faint" style={{ fontSize: 12 }}>{r.where}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TimerPill() {
  const timer = useStore((s) => s.data.settings.timer);
  const focusId = useStore((s) => s.data.settings.focusProjectId);
  const projects = useStore((s) => s.data.projects);
  const now = useStore((s) => s.now);
  const go = useStore((s) => s.go);
  const running = timer ? projects.find((p) => p.id === timer.projectId) : null;
  const focus = projects.find((p) => p.id === focusId && !p.deleted);

  if (timer) {
    return (
      <div className="timer-pill" role="status" aria-label={`Timer running on ${running?.name ?? 'a project'}`}>
        <span className="live" aria-hidden="true" />
        <span style={{ fontSize: 14, fontWeight: 700, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{running?.name ?? 'Project'}</span>
        <span className="num muted" style={{ fontSize: 14 }}>{fmtClock(now - timer.startedAt)}</span>
        <button className="pill accent" onClick={stopTimer}>Stop</button>
      </div>
    );
  }
  if (focus) {
    return (
      <button className="pill" onClick={() => startTimer(focus.id)} aria-label={`Start the timer on ${focus.name}`}>
        <Icon name="play" size={12} />
        <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{focus.name}</span>
      </button>
    );
  }
  return <button className="pill ghost" onClick={() => go('projects')}>Add a project</button>;
}

export default function Nav() {
  const screen = useStore((s) => s.screen);
  const go = useStore((s) => s.go);
  const theme = useStore((s) => s.data.settings.theme);
  return (
    <nav className="glass nav" aria-label="Main">
      <button className="row" onClick={() => go('today')} style={{ border: 0, background: 'transparent', padding: 0, gap: 10 }} aria-label="Steady, go to Today">
        <Logo />
        <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>Steady</span>
      </button>
      <div className="links">
        {LINKS.map((l) => (
          <button key={l.screen} aria-current={screen === l.screen ? 'page' : undefined} onClick={() => go(l.screen)}>{l.label}</button>
        ))}
      </div>
      <Search />
      <div className="row" style={{ marginLeft: 'auto', gap: 8 }}>
        <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
        </button>
        <button className="icon-btn" onClick={() => go('settings')} aria-label="Settings" aria-current={screen === 'settings' ? 'page' : undefined}>
          <Icon name="gear" size={18} />
        </button>
        <TimerPill />
      </div>
    </nav>
  );
}
