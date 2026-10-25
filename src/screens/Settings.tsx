import { useEffect, useMemo, useState } from 'react';
import {
  deleteGoal, exportAll, importAll, moveGoal, pickBackground, removeBackground, setSettings, updateGoal, useStore,
} from '../data/store';
import { live } from '../data/logic';
import { dataFolder, isDesktop, openDataFolder } from '../data/storage';
import type { Goal } from '../data/types';
import GoalEditor, { goalSummary } from '../components/GoalEditor';
import { Empty, Icon, Modal, Panel, Seg, useColor } from '../components/ui';
import { ConfirmDelete } from './Projects';


function GoalsSection() {
  const goals = useStore((s) => s.data.goals);
  const color = useColor();
  const [editing, setEditing] = useState<Goal | 'new' | null>(null);
  const list = useMemo(() => live(goals).sort((a, b) => a.order - b.order), [goals]);
  const active = list.filter((g) => !g.archived);
  const archived = list.filter((g) => g.archived);

  return (
    <Panel
      title="Goals"
      labelledBy="set-goals"
      id="settings-goals"
      actions={<button className="pill accent small" onClick={() => setEditing('new')}><Icon name="plus" /> New goal</button>}
    >
      {active.length === 0 && <Empty>No goals yet. Add one to start tracking.</Empty>}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {active.map((g, i) => (
          <div key={g.id} className="list-row" style={{ flexWrap: 'wrap', gap: 6, padding: '6px 0' }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: color(g.color), margin: '0 6px 0 4px', flex: 'none' }} />
            <div style={{ flex: '1 1 220px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 800 }}>{g.name}</span>
              <span className="muted" style={{ fontSize: 13 }}>{goalSummary(g)}</span>
            </div>
            <button className="icon-btn bare" aria-label={`Move ${g.name} up`} disabled={i === 0} onClick={() => moveGoal(g.id, -1)} style={i === 0 ? { opacity: 0.35 } : undefined}><Icon name="up" /></button>
            <button className="icon-btn bare" aria-label={`Move ${g.name} down`} disabled={i === active.length - 1} onClick={() => moveGoal(g.id, 1)} style={i === active.length - 1 ? { opacity: 0.35 } : undefined}><Icon name="down" /></button>
            <button className="pill small" onClick={() => setEditing(g)}><Icon name="edit" size={13} /> Edit</button>
            <button className="pill small ghost" onClick={() => updateGoal(g.id, { archived: true })}>Archive</button>
            <ConfirmDelete what={`${g.name} and its history`} onConfirm={() => deleteGoal(g.id)} />
          </div>
        ))}
      </div>
      {archived.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="caps" style={{ marginTop: 6 }}>Archived</span>
          {archived.map((g) => (
            <div key={g.id} className="list-row" style={{ gap: 6 }}>
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: color(g.color), margin: '0 6px 0 4px' }} />
              <span className="muted" style={{ flex: 1, minWidth: 0, fontWeight: 700 }}>{g.name}</span>
              <button className="pill small" onClick={() => updateGoal(g.id, { archived: false })}>Unarchive</button>
              <ConfirmDelete what={`${g.name} and its history`} onConfirm={() => deleteGoal(g.id)} />
            </div>
          ))}
          <span className="faint" style={{ fontSize: 12 }}>Archived goals keep their history but leave Today and your charts.</span>
        </div>
      )}
      {editing && <GoalEditor goal={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Panel>
  );
}

function ToggleRow({ label, help, on, onChange }: { label: string; help?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="between">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: '1 1 200px' }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        {help && <span className="muted" style={{ fontSize: 13 }}>{help}</span>}
      </div>
      <button
        className="pill small"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        style={{ minWidth: 76, ...(on ? { background: 'var(--accent)', color: 'var(--on-accent)' } : {}) }}
      >
        {on ? 'On' : 'Off'}
      </button>
    </div>
  );
}

function AppearanceSection() {
  const settings = useStore((s) => s.data.settings);
  const bgUrl = useStore((s) => s.bgUrl);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const choose = async () => {
    setBusy(true);
    setMsg('');
    try { await pickBackground(); } catch (e) { setMsg("That photo couldn't be used. Try a JPG or PNG."); console.error(e); }
    setBusy(false);
  };

  return (
    <Panel title="Appearance" id="settings-look" labelledBy="set-look">
      <div className="between">
        <span style={{ fontWeight: 700 }}>Theme</span>
        <Seg label="Theme" value={settings.theme} onChange={(theme) => setSettings({ theme })} options={[{ value: 'dark', label: 'Dark' }, { value: 'light', label: 'Light' }]} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontWeight: 700 }}>Background photo</span>
          <span className="muted" style={{ fontSize: 13 }}>Use one of your own photos behind the glass. It's copied into Steady's folder and stays on this PC.</span>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 12 }}>
          {bgUrl ? (
            <img src={bgUrl} alt="Your background photo" style={{ width: 160, height: 90, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--line)' }} />
          ) : (
            <div className="tile" aria-hidden="true" style={{ width: 160, height: 90, display: 'grid', placeItems: 'center', fontSize: 12 }}><span className="faint">Soft room light</span></div>
          )}
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <button className="pill" onClick={choose} disabled={busy}>{bgUrl ? 'Choose another' : 'Choose photo'}</button>
            {bgUrl && <button className="pill ghost" onClick={() => void removeBackground()}>Remove</button>}
          </div>
        </div>
        {msg && <span role="alert" style={{ color: 'var(--warn-text)', fontWeight: 700, fontSize: 13 }}>{msg}</span>}
      </div>
      <ToggleRow
        label="Glass blur"
        help="The frosted look behind panels. Turning it off is easier on slower computers."
        on={settings.blur}
        onChange={(blur) => setSettings({ blur })}
      />
      <ToggleRow
        label="Daily quote"
        help="A short line from Zen and other non-dual Buddhist writing on the Today screen."
        on={settings.showQuote}
        onChange={(showQuote) => setSettings({ showQuote })}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="between">
          <label htmlFor="panel-opacity" style={{ fontWeight: 700 }}>Panel opacity</label>
          <span className="num muted" style={{ fontWeight: 700 }}>{Math.round((settings.panelOpacity ?? 0.62) * 100)}%</span>
        </div>
        <input
          id="panel-opacity"
          type="range"
          min={20}
          max={100}
          step={1}
          value={Math.round((settings.panelOpacity ?? 0.62) * 100)}
          onChange={(e) => setSettings({ panelOpacity: Number(e.target.value) / 100 })}
          style={{ width: '100%', accentColor: 'var(--accent)', minHeight: 28 }}
        />
        <div className="between">
          <span className="muted" style={{ fontSize: 13 }}>Lower lets more of the background show through.</span>
          {settings.panelOpacity != null && <button className="pill small ghost" onClick={() => setSettings({ panelOpacity: null })}>Reset</button>}
        </div>
      </div>
      <div className="between">
        <span style={{ fontWeight: 700 }}>Weight unit</span>
        <Seg label="Weight unit" value={settings.weightUnit} onChange={(weightUnit) => setSettings({ weightUnit })} options={[{ value: 'lb', label: 'lb' }, { value: 'kg', label: 'kg' }]} />
      </div>
    </Panel>
  );
}

function DataSection() {
  const [folder, setFolder] = useState('');
  const [msg, setMsg] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);
  useEffect(() => { void dataFolder().then(setFolder).catch(() => setFolder('')); }, []);

  const doExport = async () => {
    setMsg('');
    try {
      const where = await exportAll();
      setMsg(typeof where === 'string' ? `Backup saved to ${where}` : where ? 'Backup saved.' : '');
    } catch (e) { setMsg("The backup couldn't be saved."); console.error(e); }
  };
  const doImport = async () => {
    setConfirmImport(false);
    setMsg('');
    try { setMsg((await importAll()) ? 'Backup loaded. Everything now matches that file.' : ''); } catch (e) { setMsg("That file couldn't be read as a Steady backup."); console.error(e); }
  };

  return (
    <Panel title="Data" id="settings-data" labelledBy="set-data">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontWeight: 700 }}>Saved at</span>
        <code className="tile" style={{ padding: '10px 12px', fontSize: 12.5, wordBreak: 'break-all', fontFamily: 'Consolas, ui-monospace, monospace' }}>{folder || 'Loading…'}</code>
        <span className="muted" style={{ fontSize: 13 }}>Steady saves as you go and keeps a backup copy of each day for 30 days in that folder. Nothing is sent anywhere.</span>
      </div>
      <div className="row" style={{ flexWrap: 'wrap' }}>
        {isDesktop() && <button className="pill" onClick={() => void openDataFolder()}><Icon name="folder" /> Open folder</button>}
        <button className="pill" onClick={() => void doExport()}>Export a backup</button>
        <button className="pill ghost" onClick={() => setConfirmImport(true)}>Import a backup</button>
      </div>
      {msg && <span role="status" style={{ fontWeight: 700, fontSize: 13 }}>{msg}</span>}
      {confirmImport && (
        <Modal
          title="Replace everything?"
          onClose={() => setConfirmImport(false)}
          footer={
            <>
              <button className="pill ghost" onClick={() => setConfirmImport(false)}>Cancel</button>
              <button className="pill accent" onClick={() => void doImport()}>Choose a file</button>
            </>
          }
        >
          <p className="body" style={{ margin: 0, lineHeight: 1.5 }}>
            Importing replaces all your goals, history, todos, projects and workouts with what's in the backup file. Today's automatic backup still has your current data if you change your mind.
          </p>
        </Modal>
      )}
    </Panel>
  );
}

export default function SettingsScreen() {
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return (
    <div className="stack">
      <div className="glass panel" style={{ padding: '18px 24px' }}>
        <div className="between">
          <h1 className="h1">Settings</h1>
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }} role="navigation" aria-label="Settings sections">
            <button className="pill small ghost" onClick={() => jump('settings-goals')}>Goals</button>
            <button className="pill small ghost" onClick={() => jump('settings-look')}>Appearance</button>
            <button className="pill small ghost" onClick={() => jump('settings-data')}>Data</button>
          </div>
        </div>
      </div>
      <div className="cols">
        <div className="stack" style={{ flex: '3 1 560px' }}>
          <GoalsSection />
        </div>
        <div className="stack" style={{ flex: '2 1 380px' }}>
          <AppearanceSection />
          <DataSection />
          <Panel title="About">
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>Steady keeps everything on this computer. Nothing is sent anywhere.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}
