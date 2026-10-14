// Shared pieces for the chapters: the state arrow with a draggable tip, Hamiltonian sliders, presets.
import { slider, button, row, group, el } from '../ui.js';
import { tightBinding, normalize } from '../linalg.js';

export const SQ2 = Math.SQRT1_2;
export const PRESETS = [
  { label: '<i>e</i><sub>1</sub>', v: [1, 0, 0] },
  { label: '<i>e</i><sub>2</sub>', v: [0, 1, 0] },
  { label: '<i>e</i><sub>3</sub>', v: [0, 0, 1] },
  { label: '(<i>e</i><sub>1</sub>+<i>e</i><sub>2</sub>)/√2', v: [SQ2, SQ2, 0] },
  { label: '(<i>e</i><sub>1</sub>−<i>e</i><sub>3</sub>)/√2', v: [SQ2, 0, -SQ2] },
  { label: '(1,1,1)/√3', v: [1, 1, 1].map((x) => x / Math.sqrt(3)) },
];
export const randomUnit = () => normalize([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);

export function presetButtons(onPick, { random = true } = {}) {
  const btns = PRESETS.map((p) => button(p.label, () => onPick(p.v.slice()), { kind: 'math' }));
  if (random) btns.push(button('random', () => onPick(randomUnit())));
  return row(btns);
}

// Arrow + draggable tip + label.
export function stateArrow(view, { color, label, cls = '', handle = true, mode = 'sphere', onDrag, radius = 0.032, opacity = 1, labelOffset = 0.17 }) {
  const arrow = view.makeArrow({ color, radius, opacity });
  let hm = null;
  if (handle) { hm = view.makeSphereHandle({ color, radius: 0.058 }); view.addHandle(hm, { mode, onDrag }); }
  const lab = label ? view.addLabel(label, () => {
    const v = arrow.get(); const L = Math.hypot(v[0], v[1], v[2]);
    if (L < 1e-3) return null;
    const s = (L + labelOffset) / L; return [v[0] * s, v[1] * s, v[2] * s];
  }, cls) : null;
  return {
    arrow, handle: hm, label: lab,
    set(v) { arrow.set(v); if (hm) { hm.position.set(v[0], v[1], v[2]); hm.visible = Math.hypot(v[0], v[1], v[2]) > 1e-3; } view.requestRender(); },
    get: () => arrow.get(),
    setVisible(b) { arrow.setVisible(b); if (hm) hm.visible = b; if (lab) lab.el.style.visibility = b ? '' : 'hidden'; view.requestRender(); },
  };
}

export const hamiltonianOf = (store) => tightBinding(store.eps, store.J);

// Collapsible group with the five Hamiltonian sliders bound to the store.
export function hSliders(store, onChange, { open = true, Jmin = -2, Jmax = 2 } = {}) {
  const s = [];
  const mk = (id, label, min, max, get, set) => { const sl = slider({ id, label, min, max, step: 0.05, value: get(), onInput: (v) => { set(v); onChange(); } }); s.push({ sl, get }); return sl.root; };
  const body = [
    mk('eps1', '<i>ε</i><sub>1</sub>', -2, 2, () => store.eps[0], (v) => (store.eps[0] = v)),
    mk('eps2', '<i>ε</i><sub>2</sub>', -2, 2, () => store.eps[1], (v) => (store.eps[1] = v)),
    mk('eps3', '<i>ε</i><sub>3</sub>', -2, 2, () => store.eps[2], (v) => (store.eps[2] = v)),
    mk('j12', '<i>J</i><sub>12</sub>', Jmin, Jmax, () => store.J[0], (v) => (store.J[0] = v)),
    mk('j23', '<i>J</i><sub>23</sub>', Jmin, Jmax, () => store.J[1], (v) => (store.J[1] = v)),
    row([button('Uniform chain (ε = 0, J = 1)', () => { store.eps = [0, 0, 0]; store.J = [1, 1]; sync(); onChange(); })]),
  ];
  const root = group('Hamiltonian', body, { open });
  function sync() { for (const { sl, get } of s) sl.set(get()); }
  return { root, sync };
}

export const deg = (rad) => (rad * 180) / Math.PI;
export const sup = (s) => `<sup>${s}</sup>`;
export const widget = (id, label, cls = '') => el('div', { class: 'widget-row' }, [label ? el('div', { class: 'widget-label', html: label }) : null, el('canvas', { class: `widget ${cls}`.trim(), id })]);
