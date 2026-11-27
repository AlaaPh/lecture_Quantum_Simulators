// Data for the pump of tab 3: the propagation, the eigenvalues of the open chain and γ(t), each computed once
// per parameter set and then kept. No DOM.
import { HAND, SHEET, TAU, propagate, pumpParams, inGapStates, gammaCurve, energy } from './model.js';

export const T_VALUES = [20, 50, 100];
export const DT = 0.05;
// Unit cells of the chain. The light spreads at most with the largest slope of the band, which is below min(J₁, J₂):
// the chain is long enough that no light reaches an end (the test prints the light in the outermost cells).
export const CELLS = { hand: { 20: 40, 50: 60, 100: 120 }, sheet: { 20: 60, 50: 100, 100: 160 } };
export const CHAIN_CELLS = 40;          // the open chain of B2
export const setOf = (sheet) => (sheet ? SHEET : HAND);
export const paramsAt = (sheet, s) => { const { dJ, D0 } = setOf(sheet); return pumpParams(s, dJ, D0); };

const sims = new Map(), spectra = new Map(), gammas = new Map();

// The propagation through one cycle. frames[i] = |ψ|² on every guide at the time s[i]·T, X[i] = position of the light
// (cells counted from the cell m0 where it starts), peak[i] = largest |ψ|² of one guide.
// W: the cells m0 − W … m0 + W hold at least 99 % of the light at every time.
export function simulation(sheet, T, input) {
  const key = `${sheet ? 'sheet' : 'hand'}|${T}|${input}`;
  if (sims.has(key)) return sims.get(key);
  const { dJ, D0 } = setOf(sheet), Nc = CELLS[sheet ? 'sheet' : 'hand'][T], n = Math.round(T / DT);
  // about 400 frames, and a stride that divides the number of steps: the frames are equally spaced in time, so that
  // frameAt finds the frame of a time by its index (T = 50: 1000 steps, stride 2, 501 frames)
  let stride = Math.max(1, Math.round(n / 400));
  while (n % stride) stride--;
  const frames = [], X = [], s = [], peak = [];
  let W = 3, ends = 0;
  const m0 = Math.floor(Nc / 2);
  const r = propagate(dJ, D0, T, Nc, DT, {
    input,
    onStep: ({ step, t, Xstart, re, im }) => {
      if (step % stride !== 0 && step !== n) return;
      const I = new Float32Array(2 * Nc);
      let max = 0, total = 0;
      for (let j = 0; j < 2 * Nc; j++) { I[j] = re[j] * re[j] + im[j] * im[j]; total += I[j]; if (I[j] > max) max = I[j]; }
      let out = total;                                   // light outside the cells m0 − w … m0 + w
      for (let w = 0; w < m0; w++) {
        for (const m of w === 0 ? [m0] : [m0 - w, m0 + w]) if (m >= 0 && m < Nc) out -= I[2 * m] + I[2 * m + 1];
        if (out <= 0.01 * total) { if (w > W) W = w; break; }
        if (w === m0 - 1) W = m0 - 1;
      }
      ends = Math.max(ends, I[0] + I[1] + I[2 * Nc - 2] + I[2 * Nc - 1]);
      frames.push(I); X.push(Xstart); s.push(t / T); peak.push(max);
    },
  });
  const sim = { sheet, T, input, Nc, m0, W, frames, X, s, peak, ends, norm: r.norm, shift: r.shiftStart };
  sims.set(key, sim);
  return sim;
}
// The frame that belongs to the time s = t/T: the frames are equally spaced, frame i is the time i/(number of frames − 1).
export const frameAt = (sim, s) => Math.max(0, Math.min(sim.frames.length - 1, Math.round(s * (sim.frames.length - 1))));

// Eigenvalues of the open chain of CHAIN_CELLS cells at nt + 1 times of the cycle. states[j]: the eigenvalues inside
// the gap at the time j/nt, each with the end of the chain that holds its light.
export function spectrum(sheet, nt = 128) {
  const key = sheet ? 'sheet' : 'hand';
  if (spectra.has(key)) return spectra.get(key);
  const { dJ, D0 } = setOf(sheet), s = [], levels = [], edge = [], states = [];
  for (let j = 0; j <= nt; j++) {
    const g = inGapStates(j / nt, dJ, D0, CHAIN_CELLS);
    s.push(j / nt); levels.push(g.values); edge.push(g.edge); states.push(g.states.map(({ E, end }) => ({ E, end })));
  }
  const out = { s, levels, edge, states, cells: CHAIN_CELLS };
  spectra.set(key, out);
  return out;
}
// γ(t)/2π over the cycle, followed without jumps, with M = 400 points in k.
export function gammaOverCycle(sheet, nt = 64) {
  const key = sheet ? 'sheet' : 'hand';
  if (gammas.has(key)) return gammas.get(key);
  const { dJ, D0 } = setOf(sheet), c = gammaCurve(dJ, D0, 400, nt);
  const out = { s: c.s, cells: c.unwrapped.map((g) => g / TAU), overPi: c.unwrapped.map((g) => g / Math.PI) };
  gammas.set(key, out);
  return out;
}
// The upper band E(k) at the time s on nk + 1 points from 0 to 2π, and the smallest value.
export function bandsAt(sheet, s, nk = 120) {
  const p = paramsAt(sheet, s), k = [], E = [];
  for (let i = 0; i <= nk; i++) { k.push((TAU * i) / nk); E.push(energy(k[i], p.J1, p.J2, p.D)); }
  return { k, E, min: Math.min(...E), p };
}
