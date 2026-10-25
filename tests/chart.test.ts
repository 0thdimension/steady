// Run with: npm test
import assert from 'node:assert/strict';
import { scaleY, smoothPath } from '../src/components/chart';

const ys = (d: string) => {
  const nums = d.replace(/[MLC]/g, ' ').trim().split(/\s+/).map(Number);
  return nums.filter((_, i) => i % 2 === 1);
};

// A week with no hours until Thursday: the curve must never go below the zero line.
const vals = [0, 0, 0, 2.5, 3.1, 1.8];
const Y = scaleY(vals, 12, 80);
const pts = vals.map((v, i) => [10 + i * 40, Y(v)] as [number, number]);
const zeroY = Y(0);
const all = ys(smoothPath(pts));
assert.ok(all.every((y) => y <= zeroY + 0.06), 'curve dips below zero');
assert.ok(all.every((y) => y >= Y(3.1) - 0.06), 'curve overshoots the top');
assert.equal(zeroY, 80, 'zero sits on the baseline');

// Rising then falling data stays inside its range too.
const v2 = [1, 5, 2, 8, 3];
const Y2 = scaleY(v2, 0, 100);
const all2 = ys(smoothPath(v2.map((v, i) => [i * 10, Y2(v)] as [number, number])));
// (paths are rounded to 0.1, hence the small tolerance)
assert.ok(all2.every((y) => y >= Y2(8) - 0.06 && y <= Y2(1) + 0.06));

console.log('chart tests: 3 passed');
