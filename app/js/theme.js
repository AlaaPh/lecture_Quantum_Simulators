// Read design tokens from CSS so canvases and WebGL match the page theme.
let cache = null;
export const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export function colors() {
  if (cache) return cache;
  const names = ['bg', 'surface', 'surface-2', 'fg', 'fg-2', 'line', 'accent', 'psi', 'hpsi', 'v1', 'v2', 'v3', 'axis', 'grid', 'pos', 'neg', 'neutral'];
  cache = {};
  for (const n of names) cache[n] = cssVar('--' + n);
  cache.v = [cache.v1, cache.v2, cache.v3];
  cache.dark = document.documentElement.dataset.theme === 'dark' ||
    (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  return cache;
}
export const invalidateTheme = () => { cache = null; };

// hex <-> rgb helpers and two colormaps (sequential blue, diverging blue-neutral-red)
export function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToCss = (c, a = 1) => (a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`);
function lerpStops(stops, t) {
  t = Math.max(0, Math.min(1, t));
  const x = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x)), f = x - i;
  const a = stops[i], b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}
const SEQ_LIGHT = ['#e4eefb', '#9ec5f4', '#3987e5', '#1c5cab', '#0d366b'].map(hexToRgb);
const SEQ_DARK = ['#1c2535', '#1c5cab', '#3987e5', '#86b6ef', '#cde2fb'].map(hexToRgb);
// Sequential magnitude map, one hue, near-zero recedes toward the surface.
export function cmapSeq(t) { return lerpStops(colors().dark ? SEQ_DARK : SEQ_LIGHT, t); }
// Diverging map for signed values in [-1, 1]: blue (negative), neutral, red (positive).
export function cmapDiv(t) {
  const c = colors();
  const stops = [hexToRgb(c.neg), hexToRgb(c.neutral), hexToRgb(c.pos)];
  return lerpStops(stops, (Math.max(-1, Math.min(1, t)) + 1) / 2);
}
