// Minimal tweening with reduced-motion support. Vectors are plain arrays.
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
export const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

function slerp(a, b, t) {
  let d = a.reduce((s, v, i) => s + v * b[i], 0);
  d = Math.max(-1, Math.min(1, d));
  const om = Math.acos(d);
  if (om < 1e-4) return a.map((v, i) => v + (b[i] - v) * t);
  const sa = Math.sin((1 - t) * om) / Math.sin(om), sb = Math.sin(t * om) / Math.sin(om);
  return a.map((v, i) => sa * v + sb * b[i]);
}

// tween({from, to, duration, onUpdate, onDone, mode:'linear'|'slerp'}) -> cancel()
export function tween({ from, to, duration = 600, onUpdate, onDone, mode = 'linear', ease = easeInOut }) {
  if (reduced()) duration = 0;
  const isArr = Array.isArray(from);
  const interp = (t) => (isArr ? (mode === 'slerp' ? slerp(from, to, t) : from.map((v, i) => v + (to[i] - v) * t)) : from + (to - from) * t);
  if (duration <= 0) { onUpdate(isArr ? to.slice() : to); onDone && onDone(); return () => {}; }
  let raf = 0; const t0 = performance.now();
  const step = (now) => {
    const u = Math.min(1, (now - t0) / duration);
    onUpdate(interp(ease(u)));
    if (u < 1) raf = requestAnimationFrame(step); else onDone && onDone();
  };
  raf = requestAnimationFrame(step);
  return () => cancelAnimationFrame(raf);
}

// Keeps one running tween per key so a new request replaces the old one.
export class Tweens {
  constructor() { this.active = new Map(); }
  run(key, opts) {
    this.cancel(key);
    const done = opts.onDone;
    const cancel = tween({ ...opts, onDone: () => { this.active.delete(key); done && done(); } });
    this.active.set(key, cancel);
  }
  cancel(key) { const c = this.active.get(key); if (c) { c(); this.active.delete(key); } }
  cancelAll() { for (const c of this.active.values()) c(); this.active.clear(); }
}
