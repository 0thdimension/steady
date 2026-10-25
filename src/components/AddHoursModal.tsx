import { useMemo, useState } from 'react';
import { addHours, addProject, useStore } from '../data/store';
import { live } from '../data/logic';
import { Modal } from './ui';

export default function AddHoursModal({ onClose, defaultProjectId, defaultDate }: {
  onClose: () => void; defaultProjectId?: string | null; defaultDate?: string;
}) {
  const allProjects = useStore((s) => s.data.projects);
  const focusId = useStore((s) => s.data.settings.focusProjectId);
  const today = useStore((s) => s.today);
  const projects = useMemo(() => live(allProjects).filter((p) => !p.archived).sort((a, b) => a.order - b.order), [allProjects]);

  const initial = [defaultProjectId, focusId].find((id) => id && projects.some((p) => p.id === id)) ?? projects[0]?.id ?? '';
  const [projectId, setProjectId] = useState(initial);
  const [newName, setNewName] = useState('');
  const [date, setDate] = useState(defaultDate ?? today);
  const [hours, setHours] = useState('');
  const [mins, setMins] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const save = () => {
    const h = hours.trim() ? Number(hours.trim().replace(',', '.')) : 0;
    const m = mins.trim() ? Number(mins.trim()) : 0;
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) { setError('Enter the time as hours and minutes, like 1 h 25 min.'); return; }
    const total = h * 60 + m;
    if (total <= 0) { setError('Enter how long you worked, like 1 h 25 min.'); return; }
    if (total > 24 * 60) { setError('That is more than a day. Check the numbers.'); return; }
    if (!date) { setError('Pick a date.'); return; }
    let pid = projectId;
    if (!projects.length) {
      if (!newName.trim()) { setError('Name the project these hours go to.'); return; }
      pid = addProject(newName.trim());
    }
    if (!pid) { setError('Pick a project.'); return; }
    addHours(pid, date, Math.round(total * 10) / 10, note.trim());
    onClose();
  };

  return (
    <Modal
      title="Add time"
      onClose={onClose}
      footer={
        <>
          <button className="pill ghost" onClick={onClose}>Cancel</button>
          <button className="pill accent" onClick={save}>Save time</button>
        </>
      }
    >
      <form className="form-grid" onSubmit={(e) => { e.preventDefault(); save(); }}>
        {projects.length > 0 ? (
          <label className="form-row">
            <span className="label">Project</span>
            <select className="field" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        ) : (
          <label className="form-row">
            <span className="label">New project name</span>
            <input className="field" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Like Website redesign" />
          </label>
        )}
        <div className="grid-auto" style={{ ['--min' as string]: '160px' }}>
          <label className="form-row">
            <span className="label">Date</span>
            <input className="field" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="form-row">
            <span className="label" id="time-label">Time worked</span>
            <div className="row" role="group" aria-labelledby="time-label" style={{ gap: 8 }}>
              <input className="field num" type="number" inputMode="numeric" min={0} max={24} step={1} aria-label="Hours" value={hours} onChange={(e) => { setHours(e.target.value); setError(''); }} placeholder="1" style={{ width: 80 }} />
              <span className="muted">h</span>
              <input className="field num" type="number" inputMode="numeric" min={0} max={59} step={1} aria-label="Minutes" value={mins} onChange={(e) => { setMins(e.target.value); setError(''); }} placeholder="25" style={{ width: 80 }} />
              <span className="muted">min</span>
            </div>
          </div>
        </div>
        <label className="form-row">
          <span className="label">Note (optional)</span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you worked on" />
        </label>
        {error && <p role="alert" style={{ margin: 0, color: 'var(--warn-text)', fontWeight: 700, fontSize: 14 }}>{error}</p>}
        <button type="submit" className="sr-only">Save time</button>
      </form>
    </Modal>
  );
}
