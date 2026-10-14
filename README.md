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

Seven chapters, each an interactive scene plus a short text, built on a three-site chain whose Hilbert
space is the ℝ³ you can see:

1. **States are vectors** — amplitudes as coordinates, basis states as axes, superposition as a direction.
2. **The space of states** — normalization puts every state on the unit sphere; ψ and −ψ are one state.
3. **Hamiltonian = matrix** — the Schrödinger equation is linear; columns of *H* are the images of the basis states.
4. **Eigenvectors** — the directions *H* only stretches; the energy landscape ⟨ψ|H|ψ⟩ on the sphere; the energy basis.
5. **Measurement** — projection onto a basis, Born rule as Pythagoras, collapse, incompatible questions.
6. **Time evolution** — eigen-components as clocks, stationary states, beats; exact evolution versus RK4 and its stability limit.
7. **Bands** — from 3 to 80 sites: levels fill a band, dimerization opens a gap, edge states appear (SSH, tasks 0–4).

Conventions follow the coding sessions: ħ = 1, i dψ/dt = Hψ, hopping H<sub>n,n+1</sub> = +J, site 1 is an A site,
J₁ sits inside the unit cell.

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

`app/js/linalg.js` carries the eigensolver (cyclic Jacobi), the SSH chain builder and the integrators.
Quick checks from the repository root:

```bash
cd app/js && node --input-type=module -e "
import { symEig, sshChain } from './linalg.js';
console.log(symEig(sshChain(20, 1, 2)).values.filter(E => Math.abs(E) < 0.5)); // edge states ≈ ±1.5e-3
console.log(symEig(sshChain(21, 1, 2)).values.map(Math.abs).sort((a, b) => a - b)[0]); // exact zero mode
"
```
