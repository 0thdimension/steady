import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { colorOf, rgba, tagColorKey } from '../data/palette';
import type { PaletteKey } from '../data/types';
import { useTheme } from '../data/store';

// ---------------------------------------------------------------- icons (stroke, follow currentColor)

const PATHS: Record<string, ReactNode> = {
  check: <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  plus: <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  minus: <path d="M3 8h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />,
  x: <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />,
  search: <><circle cx="7" cy="7" r="4.8" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M10.6 10.6L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  sun: <><circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 1.3v1.8M8 12.9v1.8M1.3 8h1.8M12.9 8h1.8M3.3 3.3l1.2 1.2M11.5 11.5l1.2 1.2M3.3 12.7l1.2-1.2M11.5 4.5l1.2-1.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></>,
  moon: <path d="M13.4 9.6A5.8 5.8 0 016.4 2.6a5.8 5.8 0 107 7z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  shuffle: <path d="M2 4.5h2.5c1.6 0 2.6.8 3.5 2.2l1 1.6c.9 1.4 1.9 2.2 3.5 2.2H14M12 8.5l2 2-2 2M2 11.5h2.5c.9 0 1.6-.3 2.2-.8M9.3 5.3c.6-.5 1.3-.8 2.2-.8H14M12 2.5l2 2-2 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  star: <path d="M8 1.8l1.9 3.9 4.2.6-3 3 .7 4.2L8 11.5l-3.8 2 .7-4.2-3-3 4.2-.6z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  starFilled: <path d="M8 1.8l1.9 3.9 4.2.6-3 3 .7 4.2L8 11.5l-3.8 2 .7-4.2-3-3 4.2-.6z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  eyeOff: <path d="M2 2l12 12M6.6 6.7a2 2 0 002.7 2.7M4.2 4.4C2.9 5.3 2 6.5 1.5 8c1.2 3 3.8 4.8 6.5 4.8 1.2 0 2.4-.4 3.4-1M7 3.3c.3 0 .7-.1 1-.1 2.7 0 5.3 1.8 6.5 4.8-.3.9-.8 1.7-1.4 2.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />,
  eye: <><path d="M1.5 8C2.7 5 5.3 3.2 8 3.2S13.3 5 14.5 8c-1.2 3-3.8 4.8-6.5 4.8S2.7 11 1.5 8z" fill="none" stroke="currentColor" strokeWidth="1.5" /><circle cx="8" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" /></>,
  calendar: <><rect x="2" y="3" width="12" height="11" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>,
  left: <path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  right: <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  down: <path d="M3.5 6L8 10.5 12.5 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  up: <path d="M3.5 10L8 5.5 12.5 10" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
  edit: <path d="M10.5 2.5l3 3L6 13H3v-3z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  gear: <><path d="M6.9 1.5h2.2l.4 1.8 1.2.5 1.6-1 1.5 1.5-1 1.6.5 1.2 1.8.4v2.2l-1.8.4-.5 1.2 1 1.6-1.5 1.5-1.6-1-1.2.5-.4 1.8H6.9l-.4-1.8-1.2-.5-1.6 1-1.5-1.5 1-1.6-.5-1.2-1.8-.4V6.9l1.8-.4.5-1.2-1-1.6 1.5-1.5 1.6 1 1.2-.5z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /><circle cx="8" cy="8" r="2.1" fill="none" stroke="currentColor" strokeWidth="1.3" /></>,
  play: <path d="M5 3.5v9l7-4.5z" fill="currentColor" />,
  stop: <rect x="4" y="4" width="8" height="8" rx="1.5" fill="currentColor" />,
  arrowUp: <path d="M4 12l8-8M5.5 4H12v6.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />,
  folder: <path d="M2 4.5V12a1 1 0 001 1h10a1 1 0 001-1V6a1 1 0 00-1-1H8L6.5 3.5H3a1 1 0 00-1 1z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />,
  grip: <><circle cx="6" cy="4" r="1" fill="currentColor" /><circle cx="10" cy="4" r="1" fill="currentColor" /><circle cx="6" cy="8" r="1" fill="currentColor" /><circle cx="10" cy="8" r="1" fill="currentColor" /><circle cx="6" cy="12" r="1" fill="currentColor" /><circle cx="10" cy="12" r="1" fill="currentColor" /></>,
  pin: <path d="M6 2h4l-.5 4 2.5 2.5H4L6.5 6zM8 8.5V14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}

export function Logo() {
  return (
    <svg width="28" height="16" viewBox="0 0 28 16" aria-hidden="true">
      <rect x="0.75" y="0.75" width="26.5" height="14.5" rx="7.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14" cy="8" r="3.5" fill="var(--accent)" />
    </svg>
  );
}

// ---------------------------------------------------------------- color helpers

export const useColor = () => {
  const theme = useTheme();
  return (key: PaletteKey | undefined) => colorOf(key, theme);
};

/** How strongly a goal row fills with its color. */
export const useFillAlpha = () => (useTheme() === 'dark' ? 0.24 : 0.3);

export { rgba };

// ---------------------------------------------------------------- building blocks

export function Panel({ title, actions, children, className = '', id, labelledBy, style }: {
  title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; id?: string; labelledBy?: string; style?: React.CSSProperties;
}) {
  return (
    <section className={'glass panel ' + className} id={id} aria-labelledby={labelledBy} style={style}>
      {(title || actions) && (
        <div className="between">
          {typeof title === 'string' ? <h2 className="h2" id={labelledBy}>{title}</h2> : title}
          {actions && <div className="row" style={{ flexWrap: 'wrap' }}>{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Delta({ tone, children, up }: { tone: 'up' | 'warn' | 'neutral'; children: ReactNode; up?: boolean }) {
  return (
    <span className={'delta ' + tone}>
      {up && <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2.5 7.5l5-5M3.5 2.5h4v4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      {children}
    </span>
  );
}

export function Seg<T extends string>({ label, options, value, onChange }: {
  label: string; options: Array<{ value: T; label: string }>; value: T; onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function TagChip({ tag }: { tag: string }) {
  const color = useColor();
  return <span className="tag"><span className="dot" style={{ background: color(tagColorKey(tag)) }} />{tag}</span>;
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus();
    return () => prev?.focus?.();
  }, []);
  // Rendered at the page root: a blurred (backdrop-filter) parent would otherwise trap position: fixed.
  return createPortal(
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        ref={ref}
        className="glass panel modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      >
        <div className="between">
          <h2 className="h2">{title}</h2>
          <button className="icon-btn bare" aria-label="Close" onClick={onClose}><Icon name="x" /></button>
        </div>
        {children}
        {footer && <div className="row" style={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

/** Hook for things that should close when clicking elsewhere (menus, search results). */
export function useClickAway(onAway: () => void, active: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onAway(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [active, onAway]);
  return ref;
}

// ---------------------------------------------------------------- charts

export { smoothPath, scaleY } from './chart';
