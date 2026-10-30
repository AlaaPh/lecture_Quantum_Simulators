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
3. **Coupling** — i dψ/dt = Hψ as a table: J couples the neighbours, ε sets the phase rate. Play: the
   directional coupler. The three terms of dψ₂/dt are drawn head to tail on the phasor of guide 2.
4. **Supermodes** — the three eigenstates. For a supermode dψᵢ/dt = −iEψᵢ is perpendicular to every phasor: the
   phases advance at one rate E, the intensities never move. Anything else is a mix and moves.
5. **Hilbert space** — the same state in guide coordinates and in supermode coordinates; optional 3D arrow
   with the guide axes and the supermode axes.

   Acts 2, 4 and 6 also show the far field of the output (the array factor after a lens), where the relative
   phases and the signs of a supermode become fringes: in phase = bright centre, antiphase = dark centre.
6. **Task 1** — the chain of N guides (default 20, J = 1): the eigenvalues as dots with the closed form
   2J cos(nπ/(N+1)), the eigenstates as a colour plot, and the propagation map of one excited guide
   (discrete diffraction) or of one supermode (nothing moves). Click a dot or a row to launch that mode.

**Exercise 2** (`app/exercise2.html`): the same instrument with 41 guides, five acts.

0. **One step** — one Runge–Kutta 4 step on a single amplitude, i dψ/dz = Eψ, built piece by piece: the derivative k₁ at
   the start, the trial points P₂, P₃, P₄ and the derivatives k₂, k₃, k₄ asked there, the 1:2:2:1 average and the landing
   point against the exact circle. Every quantity is drawn and printed with its numbers; Euler (k₁ only) on request.
1. **Stepping** — i dψ/dz = Hψ integrated step by step: Euler versus Runge–Kutta 4, with the norm and the
   error against the exact solution plotted along z. Euler is unstable for every dz; RK4 is stable for
   dz < 2√2/E<sub>max</sub> and its error shrinks like dz⁴.
2. **Beam and k** — a wide beam with a phase difference k between neighbouring guides sits at one point of the
   band E(k) = 2J cos k and moves with the group velocity dE/dk. The eigenvalues of the finite chain are the dots on that band.
3. **Bloch oscillations** — a linear gradient εⱼ = F·j of the propagation constants makes k drift, k(z) = k₀ − F z; the beam moves along the
   band, turns around at the band edges, and oscillates with period 2π/F over 4J/F guides.
4. **SSH chain (Task 2)** — alternating J₁, J₂, drawn as a chip seen from above with alternating gaps (J ∝ e^(−d/d₀)) and the light painted along z: the gap 2|J₁ − J₂|, the dimer symmetry of the two bands, and
   for 21 guides the E = 0 state on the odd guides at the end with the weak bond, decay length 1/|ln(J₁/J₂)|.

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
demand from the Actions tab). Three one-time settings on github.com, all of which only the owner can make:

1. The repository must be public (GitHub Pages on a private repository needs a paid plan).
2. **Settings → Pages → Build and deployment → Source: GitHub Actions.** The workflow cannot switch this on
   by itself. Leave the custom-domain field empty unless you own a real domain.
3. **Settings → Environments → github-pages → Deployment branches:** allow the default branch (or choose
   "No restriction"), otherwise the job is rejected before it starts.

The app is then at <https://alaaph.github.io/lecture_Quantum_Simulators/>, Exercise 2 at `/exercise2.html`, the
geometry appendix at `/chapters.html`, and a QR code to project at `/share.html`.

### Publish with GitLab Pages (university GitLab)

`.gitlab-ci.yml` does the same job on GitLab: every push to the default branch publishes `app/` as the
site root. The course copy lives at <https://gitlab.rhrk.uni-kl.de/bayazeed/quantum-simulators> (visibility
"internal": every RPTU login can open it). To update it from a clone of this repository:

```bash
git pull origin claude/pensive-hawking-o7z2u8      # fetch the latest GitHub state
git push gitlab HEAD:main                          # publish it on GitLab
```

The first push needs `git remote add gitlab https://gitlab.rhrk.uni-kl.de/bayazeed/quantum-simulators.git`
and, if the project was created with its own first commit, `--force` once (allow it under **Settings →
Repository → Protected branches → main → Allowed to force push**).

The `pages` job only produces a site if the instance has GitLab Pages switched on:
<https://gitlab.rhrk.uni-kl.de/help/instance_configuration> lists a "GitLab Pages" section with the domain
when it does, and the project then shows **Deploy → Pages** with the address. Without it the pipeline is
green but nothing is served; the GitHub address above is the fallback.

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
