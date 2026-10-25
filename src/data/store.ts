import { useMemo } from 'react';
import { create } from 'zustand';
import type { Box, Data, Exercise, ExerciseLog, Goal, ID, Project, Screen, Settings, TimeEntry, Todo } from './types';
import { normalize, newExercise, newGoal, seedData, stamp } from './seed';
import { entryKey, live, makeCtx } from './logic';
import { todayKey, toKey } from './dates';
import * as storage from './storage';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

interface Store {
  data: Data;
  ready: boolean;
  loadError: string | null;
  saveState: SaveState;
  screen: Screen;
  viewDate: string;
  /** The day open on the Journal screen. */
  journalDate: string;
  today: string;
  now: number;
  bgUrl: string | null;
  /** Demo mode (?demo): sample data, never saved. */
  demo: boolean;
  init: () => Promise<void>;
  go: (s: Screen) => void;
  setViewDate: (d: string) => void;
  openJournal: (d: string) => void;
  tick: () => void;
  replaceData: (d: Data) => void;
}

const empty = seedData(todayKey());

export const useStore = create<Store>((set, get) => ({
  data: empty,
  ready: false,
  loadError: null,
  saveState: 'idle',
  screen: 'today',
  viewDate: todayKey(),
  journalDate: todayKey(),
  today: todayKey(),
  now: Date.now(),
  bgUrl: null,
  demo: false,
  init: async () => {
    const today = todayKey();
    let data: Data;
    let loadError: string | null = null;
    try {
      const raw = await storage.loadRaw();
      data = raw ? normalize(JSON.parse(raw), today) : seedData(today);
    } catch (e) {
      loadError = String(e);
      data = seedData(today);
    }
    // ?demo shows six weeks of sample data without saving it (also &theme=light and &screen=todos).
    const params = new URLSearchParams(location.search);
    const demo = params.has('demo');
    let screen: Screen = 'today';
    if (demo) {
      const { sampleData } = await import('./sample');
      data = sampleData(today);
      const theme = params.get('theme');
      if (theme === 'light' || theme === 'dark') data.settings.theme = theme;
      const sc = params.get('screen') as Screen | null;
      if (sc && ['today', 'todos', 'progress', 'exercise', 'projects', 'journal', 'settings'].includes(sc)) screen = sc;
    }
    let bgUrl: string | null = null;
    if (data.settings.background) {
      try { bgUrl = await storage.loadBackground(); } catch { bgUrl = null; }
    }
    set({ data, ready: true, loadError, today, viewDate: today, journalDate: today, bgUrl, now: Date.now(), demo, screen });
  },
  go: (screen) => set({ screen }),
  setViewDate: (viewDate) => set({ viewDate }),
  openJournal: (journalDate) => set({ journalDate, screen: 'journal' }),
  tick: () => {
    const today = todayKey();
    const s = get();
    set(today !== s.today
      ? { now: Date.now(), today, viewDate: s.viewDate === s.today ? today : s.viewDate, journalDate: s.journalDate === s.today ? today : s.journalDate }
      : { now: Date.now() });
  },
  replaceData: (data) => set({ data }),
}));

// ---------------------------------------------------------------- saving

let saveTimer: number | undefined;
let lastSaved = '';

const flush = async (force = false) => {
  const { data, ready, demo } = useStore.getState();
  if (!ready || demo) return;
  const json = JSON.stringify(data);
  if (!force && json === lastSaved) return;
  useStore.setState({ saveState: 'saving' });
  try {
    await storage.saveRaw(json);
    lastSaved = json;
    useStore.setState({ saveState: 'saved' });
  } catch (e) {
    console.error('save failed', e);
    useStore.setState({ saveState: 'error' });
  }
};

useStore.subscribe((s, prev) => {
  if (!s.ready) return;
  if (!prev.ready) { lastSaved = JSON.stringify(s.data); return; }
  if (s.data === prev.data) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(flush, 400);
});

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => { void flush(); });
  window.addEventListener('pagehide', () => { void flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flush(); });
}

export const flushNow = () => flush();

// ---------------------------------------------------------------- hooks

/** Shared derived numbers. Recomputed once a minute while a timer runs, not every second. */
export const useCtx = () => {
  const data = useStore((s) => s.data);
  const today = useStore((s) => s.today);
  const minute = useStore((s) => Math.floor(s.now / 60000));
  return useMemo(() => makeCtx(data, today, minute * 60000 + 59999), [data, today, minute]);
};

export const useTheme = () => useStore((s) => s.data.settings.theme);

// ---------------------------------------------------------------- actions

const mutate = (fn: (d: Data) => Data) => useStore.setState((s) => ({ data: fn(s.data) }));
const touch = <T extends object>(x: T, patch: Partial<T>): T => ({ ...x, ...patch, updatedAt: Date.now() });
const patchById = <T extends { id: ID }>(list: T[], id: ID, patch: Partial<T>) =>
  list.map((x) => (x.id === id ? touch(x, patch) : x));
const nextOrder = (list: Array<{ order: number; deleted?: boolean }>) =>
  list.reduce((m, x) => (x.deleted ? m : Math.max(m, x.order)), -1) + 1;

// Goals
export const addGoal = (over: Partial<Goal> = {}) => {
  let id = '';
  mutate((d) => {
    const g = newGoal(over, nextOrder(d.goals), useStore.getState().today);
    id = g.id;
    return { ...d, goals: [...d.goals, g] };
  });
  return id;
};
export const updateGoal = (id: ID, patch: Partial<Goal>) => mutate((d) => ({ ...d, goals: patchById(d.goals, id, patch) }));
export const deleteGoal = (id: ID) => updateGoal(id, { deleted: true });
export const moveGoal = (id: ID, dir: -1 | 1) =>
  mutate((d) => {
    const list = live(d.goals).sort((a, b) => a.order - b.order);
    const i = list.findIndex((g) => g.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return d;
    const a = list[i], b = list[j];
    return { ...d, goals: d.goals.map((g) => (g.id === a.id ? touch(g, { order: b.order }) : g.id === b.id ? touch(g, { order: a.order }) : g)) };
  });

// Day entries
const upsertEntry = (goalId: ID, date: string, fn: (value: number, skipped: boolean) => { value: number; skipped: boolean }) =>
  mutate((d) => {
    const i = d.entries.findIndex((e) => !e.deleted && e.goalId === goalId && e.date === date);
    if (i >= 0) {
      const e = d.entries[i];
      const next = fn(e.value, e.skipped);
      const entries = d.entries.slice();
      entries[i] = touch(e, next);
      return { ...d, entries };
    }
    const next = fn(0, false);
    return { ...d, entries: [...d.entries, { ...stamp(), goalId, date, ...next }] };
  });

export const setValue = (goalId: ID, date: string, value: number) =>
  upsertEntry(goalId, date, () => ({ value: Math.max(0, Math.round(value * 100) / 100), skipped: false }));
export const bump = (goalId: ID, date: string, delta: number) =>
  upsertEntry(goalId, date, (v) => ({ value: Math.max(0, Math.round((v + delta) * 100) / 100), skipped: false }));
export const toggleCheck = (goalId: ID, date: string) =>
  upsertEntry(goalId, date, (v) => ({ value: v >= 1 ? 0 : 1, skipped: false }));
export const setSkipped = (goalId: ID, date: string, skipped: boolean) =>
  upsertEntry(goalId, date, (v) => ({ value: skipped ? 0 : v, skipped }));
export const storedValue = (goalId: ID, date: string) =>
  useStore.getState().data.entries.find((e) => !e.deleted && e.goalId === goalId && e.date === date)?.value ?? 0;
export { entryKey };

// Projects and hours
export const addProject = (name: string, over: Partial<Project> = {}) => {
  let id = '';
  mutate((d) => {
    const p: Project = { ...stamp(), name, next: '', color: 'sky', order: nextOrder(d.projects), archived: false, ...over };
    id = p.id;
    const settings = d.settings.focusProjectId ? d.settings : { ...d.settings, focusProjectId: p.id, updatedAt: Date.now() };
    return { ...d, projects: [...d.projects, p], settings };
  });
  return id;
};
export const updateProject = (id: ID, patch: Partial<Project>) => mutate((d) => ({ ...d, projects: patchById(d.projects, id, patch) }));
export const deleteProject = (id: ID) =>
  mutate((d) => ({
    ...d,
    projects: patchById(d.projects, id, { deleted: true }),
    settings: d.settings.focusProjectId === id ? { ...d.settings, focusProjectId: null, updatedAt: Date.now() } : d.settings,
  }));

export const setSettings = (patch: Partial<Settings>) =>
  mutate((d) => ({ ...d, settings: { ...d.settings, ...patch, updatedAt: Date.now() } }));
export const setFocus = (id: ID | null) => setSettings({ focusProjectId: id });

export const startTimer = (projectId?: ID) => {
  const s = useStore.getState().data.settings;
  const pid = projectId ?? s.focusProjectId;
  if (!pid) return;
  if (s.timer) stopTimer();
  setSettings({ timer: { projectId: pid, startedAt: Date.now() } });
  useStore.setState({ now: Date.now() });
};
export const stopTimer = () => {
  const t = useStore.getState().data.settings.timer;
  if (!t) return;
  const end = Date.now();
  const minutes = Math.round(((end - t.startedAt) / 60000) * 10) / 10;
  mutate((d) => ({
    ...d,
    time: minutes >= 0.5
      ? [...d.time, { ...stamp(), projectId: t.projectId, date: toKey(new Date(t.startedAt)), minutes, source: 'timer', start: t.startedAt, end }]
      : d.time,
    settings: { ...d.settings, timer: null, updatedAt: Date.now() },
  }));
};
export const addHours = (projectId: ID, date: string, minutes: number, note = '') =>
  mutate((d) => ({ ...d, time: [...d.time, { ...stamp(), projectId, date, minutes, source: 'manual', note }] }));
export const updateTime = (id: ID, patch: Partial<TimeEntry>) => mutate((d) => ({ ...d, time: patchById(d.time, id, patch) }));
export const deleteTime = (id: ID) => updateTime(id, { deleted: true });

// Exercise
export const addExercise = (name: string, lowerIsBetter = false) => {
  let id = '';
  mutate((d) => {
    const e = newExercise(name, nextOrder(d.exercises), lowerIsBetter);
    id = e.id;
    return { ...d, exercises: [...d.exercises, e] };
  });
  return id;
};
export const updateExercise = (id: ID, patch: Partial<Exercise>) => mutate((d) => ({ ...d, exercises: patchById(d.exercises, id, patch) }));
export const deleteExercise = (id: ID) => updateExercise(id, { deleted: true });

export const addLog = (date: string, exerciseId: ID, from?: Partial<ExerciseLog>) => {
  let id = '';
  mutate((d) => {
    const sameDay = d.exLogs.filter((l) => l.date === date);
    const l: ExerciseLog = { ...stamp(), exerciseId, date, sets: 3, reps: null, weight: null, seconds: null, order: nextOrder(sameDay), ...from };
    id = l.id;
    return { ...d, exLogs: [...d.exLogs, l] };
  });
  return id;
};
export const updateLog = (id: ID, patch: Partial<ExerciseLog>) => mutate((d) => ({ ...d, exLogs: patchById(d.exLogs, id, patch) }));
export const deleteLog = (id: ID) => updateLog(id, { deleted: true });

// Todos
export const addTodo = (text: string, box: Box, due: string | null) =>
  mutate((d) => {
    const t: Todo = { ...stamp(), text: text.trim(), box, due, done: false, doneAt: null, order: nextOrder(d.todos.filter((x) => x.box === box)) };
    return { ...d, todos: [...d.todos, t] };
  });
export const updateTodo = (id: ID, patch: Partial<Todo>) => mutate((d) => ({ ...d, todos: patchById(d.todos, id, patch) }));
export const toggleTodo = (id: ID) =>
  mutate((d) => ({
    ...d,
    todos: d.todos.map((t) => (t.id === id ? touch(t, { done: !t.done, doneAt: t.done ? null : Date.now() }) : t)),
  }));
export const deleteTodo = (id: ID) => updateTodo(id, { deleted: true });
export const moveTodo = (id: ID, box: Box) =>
  mutate((d) => ({ ...d, todos: patchById(d.todos, id, { box, order: nextOrder(d.todos.filter((x) => x.box === box)) }) }));

// Journal: one page per day, holding a gratitude list and free writing
export const journalFor = (date: string) =>
  useStore.getState().data.journal.find((j) => !j.deleted && j.date === date) ?? null;

export const setJournal = (date: string, patch: { gratitude?: string[]; text?: string }) =>
  mutate((d) => {
    const i = d.journal.findIndex((j) => !j.deleted && j.date === date);
    if (i >= 0) {
      const journal = d.journal.slice();
      journal[i] = touch(journal[i], patch);
      return { ...d, journal };
    }
    return { ...d, journal: [...d.journal, { ...stamp(), date, gratitude: patch.gratitude ?? [], text: patch.text ?? '' }] };
  });

// Theme and background
export const toggleTheme = () => {
  const t = useStore.getState().data.settings.theme;
  setSettings({ theme: t === 'dark' ? 'light' : 'dark' });
};

export const pickBackground = async () => {
  const url = await storage.chooseBackground();
  if (!url) return;
  useStore.setState({ bgUrl: url });
  setSettings({ background: true });
};
export const removeBackground = async () => {
  await storage.clearBackground();
  useStore.setState({ bgUrl: null });
  setSettings({ background: false });
};

// Whole-file actions
export const exportAll = async () => {
  await flush();
  const json = JSON.stringify(useStore.getState().data, null, 2);
  return storage.exportJson(json, `steady-backup-${todayKey()}.json`);
};
export const importAll = async () => {
  const text = await storage.importJson();
  if (!text) return false;
  const data = normalize(JSON.parse(text), useStore.getState().today);
  useStore.getState().replaceData(data);
  return true;
};
