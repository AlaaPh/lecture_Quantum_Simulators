// Step strip for guided chapters: one idea, one control, one live caption per step.
import { el, button } from './ui.js';

export function makeGuide({ panel, steps, nextHref, nextLabel = 'Next chapter →', beforeStep, afterStep }) {
  const stepsBar = el('div', { class: 'steps' });
  const title = el('h2', { class: 'step-title' });
  const text = el('p', { class: 'step-text' });
  const caption = el('div', { class: 'caption' });
  const slot = el('div', { class: 'guide-slot' }); // chapter widgets (plots, dials) go here, between caption and controls
  const ctl = el('div', { class: 'controls' });
  const nav = el('div', { class: 'row step-nav' });
  panel.append(stepsBar, title, text, caption, slot, ctl, nav);
  let step = 0;
  const api = {
    get step() { return step; },
    ctl, caption, slot,
    refresh() { caption.innerHTML = steps[step].caption(); },
    go(i) {
      step = Math.max(0, Math.min(steps.length - 1, i));
      beforeStep && beforeStep(step);
      ctl.innerHTML = ''; nav.innerHTML = '';
      stepsBar.innerHTML = steps.map((s, k) => `<span class="dot${k === step ? ' on' : k < step ? ' done' : ''}" title="${s.title}"></span>`).join('');
      title.innerHTML = `<span class="step-num">${step + 1} / ${steps.length}</span> ${steps[step].title}`;
      text.innerHTML = steps[step].text || '';
      steps[step].enter(ctl);
      afterStep && afterStep(step);
      const back = button('← Back', () => api.go(step - 1), { id: 'step-back' }); back.disabled = step === 0;
      nav.append(back, step < steps.length - 1 ? button('Next →', () => api.go(step + 1), { kind: 'primary', id: 'step-next' }) : el('a', { class: 'btn primary', href: nextHref, html: nextLabel }));
      api.refresh();
    },
    dispose() { window.removeEventListener('keydown', keyHandler); },
  };
  stepsBar.addEventListener('click', (e) => { const k = [...stepsBar.children].indexOf(e.target); if (k >= 0) api.go(k); });
  const keyHandler = (e) => { if (e.target.matches('input, textarea')) return; if (e.key === 'ArrowRight' && !e.altKey) api.go(step + 1); if (e.key === 'ArrowLeft' && !e.altKey) api.go(step - 1); };
  window.addEventListener('keydown', keyHandler);
  return api;
}
