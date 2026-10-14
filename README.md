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

Guided chapters, each a sequence of short steps with one control and a live caption, built on a three-site
chain whose Hilbert space is the ℝ³ you can see. The 3D view carries the state as an arrow; the chain at the
bottom of the view shows the sites, their probabilities, hop arrows and the clock of each complex amplitude.

1. **Hilbert space** — sites become axes on a 3D grid; a state is an arrow; probabilities are squared components.
2. **The space of states** — only the direction counts; the unit sphere; two dials; ψ and −ψ are one state; the map of the sphere.
3. **Hamiltonian = matrix** — hopping to the neighbours, on-site energy, the three columns, symmetry.
4. **Phase** — a clock on every site; site measurements ignore the phase, other bases see it; two guides feeding the middle one cancel at 180°: the dark state.

Planned next, in the same form: eigenvectors (states that stand still), measurement, time evolution, and bands
(the N-site chain, SSH edge states). The earlier text-heavy versions of those chapters are in the git history
(commit `014c94f`, folder `app/js/chapters/`).

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
