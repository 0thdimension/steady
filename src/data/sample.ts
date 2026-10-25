import type { Data, ExerciseLog, Entry, TimeEntry, Todo, Project } from './types';
import { addDays, range, weekday } from './dates';
import { seedData, stamp } from './seed';

// Six weeks of made-up history for trying the app out (open the app with ?demo).

let seedN = 7;
const rnd = () => {
  seedN = (seedN * 16807) % 2147483647;
  return (seedN - 1) / 2147483646;
};

export const sampleData = (today: string): Data => {
  seedN = 7;
  const data = seedData(today);
  const start = addDays(today, -41);
  data.goals.forEach((g) => { g.startDate = start; });
  const entries: Entry[] = [];
  const time: TimeEntry[] = [];
  const exLogs: ExerciseLog[] = [];
  const projects: Project[] = [
    { ...stamp(), name: 'Example project', next: 'Sample next step', color: 'blue', order: 0, archived: false },
    { ...stamp(), name: 'Second example', next: '', color: 'sky', order: 1, archived: false },
    { ...stamp(), name: 'Third example', next: '', color: 'lilac', order: 2, archived: false },
  ];
  data.projects = projects;
  data.settings.focusProjectId = projects[0].id;
  const days = range(start, addDays(today, -1));
  for (const d of days) {
    const wd = weekday(d);
    for (const g of data.goals) {
      if (g.link !== 'none') continue;
      const chance = g.name === 'Read' ? 0.68 : g.name === 'Bed by 11' ? 0.74 : 0.88;
      let value = 0;
      if (rnd() < chance) value = g.kind === 'check' ? 1 : g.target;
      else if (g.kind === 'amount' && rnd() < 0.5) value = Math.max(g.step, Math.round((g.target * 0.6) / g.step) * g.step);
      if (value) entries.push({ ...stamp(), goalId: g.id, date: d, value, skipped: false });
    }
    if (rnd() < (wd >= 5 ? 0.25 : 0.9)) {
      const mins = Math.round((90 + rnd() * 150) / 5) * 5;
      const p = projects[rnd() < 0.6 ? 0 : rnd() < 0.6 ? 1 : 2];
      time.push({ ...stamp(), projectId: p.id, date: d, minutes: mins, source: 'manual' });
    }
    if ([0, 2, 4, 5].includes(wd) && rnd() < 0.85) {
      const i = days.indexOf(d);
      const step = Math.floor(i / 10);
      exLogs.push(
        { ...stamp(), exerciseId: data.exercises[0].id, date: d, sets: 3, reps: 10, weight: 25 + step * 5, seconds: null, order: 0 },
        { ...stamp(), exerciseId: data.exercises[2].id, date: d, sets: 3, reps: 10 + step, weight: null, seconds: null, order: 1 },
        { ...stamp(), exerciseId: data.exercises[3].id, date: d, sets: 3, reps: null, weight: null, seconds: 30 + step * 5, order: 2 },
      );
      if (wd === 5) exLogs.push({ ...stamp(), exerciseId: data.exercises[4].id, date: d, sets: 1, reps: null, weight: null, seconds: Math.round(1500 - i * 6), order: 3 });
    }
  }
  const t = (text: string, box: 0 | 1 | 2 | 3, due: string | null, order: number): Todo => ({ ...stamp(), text, box, due, done: false, doneAt: null, order });
  data.todos = [
    t('Send Monday sub plans #school', 0, addDays(today, 1), 0),
    t('Pay electric bill #home', 0, addDays(today, 2), 1),
    t('Renew car registration #car', 0, addDays(today, 3), 2),
    t('Book dentist cleaning #health', 1, null, 0),
    t("Plan next week's workouts #fitness", 1, null, 1),
    t('Outline the next chapter #writing', 1, null, 2),
    t('Back up laptop to the external drive #home', 1, null, 3),
    t('Return the Amazon package #errands', 2, addDays(today, 2), 0),
    t('Reply to the HOA email #home', 2, null, 1),
    t('Look into a standing desk #home', 3, null, 0),
    t('Order new running shoes #fitness', 3, null, 1),
    t('Try the new pasta recipe', 3, null, 2),
  ];
  data.journal = [
    { ...stamp(), date: addDays(today, -1), gratitude: ['A long walk after work', 'A call with a friend', 'Finished a hard task'], text: 'Slow start, but the afternoon went well. Noticed I was rushing again and took a breath before replying to that email.' },
    { ...stamp(), date: addDays(today, -2), gratitude: ['Good coffee', 'Quiet morning'], text: '' },
    { ...stamp(), date: addDays(today, -4), gratitude: ['Sunlight in the kitchen'], text: 'Tired today. Let myself skip reading without beating myself up about it.' },
  ];
  data.entries = entries;
  data.time = time;
  data.exLogs = exLogs;
  return data;
};
