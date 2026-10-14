# Quantum Simulators — lecture material

Material for the *Quantum Simulators* lecture: the coding sessions (SSH chain, edge states, time evolution,
k-space, Zak phase, Thouless pumping, beam propagation) and an interactive web app that builds the
intuition behind them.

## Layout

| Path | What it is |
|---|---|
| `source/` | Source documents. `Coding_sessions_v1_annotated.pdf` is the task sheet with the reviewer's notes. |
| `app/` | **Quantum Simulators Lab**, a static web app (no build step). Open `app/index.html` through any static server. |
| `tools/` | Helper scripts (`make_artifact.py` builds the preview version of the app). |

## The app

**Lecture 1** (`app/index.html`): one instrument, five acts, meant to be narrated live. A particle in three
wells is shown as the real continuous wave and, at the same time, as the three numbers that replace it.
Everything later in the course (SSH chains, edge states, pumping) uses the same picture with more sites.

1. **Discrete** — a beam enters well 1 of a real potential (Crank–Nicolson on a grid). Deep wells: the wave
   is three numbers with three clocks, and the 3 × 3 Hamiltonian is *computed* from the wells (Wannier
   projection). Shallow wells: the wave spills out and the numbers miss part of it.
2. **State** — the list (ψ₁, ψ₂, ψ₃): a length and a clock per site; squared lengths add to 100%.
3. **Rule** — J pushes the neighbours, ε sets a clock rate; play and the rule moves the light. The pushes on
   the clock of site 2 are drawn head to tail: the Schrödinger equation as a picture.
4. **Motion** — the three modes. For a mode every push is at right angles to its hand: hands turn at one
   rate, bars never move. Anything else is a mix of modes and moves.
5. **Hilbert space** — the same state in site coordinates and in mode coordinates; optional 3D arrow with the
   site axes and the mode axes.

**Geometry appendix** (`app/chapters.html`): four guided chapters on the 3D picture of a three-site Hilbert
space (sites become axes, the sphere of states, the Hamiltonian as a matrix, phase and the dark state).

Conventions follow the coding sessions: ħ = 1, i dψ/dt = Hψ, hopping H<sub>n,n+1</sub> = +J (the hop
computed from the wells comes out negative; the sign is a convention), site 1 is an A site.

### Run it locally

```bash
cd app
python3 -m http.server 8000      # then open http://localhost:8000
```

Everything is plain ES modules; the only dependency, three.js r160, is vendored in `app/vendor/`.
The app works offline.

### Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys `app/` on every push to `main` (and on demand).
Enable it once: repository **Settings → Pages → Source: GitHub Actions**.

### Verify the numerics

`app/js/linalg.js` carries the eigensolver (cyclic Jacobi), the SSH chain builder and the integrators;
`app/js/lecture1/continuum.js` the grid Schrödinger solver and the Wannier projection.
Quick checks from the repository root:

```bash
cd app/js && node --input-type=module -e "
import { symEig, sshChain } from './linalg.js';
console.log(symEig(sshChain(20, 1, 2)).values.filter(E => Math.abs(E) < 0.5)); // edge states ≈ ±1.5e-3
console.log(symEig(sshChain(21, 1, 2)).values.map(Math.abs).sort((a, b) => a - b)[0]); // exact zero mode
"
```
