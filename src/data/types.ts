// Every stored record carries an id and timestamps, and deletes are soft (deleted: true).

export type ID = string;

export type PaletteKey = 'blue' | 'sky' | 'green' | 'coral' | 'teal' | 'gold' | 'lilac' | 'pink';

export interface Base {
  id: ID;
  createdAt: number;
  updatedAt: number;
  deleted?: boolean;
}

export type AllowancePer = 'week' | 'month' | 'none';
export type GoalLink = 'none' | 'workHours' | 'workout';

export interface Goal extends Base {
  name: string;
  color: PaletteKey;
  kind: 'check' | 'amount';
  /** Amount goals: the daily target (e.g. 8). Check goals: always 1. */
  target: number;
  /** Amount goals: 'cups', 'min', 'h', 'times'. */
  unit: string;
  /** How much one tap of + adds. */
  step: number;
  /** Scheduled weekdays, 0 = Monday ... 6 = Sunday. */
  days: number[];
  allowance: { per: AllowancePer; count: number };
  /** Fill the goal automatically from logged work hours or any logged workout. */
  link: GoalLink;
  /** Short plan line shown under the name, e.g. "Lights out by 11 pm". */
  note: string;
  order: number;
  archived: boolean;
  /** Tracking starts on this day; earlier days never count as missed. */
  startDate: string;
}

export interface Entry extends Base {
  goalId: ID;
  date: string; // YYYY-MM-DD, local
  value: number;
  /** Marked "Skip today" on purpose. Unmarked misses also use the allowance once the day is over. */
  skipped: boolean;
}

export interface Project extends Base {
  name: string;
  next: string;
  color: PaletteKey;
  order: number;
  archived: boolean;
}

export interface TimeEntry extends Base {
  projectId: ID;
  date: string;
  minutes: number;
  source: 'timer' | 'manual';
  start?: number;
  end?: number;
  note?: string;
}

export interface Exercise extends Base {
  name: string;
  color: PaletteKey;
  /** For timed things like a run, a smaller time is the better result. */
  lowerIsBetter: boolean;
  order: number;
  archived: boolean;
}

export interface ExerciseLog extends Base {
  exerciseId: ID;
  date: string;
  sets: number;
  reps: number | null;
  weight: number | null;
  seconds: number | null;
  order: number;
}

export type Box = 0 | 1 | 2 | 3; // Urgent & important, Important, Urgent, Other

export interface Todo extends Base {
  text: string;
  box: Box;
  due: string | null;
  done: boolean;
  doneAt: number | null;
  order: number;
}

/** One day's gratitude list and journal writing. */
export interface JournalDay extends Base {
  date: string;
  gratitude: string[];
  text: string;
}

export interface Settings {
  theme: 'dark' | 'light';
  focusProjectId: ID | null;
  timer: { projectId: ID; startedAt: number } | null;
  /** A custom background photo is saved next to the data file. */
  background: boolean;
  /** Frosted-glass blur; off is easier on slow graphics chips. */
  blur: boolean;
  /** How see-through the panels are, 0.2 to 1. null = the theme's default. */
  panelOpacity: number | null;
  /** A personal note to read each day. */
  selfNote: string;
  /** Day the note was last opened, to show "Read today". */
  noteReadOn: string | null;
  /** One-time data fixes already applied (e.g. 1 = coral items moved to periwinkle). */
  migrated: number;
  weightUnit: 'lb' | 'kg';
  /** Show a daily quote on the Today screen. */
  showQuote: boolean;
  updatedAt: number;
}

export interface Data {
  version: 1;
  goals: Goal[];
  entries: Entry[];
  projects: Project[];
  time: TimeEntry[];
  exercises: Exercise[];
  exLogs: ExerciseLog[];
  todos: Todo[];
  journal: JournalDay[];
  settings: Settings;
}

export type Screen = 'today' | 'todos' | 'progress' | 'exercise' | 'projects' | 'journal' | 'settings';
