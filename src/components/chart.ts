// Pure chart helpers (no React), so tests can import them.

/**
 * Smooth curve through points that never swings past the data (monotone cubic, Fritsch-Carlson).
 * A flat run of zeros stays flat, so a day with no hours never dips below zero.
 */
export const smoothPath = (pts: Array<[number, number]>) => {
  const n = pts.length;
  if (!n) return '';
  const f = (v: number) => v.toFixed(1);
  if (n === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}`;
  if (n === 2) return `M${f(pts[0][0])} ${f(pts[0][1])} L${f(pts[1][0])} ${f(pts[1][1])}`;
  const dx: number[] = [], m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0]);
    m.push(dx[i] === 0 ? 0 : (pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) { t[i] = 0; t[i + 1] = 0; continue; }
    const a = t[i] / m[i], b = t[i + 1] / m[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); t[i] = k * a * m[i]; t[i + 1] = k * b * m[i]; }
  }
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], h = dx[i] / 3;
    d += ` C${f(x0 + h)} ${f(y0 + t[i] * h)} ${f(x1 - h)} ${f(y1 - t[i + 1] * h)} ${f(x1)} ${f(y1)}`;
  }
  return d;
};

/** Maps values to chart y. Data that never goes below zero keeps zero on the baseline. */
export const scaleY = (values: number[], top: number, bottom: number, padFrac = 0.18) => {
  let min = Math.min(...values), max = Math.max(...values);
  if (!Number.isFinite(min)) { min = 0; max = 1; }
  const nonNegative = min >= 0;
  if (max - min < 1e-6) { max += 1; min = nonNegative ? Math.max(0, min - 1) : min - 1; }
  const pad = (max - min) * padFrac;
  min = nonNegative ? Math.max(0, min - pad) : min - pad;
  max += pad;
  return (v: number) => bottom - ((v - min) / (max - min)) * (bottom - top);
};
