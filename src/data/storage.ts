// Two ways Steady can run:
//  - 'local': launcher/steady.pyw serves the app on 127.0.0.1 and keeps the data in a file
//  - 'browser': `npm run dev`, or the built files served any other way; localStorage stands in

type Mode = 'local' | 'browser';

declare global {
  interface Window { __STEADY__?: { token: string } }
}

export const mode = (): Mode => (typeof window !== 'undefined' && window.__STEADY__?.token ? 'local' : 'browser');

/** True when the data lives in a real file on this computer (not browser storage). */
export const isDesktop = () => mode() === 'local';

const LS_KEY = 'steady-data';
const LS_BG = 'steady-background';

async function api(path: string, init: RequestInit = {}): Promise<Response> {
  const r = await fetch('/api/' + path, {
    ...init,
    headers: { 'X-Steady-Token': window.__STEADY__!.token, ...(init.headers ?? {}) },
  });
  if (!r.ok) throw new Error((await r.text()) || `Request failed (${r.status})`);
  return r;
}

export async function loadRaw(): Promise<string | null> {
  if (mode() === 'local') {
    const r = await api('data');
    return r.status === 204 ? null : await r.text();
  }
  return localStorage.getItem(LS_KEY);
}

export async function saveRaw(json: string): Promise<void> {
  if (mode() === 'local') {
    // keepalive lets a small final save finish while the window closes.
    await api('data', { method: 'PUT', body: json, headers: { 'Content-Type': 'application/json' }, keepalive: json.length < 60000 });
  } else localStorage.setItem(LS_KEY, json);
}

/** Lets the launcher know the window is still open, so it can shut down after it closes. */
export function startHeartbeat() {
  if (mode() !== 'local') return;
  const beat = () => { void api('ping').catch(() => undefined); };
  beat();
  window.setInterval(beat, 20000);
}

export async function dataFolder(): Promise<string> {
  if (mode() === 'local') return (await (await api('folder')).json()).path as string;
  return 'Browser storage (this browser only)';
}

export async function openDataFolder(): Promise<void> {
  if (mode() === 'local') await api('open-folder', { method: 'POST' });
}

const pickFile = (accept: string) =>
  new Promise<File | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });

const readAsDataUrl = (f: File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(f);
  });

/** Returns a data URL for the saved background photo, or null. */
export async function loadBackground(): Promise<string | null> {
  if (mode() === 'local') {
    const r = await api('background');
    return r.status === 204 ? null : await r.text();
  }
  return localStorage.getItem(LS_BG);
}

/** Lets the person pick a photo; returns its data URL, or null if they cancel. */
export async function chooseBackground(): Promise<string | null> {
  const f = await pickFile('image/jpeg,image/png,image/webp');
  if (!f) return null;
  const url = await readAsDataUrl(f);
  if (mode() === 'local') await api('background', { method: 'PUT', body: url });
  else {
    try { localStorage.setItem(LS_BG, url); } catch { /* too big for browser storage; still show it */ }
  }
  return url;
}

export async function clearBackground(): Promise<void> {
  if (mode() === 'local') await api('background', { method: 'DELETE' });
  else localStorage.removeItem(LS_BG);
}

/** Saves a copy of all data. Returns where it went (or true), or false if cancelled. */
export async function exportJson(json: string, suggested: string): Promise<string | boolean> {
  if (mode() === 'local') {
    const r = await api('export', { method: 'POST', body: json, headers: { 'Content-Type': 'application/json' } });
    return ((await r.json()) as { path: string }).path;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = suggested;
  a.click();
  return true;
}

/** Reads a backup file the person picks. Returns its text, or null if they cancel. */
export async function importJson(): Promise<string | null> {
  const f = await pickFile('application/json,.json');
  return f ? await f.text() : null;
}
