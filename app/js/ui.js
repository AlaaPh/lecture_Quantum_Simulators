// Small DOM helpers and control builders. Every control gets a stable id.
export function el(tag, attrs = {}, children = []) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) e.setAttribute(k, v);
  }
  for (const c of [].concat(children)) if (c) e.append(c);
  return e;
}
export const html = (s) => { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content; };

export function slider({ id, label, min, max, step = 0.01, value, format = (v) => v.toFixed(2), onInput }) {
  const input = el('input', { type: 'range', id, min, max, step, value });
  const out = el('output', { class: 'val', for: id, text: format(+value) });
  const root = el('div', { class: 'ctl ctl-slider' }, [el('label', { for: id, html: label }), input, out]);
  input.addEventListener('input', () => { out.textContent = format(+input.value); onInput && onInput(+input.value); });
  return {
    root, input,
    get: () => +input.value,
    set: (v, fire = false) => { input.value = v; out.textContent = format(+v); if (fire) onInput && onInput(+v); },
  };
}
export function button(label, onClick, { kind = '', id, title } = {}) {
  return el('button', { type: 'button', class: `btn ${kind}`.trim(), id, title, html: label, onclick: onClick });
}
export const row = (children, cls = '') => el('div', { class: `row ${cls}`.trim() }, children);
export function toggle({ id, label, checked = false, onChange }) {
  const input = el('input', { type: 'checkbox', id, class: 'switch' });
  input.checked = checked;
  input.addEventListener('change', () => onChange && onChange(input.checked));
  const root = el('label', { class: 'ctl ctl-toggle', for: id }, [input, el('span', { html: label })]);
  return { root, input, get: () => input.checked, set: (v) => { input.checked = v; } };
}
export function segmented({ id, options, value, onChange }) {
  const root = el('div', { class: 'seg', role: 'group', id });
  const btns = options.map((o) => el('button', { type: 'button', class: 'seg-btn' + (o.value === value ? ' active' : ''), html: o.label, 'data-value': o.value }));
  btns.forEach((b) => { b.addEventListener('click', () => { set(b.dataset.value); onChange && onChange(b.dataset.value); }); root.append(b); });
  function set(v) { value = v; btns.forEach((b) => b.classList.toggle('active', b.dataset.value === String(v))); }
  return { root, get: () => value, set };
}
// Key/value readout with tabular numbers.
export function readout(rows) {
  const root = el('dl', { class: 'readout' });
  const vals = {};
  for (const [key, label, init] of rows) {
    const dd = el('dd', { text: init ?? '' });
    vals[key] = dd;
    root.append(el('dt', { html: label }), dd);
  }
  return { root, set: (key, v) => { vals[key].innerHTML = v; } };
}
export function group(title, children, { open = true } = {}) {
  const d = el('details', { class: 'ctl-group' }, [el('summary', { html: title }), el('div', { class: 'ctl-group-body' }, children)]);
  d.open = open;
  return d;
}
// Matrix display with brackets. set(M, {hiCol, hiRow, fmt})
export function matrixView(n, m, { label = '', cls = '' } = {}) {
  const cells = [];
  const grid = el('div', { class: 'mat-grid', style: `grid-template-columns: repeat(${m}, auto)` });
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const c = el('span', { class: 'mat-cell', text: '0' }); cells.push(c); grid.append(c); }
  const root = el('div', { class: `mat ${cls}`.trim() }, [label ? el('span', { class: 'mat-label', html: label }) : null, el('span', { class: 'mat-br' }), grid, el('span', { class: 'mat-br mat-br-r' })]);
  return {
    root,
    set: (M, { hiCol = -1, hiRow = -1, fmt = (v) => (Math.abs(v) < 5e-3 ? '0' : v.toFixed(2)) } = {}) => {
      for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
        const c = cells[i * m + j];
        c.textContent = fmt(M[i][j]);
        c.classList.toggle('hi', j === hiCol || i === hiRow);
      }
    },
  };
}
// Column vector display.
export function vectorView(n, opts = {}) { return matrixView(n, 1, opts); }

export const math = (s) => `<span class="m">${s}</span>`;
export const fmtNum = (x, d = 2) => (Math.abs(x) < 0.5 * 10 ** -d ? (0).toFixed(d) : x.toFixed(d));
