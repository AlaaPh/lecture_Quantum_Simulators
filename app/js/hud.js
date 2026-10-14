// Overlays inside the 3D stage: the live equation (top left) and the chain with probabilities (bottom).
import { el } from './ui.js';
import { fmt } from './linalg.js';

export const pct = (p) => Math.round(p * 100) + '%';

export function makeHud(stage, { siteColors, onSiteClick } = {}) {
  const cols = siteColors.slice();
  const hud = el('div', { class: 'hud' });
  const eq = el('div', { class: 'hud-eq' });
  const chain = el('div', { class: 'hud-chain' });
  chain.innerHTML = `<svg viewBox="0 0 320 96" width="100%" height="100%" aria-hidden="true">
    <line x1="48" y1="44" x2="272" y2="44" class="bond"/>
    ${[0, 1, 2].map((i) => `<g class="site" data-i="${i}"><circle cx="${48 + 112 * i}" cy="44" r="22" class="site-bg"/><circle cx="${48 + 112 * i}" cy="44" r="22" class="site-fill" fill="${cols[i]}" fill-opacity="0"/><circle cx="${48 + 112 * i}" cy="44" r="22" class="site-ring" stroke="${cols[i]}"/><text x="${48 + 112 * i}" y="48" class="site-name" text-anchor="middle">${i + 1}</text><text x="${48 + 112 * i}" y="86" class="site-p" text-anchor="middle"></text></g>`).join('')}
  </svg>`;
  hud.append(eq, chain); stage.append(hud);
  const fills = [...chain.querySelectorAll('.site-fill')], rings = [...chain.querySelectorAll('.site-ring')], ptexts = [...chain.querySelectorAll('.site-p')];
  chain.querySelectorAll('g.site').forEach((g) => { g.style.cursor = onSiteClick ? 'pointer' : 'default'; g.addEventListener('click', () => onSiteClick && onSiteClick(+g.dataset.i)); });
  return {
    eq(html) { eq.innerHTML = html || ''; },
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
