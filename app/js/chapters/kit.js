// Shared pieces for the chapters: coloured site axes, the Hamiltonian from the store, small helpers.
import { el } from '../ui.js';
import { tightBinding, normalize } from '../linalg.js';
import { THREE } from '../view3d.js';

export const randomUnit = () => normalize([Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5]);
export const hamiltonianOf = (store) => tightBinding(store.eps, store.J);
export const deg = (rad) => (rad * 180) / Math.PI;
export const widget = (id, label, cls = '') => el('div', { class: 'widget-row' }, [label ? el('div', { class: 'widget-label', html: label }) : null, el('canvas', { class: `widget ${cls}`.trim(), id })]);

// Three coloured axes labelled "site i · e_i" that can grow from the origin.
export function siteAxes(view, siteColors, { length = 1.5 } = {}) {
  const dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  return dirs.map((d, i) => {
    const seg = view.makeSegment({ color: siteColors[i] });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 16), new THREE.MeshStandardMaterial({ color: new THREE.Color(siteColors[i]), roughness: 0.6 }));
    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d)); view.root.add(cone);
    let s = 0;
    view.addLabel(`site ${i + 1}<span class="lbl-sub"> · <i>e</i><sub>${i + 1}</sub></span>`, () => (s > 0.05 ? d.map((x) => x * (length * s + 0.22)) : null), `lbl-site lbl-site${i + 1}`);
    const api = {
      set(scale) { s = scale; seg.set([0, 0, 0], d.map((x) => x * length * s)); cone.position.set(...d.map((x) => x * length * s)); cone.visible = s > 0.02; seg.setVisible(s > 0.001); view.requestRender(); },
      setColor(col) { seg.setColor(col); cone.material.color.set(col); },
    };
    api.set(0);
    return api;
  });
}
