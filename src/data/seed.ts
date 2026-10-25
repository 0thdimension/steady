import type { Data, Exercise, Goal, JournalDay, PaletteKey, Settings } from './types';

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

export const stamp = () => {
  const t = Date.now();
  return { id: uid(), createdAt: t, updatedAt: t };
};

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

export const defaultSettings = (): Settings => ({
  theme: 'dark',
  focusProjectId: null,
  timer: null,
  background: false,
  blur: true,
  panelOpacity: null,
  selfNote: '',
  noteReadOn: null,
  migrated: 1,
  weightUnit: 'lb',
  showQuote: true,
  updatedAt: Date.now(),
});

export const newGoal = (over: Partial<Goal>, order: number, today: string): Goal => ({
  ...stamp(),
  name: 'New goal',
  color: 'sky',
  kind: 'check',
  target: 1,
  unit: '',
  step: 1,
  days: [...EVERY_DAY],
  allowance: { per: 'week', count: 0 },
  link: 'none',
  note: '',
  order,
  archived: false,
  startDate: today,
  ...over,
});

export const newExercise = (name: string, order: number, lowerIsBetter = false): Exercise => ({
  ...stamp(), name, color: 'sky', lowerIsBetter, order, archived: false,
});

/** First run: a few example goals, ready to edit or delete. */
export const seedData = (today: string): Data => {
  const goals: Goal[] = [
    newGoal({ name: 'Work', color: 'blue', kind: 'amount', target: 3, unit: 'h', step: 0.5, allowance: { per: 'week', count: 2 }, link: 'workHours' }, 0, today),
    newGoal({ name: 'Brush teeth', color: 'sky', kind: 'amount', target: 2, unit: 'times', step: 1, note: 'Morning and night', allowance: { per: 'week', count: 2 } }, 1, today),
    newGoal({ name: 'Exercise', color: 'green', kind: 'check', days: [0, 2, 4, 5], note: 'Any logged workout', allowance: { per: 'month', count: 2 }, link: 'workout' }, 2, today),
    newGoal({ name: 'Water', color: 'teal', kind: 'amount', target: 8, unit: 'cups', step: 1, allowance: { per: 'none', count: 0 } }, 3, today),
    newGoal({ name: 'Read', color: 'gold', kind: 'amount', target: 20, unit: 'min', step: 5, allowance: { per: 'week', count: 3 } }, 4, today),
    newGoal({ name: 'Meditate', color: 'lilac', kind: 'amount', target: 10, unit: 'min', step: 5, allowance: { per: 'month', count: 4 } }, 5, today),
    newGoal({ name: 'Bed by 11', color: 'pink', kind: 'check', note: 'Lights out by 11 pm', allowance: { per: 'week', count: 2 } }, 6, today),
  ];
  const exercises: Exercise[] = [
    { ...newExercise('Goblet squat', 0), color: 'blue' },
    { ...newExercise('Dumbbell row', 1), color: 'sky' },
    { ...newExercise('Push-up', 2), color: 'green' },
    { ...newExercise('Plank', 3), color: 'gold' },
    { ...newExercise('Run', 4, true), color: 'lilac' },
  ];
  return { version: 1, goals, entries: [], projects: [], time: [], exercises, exLogs: [], todos: [], journal: [], settings: defaultSettings() };
};

const arr = <T,>(x: unknown): T[] => (Array.isArray(x) ? (x as T[]) : []);

/** Accepts a loaded file and fills in anything missing, so older or hand-edited files still open. */
export const normalize = (raw: unknown, today: string): Data => {
  if (!raw || typeof raw !== 'object') return seedData(today);
  const r = raw as Partial<Data>;
  const s = (r.settings ?? {}) as Partial<Settings>;
  const def = defaultSettings();
  const data: Data = {
    version: 1,
    goals: arr<Goal>(r.goals).map((g) => newGoal(g, g.order ?? 0, today)),
    entries: arr(r.entries),
    projects: arr(r.projects),
    time: arr(r.time),
    exercises: arr(r.exercises),
    exLogs: arr(r.exLogs),
    todos: arr(r.todos),
    journal: arr<JournalDay>(r.journal).map((j) => ({ ...j, gratitude: Array.isArray(j.gratitude) ? j.gratitude : [], text: j.text ?? '' })),
    settings: { ...def, migrated: 0, ...s },
  };
  return migrate(data);
};

/** One-time fixes for files saved by earlier versions. */
const migrate = (d: Data): Data => {
  if (d.settings.migrated < 1) {
    // Orange left the defaults: anything that was coral becomes periwinkle (coral is still pickable).
    const now = Date.now();
    const recolor = <T extends { color: PaletteKey; updatedAt: number }>(x: T): T => (x.color === 'coral' ? { ...x, color: 'blue', updatedAt: now } : x);
    d = { ...d, goals: d.goals.map(recolor), exercises: d.exercises.map(recolor), projects: d.projects.map(recolor), settings: { ...d.settings, migrated: 1, updatedAt: now } };
  }
  return d;
};
