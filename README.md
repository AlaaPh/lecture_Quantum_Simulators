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

**Exercise 1** (`app/index.html`): one instrument, six acts, meant to be narrated live. Three coupled
waveguides are shown as the real field ψ(x) in a refractive-index profile n(x) and, at the same time, as
the three numbers that replace it. Everything later in the course (SSH chains, edge states, pumping) uses
the same picture with more guides.

1. **Waveguides** — a beam enters guide 1 of a real index profile (Crank–Nicolson on a grid; z plays the
   role of time). High index contrast: the field is three amplitudes with three phases, and the 3 × 3
   coupled-mode matrix is *computed* from n(x) (Wannier projection). Low contrast: the light spills out.
2. **State** — the list (ψ₁, ψ₂, ψ₃): an intensity and a phase per guide; intensities add to 100%.
3. **Coupling** — i dψ/dt = Hψ as a table: J pushes the neighbours, ε sets a phase rate. Play: the
   directional coupler. The pushes on the phase of guide 2 are drawn head to tail.
4. **Supermodes** — the three eigenstates. For a supermode every push is at right angles to its hand: the
   phases advance at one rate E, the intensities never move. Anything else is a mix and moves.
5. **Hilbert space** — the same state in guide coordinates and in supermode coordinates; optional 3D arrow
   with the guide axes and the supermode axes.
6. **Task 1** — the chain of N guides (default 20, J = 1): the eigenvalues as dots with the closed form
   2J cos(nπ/(N+1)), the eigenstates as a colour plot, and the propagation map of one excited guide
   (discrete diffraction) or of one supermode (nothing moves). Click a dot or a row to launch that mode.

**Geometry appendix** (`app/chapters.html`): four guided chapters on the 3D picture of a three-guide Hilbert
space (guides become axes, the sphere of states, the Hamiltonian as a matrix, phase and the dark state).

Conventions follow the coding sessions: ħ = 1, i dψ/dt = Hψ, hopping H<sub>n,n+1</sub> = +J (the coupling
computed from n(x) comes out negative; the sign is a convention), site 1 is an A site.

### Run it locally

```bash
cd app
python3 -m http.server 8000      # then open http://localhost:8000
```

Everything is plain ES modules; the only dependency, three.js r160, is vendored in `app/vendor/`.
The app works offline.

### Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys `app/` on every push to the default branch (and on
demand). The first run enables Pages by itself; if it fails, set repository **Settings → Pages → Source:
GitHub Actions** once and re-run it. The app is then at <https://alaaph.github.io/lecture_Quantum_Simulators/>
(the geometry appendix at `/chapters.html`).

### Publish with GitLab Pages (university GitLab)

`.gitlab-ci.yml` does the same job on GitLab: every push to the default branch publishes `app/` as the
site root. Create an empty project on the university GitLab, then push this repository to it:

```bash
git remote add gitlab https://<gitlab-host>/<group-or-user>/<project>.git
git push -u gitlab HEAD
```

The site URL is shown in the GitLab project under **Deploy → Pages** once the pipeline is green. The
project's **Settings → General → Visibility → Pages** must be enabled on that instance.

### Verify the numerics

`app/js/linalg.js` carries the eigensolver (cyclic Jacobi), the SSH chain builder and the integrators;
`app/js/lecture1/continuum.js` the grid Schrödinger (paraxial Helmholtz) solver and the Wannier projection.
Quick checks from the repository root:

```bash
cd app/js && node --input-type=module -e "
import { symEig, sshChain } from './linalg.js';
console.log(symEig(sshChain(20, 1, 2)).values.filter(E => Math.abs(E) < 0.5)); // edge states ≈ ±1.5e-3
console.log(symEig(sshChain(21, 1, 2)).values.map(Math.abs).sort((a, b) => a - b)[0]); // exact zero mode
"
```
