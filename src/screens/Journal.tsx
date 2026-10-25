import { useMemo, useState } from 'react';
import { useStore } from '../data/store';
import { live } from '../data/logic';
import { addDays, fmtLong, fmtShort, monthStart } from '../data/dates';
import { Empty, Icon, Panel } from '../components/ui';
import { GratitudeEditor, JournalEditor, wordCount } from '../components/JournalParts';

export default function Journal() {
  const date = useStore((s) => s.journalDate);
  const today = useStore((s) => s.today);
  const openJournal = useStore((s) => s.openJournal);
  const all = useStore((s) => s.data.journal);
  const [q, setQ] = useState('');

  const pages = useMemo(
    () => live(all).filter((j) => j.text.trim() || j.gratitude.length).sort((a, b) => (a.date < b.date ? 1 : -1)),
    [all],
  );
  const monthPages = pages.filter((j) => j.date >= monthStart(today) && j.date <= today);
  const gratDays = monthPages.filter((j) => j.gratitude.length).length;
  const writeDays = monthPages.filter((j) => j.text.trim()).length;

  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return pages;
    return pages.filter((j) => j.text.toLowerCase().includes(s) || j.gratitude.some((g) => g.toLowerCase().includes(s)));
  }, [pages, q]);

  return (
    <div className="stack">
      <Panel labelledBy="journal-h">
        <div className="between">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="label">This month: gratitude on {gratDays} day{gratDays === 1 ? '' : 's'}, writing on {writeDays}</span>
            <div className="row" style={{ gap: 6 }}>
              <button className="icon-btn bare" onClick={() => openJournal(addDays(date, -1))} aria-label="Previous day"><Icon name="left" /></button>
              <h1 className="h1" id="journal-h">{date === today ? 'Today' : fmtLong(date)}</h1>
              <button className="icon-btn bare" onClick={() => openJournal(addDays(date, 1))} aria-label="Next day" disabled={date >= today}><Icon name="right" /></button>
              {date !== today && <button className="pill small" onClick={() => openJournal(today)}>Back to today</button>}
            </div>
          </div>
          {date === today && <span className="muted" style={{ fontSize: 14 }}>{fmtLong(today)}</span>}
        </div>
      </Panel>

      <div className="cols">
        <Panel title="Gratitude" labelledBy="grat-h" style={{ flex: '1 1 340px', maxWidth: 520 }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Three things you're grateful for. Small counts.</p>
          <GratitudeEditor key={date} date={date} />
        </Panel>
        <Panel title="Journal" labelledBy="journal-text-h" style={{ flex: '2 1 480px' }}>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>Write whatever is on your mind.</p>
          <JournalEditor key={date} date={date} />
        </Panel>
      </div>

      <Panel
        title="Past entries"
        labelledBy="past-h"
        actions={
          <label className="search-box" style={{ maxWidth: 280 }}>
            <Icon name="search" />
            <span className="sr-only">Search your journal</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your journal" />
          </label>
        }
      >
        {found.length === 0 ? (
          <Empty>{q.trim() ? `Nothing matches "${q.trim()}".` : 'Your past entries show up here.'}</Empty>
        ) : (
          <div>
            {found.slice(0, 120).map((j) => {
              const words = wordCount(j.text);
              return (
                <button
                  key={j.id}
                  className="list-row"
                  onClick={() => { openJournal(j.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  aria-current={j.date === date ? 'true' : undefined}
                  style={{ width: '100%', border: 0, borderTop: '1px solid var(--line)', background: j.date === date ? 'var(--tile)' : 'transparent', textAlign: 'left', padding: '10px 8px', alignItems: 'flex-start', gap: 14, borderRadius: 10 }}
                >
                  <span className="num" style={{ flex: 'none', width: 96, fontWeight: 800, fontSize: 14 }}>{j.date === today ? 'Today' : fmtShort(j.date)}</span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {j.gratitude.length > 0 && <span style={{ fontSize: 13, fontWeight: 700 }}>Grateful for {j.gratitude.join(', ')}</span>}
                    {j.text.trim() && <span className="muted" style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.text.trim().slice(0, 160)}</span>}
                  </span>
                  {words > 0 && <span className="faint num" style={{ flex: 'none', fontSize: 12 }}>{words} words</span>}
                </button>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
