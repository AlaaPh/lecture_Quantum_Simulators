// Overlays inside the 3D stage: the live equation (top left) and the chain with probabilities (bottom).
import { el, matrixView } from './ui.js';
import { fmt } from './linalg.js';

export const pct = (p) => Math.round(p * 100) + '%';

export function makeHud(stage, { siteColors, onSiteClick } = {}) {
  const cols = siteColors.slice();
  const hud = el('div', { class: 'hud' });
  const eq = el('div', { class: 'hud-eq' });
  const eq2 = el('div', { class: 'hud-eq hud-eq2' });
  const matBox = el('div', { class: 'hud-mat' }); matBox.hidden = true;
  const mat = matrixView(3, 3, { label: '<i>H</i> =' }); matBox.append(mat.root);
  const chain = el('div', { class: 'hud-chain' });
  const X = (i) => 48 + 112 * i;
  chain.innerHTML = `<svg viewBox="0 -36 320 132" width="100%" height="100%" aria-hidden="true">
    <defs><marker id="hop-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="hop-head"/></marker></defs>
    <line x1="48" y1="44" x2="272" y2="44" class="bond"/>
    <g class="hops"></g>
    ${[0, 1, 2].map((i) => `<g class="site" data-i="${i}"><circle cx="${X(i)}" cy="44" r="22" class="site-bg"/><circle cx="${X(i)}" cy="44" r="22" class="site-fill" fill="${cols[i]}" fill-opacity="0"/><circle cx="${X(i)}" cy="44" r="22" class="site-ring" stroke="${cols[i]}"/><text x="${X(i)}" y="48" class="site-name" text-anchor="middle">${i + 1}</text><text x="${X(i)}" y="86" class="site-p" text-anchor="middle"></text></g>`).join('')}
  </svg>`;
  hud.append(eq, eq2, matBox, chain); stage.append(hud);
  const fills = [...chain.querySelectorAll('.site-fill')], rings = [...chain.querySelectorAll('.site-ring')], ptexts = [...chain.querySelectorAll('.site-p')];
  const hopsG = chain.querySelector('.hops');
  chain.querySelectorAll('g.site').forEach((g) => { g.style.cursor = onSiteClick ? 'pointer' : 'default'; g.addEventListener('click', () => onSiteClick && onSiteClick(+g.dataset.i)); });
  return {
    eq(html) { eq.innerHTML = html || ''; },
    eq2(html) { eq2.innerHTML = html || ''; },
    // 3x3 matrix under the equation; null hides it
    matrix(M, opts = {}) { matBox.hidden = !M; if (M) mat.set(M, opts); },
    // hop arrows from a source site to its neighbours (strength J) and a ring for its on-site energy; null hides them
    hops(spec) {
      hopsG.innerHTML = '';
      if (!spec) return;
      const { source: i, J, eps } = spec;
      const arcs = [];
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j > 2) continue;
        const Jij = J[Math.min(i, j)];
        const x0 = X(i) + (j > i ? 24 : -24), x1 = X(j) + (j > i ? -24 : 24), xm = (X(i) + X(j)) / 2;
        arcs.push(`<path d="M${x0},${44 - 14} Q${xm},${-18} ${x1},${44 - 14}" class="hop" marker-end="url(#hop-arrow)" style="stroke-width:${Math.max(1, Math.min(5, 1 + 2 * Math.abs(Jij)))}" opacity="${Math.abs(Jij) < 1e-6 ? 0.2 : 1}"/><text x="${xm}" y="${-20}" class="hop-label" text-anchor="middle">J = ${fmt(Jij)}</text>`);
      }
      if (eps) arcs.push(`<circle cx="${X(i)}" cy="44" r="30" class="hop-self" opacity="${Math.abs(eps[i]) < 1e-6 ? 0.25 : 1}"/><text x="${X(i) + (i === 2 ? -36 : 36)}" y="${44 + 30}" class="hop-label" text-anchor="${i === 2 ? 'end' : 'start'}">ε${i + 1} = ${fmt(eps[i])}</text>`);
      hopsG.innerHTML = arcs.join('');
    },
    chain(probs, show = true) { fills.forEach((f, i) => f.setAttribute('fill-opacity', show ? probs[i].toFixed(3) : '0')); ptexts.forEach((t, i) => { t.textContent = show ? pct(probs[i]) : ''; }); },
    setColors(c) { c.forEach((col, i) => { cols[i] = col; fills[i].setAttribute('fill', col); rings[i].setAttribute('stroke', col); }); },
    remove() { hud.remove(); },
  };
}

// "ψ = 0.70·site 1 + 0.49·site 2 + 0.51·site 3"
export const comp = (col, x, d = 2) => `<span style="color:${col}">${fmt(x, d)}</span>`;
export function psiEquation(v, cols, { length = true } = {}) {
  const n = Math.hypot(v[0], v[1], v[2]);
  return `<i>ψ</i> = ${comp(cols[0], v[0])}·site 1 + ${comp(cols[1], v[1])}·site 2 + ${comp(cols[2], v[2])}·site 3` + (length && Math.abs(n - 1) > 0.02 ? `<span class="hud-dim">length ${fmt(n)}</span>` : '');
}
export function probsOf(v) { const n2 = v[0] ** 2 + v[1] ** 2 + v[2] ** 2; return n2 > 1e-9 ? v.map((x) => (x * x) / n2) : [0, 0, 0]; }
