# Quantum Simulators — lecture material

Material for the *Quantum Simulators* lecture: the coding sessions (SSH chain, edge states, time evolution,
k-space, Zak phase, Thouless pumping, beam propagation) and an interactive web app that builds the
intuition behind them.

## Layout

| Path | What it is |
|---|---|
| `source/` | Source documents. `Coding_sessions_v1_annotated.pdf` is the task sheet with the reviewer's notes, `LectureNotes.md` the conventions of lectures VL1–VL8 that the exercises follow. |
| `app/` | **Quantum Simulators Lab**, a static web app (no build step). Open `app/index.html` through any static server. |
| `tools/` | Helper scripts (`make_artifact.py` builds the preview version of the app) and the tests of the workbook: `workbook_numbers.json` holds its reference numbers, `test_workbook.mjs` compares the page with them and tests every question, `check_workbook.cjs` drives the page in a browser. |

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
6. **Task 0** — the chain of N guides (default 20, J = 1): the eigenvalues as dots with the closed form
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
4. **SSH chain (tasks 1 and 2)** — alternating J₁, J₂, drawn as a chip seen from above with alternating gaps (J ∝ e^(−d/d₀)) and the light painted along z: the gap 2|J₁ − J₂|, the dimer symmetry of the two bands, and
   for 21 guides the E = 0 state on the odd guides at the end with the weak bond, decay length 1/|ln(J₁/J₂)|.

**Exercise 3** (`app/exercise3.html`): the SSH chain in k-space and its Zak phase, five acts.

0. **k-space (task 8a)** — unit cell, Bloch state, the two equations of one cell, H(k) = [[0, h*], [h, 0]] with
   h(k) = J₁ + J₂e^{ik}; bands ±|h(k)| next to the levels of the 20-guide chain.
1. **h(k)** — the circle with centre J₁ and radius J₂ in the complex plane; |h| is the band, φ = arg h the phase
   between guide A and guide B; winding number 0 or 1.
2. **Zak phase by hand** — u±(k) = (±e^{−iφ}, 1)/√2, A(k) = ½ dφ/dk, γ = ½[φ(2π) − φ(0)] = π·ν, built line by
   line; the area under A(k) grows to π or returns to 0.
3. **Zak phase numerically (task 8b)** — γ = −arg ∏⟨uₛ|uₛ₊₁⟩ on M points, unchanged by random phases of the
   eigenvectors; too few points give the wrong answer.
4. **Task 3** — on-site potential +Δ on A, −Δ on B: the edge state of 21 guides moves to exactly +Δ with unchanged
   shape, 20 guides give ±Δ at the two ends, and the Zak phase is no longer quantized.

**Workbook** (`app/workbook.html`): the student calculates the Zak phase, a Thouless pump and its Chern number.
One small question is on the screen at a time, with one picture. Every answer is checked at once; a wrong answer gets
a hint, and after two wrong tries the worked answer can be shown. Three parts:

1. **Zak phase** (ten questions) — h(k) = J₁ + J₂e^{ik} at k = 0, π/2, π, 3π/2 for J₁ = 1, J₂ = 2; how often h goes
   around the origin; γ is half of the total turn of the angle of h, so γ = π; then J₁ = 2, J₂ = 1 with γ = 0.
2. **Thouless pump** (seven questions) — the lattice of Jürgensen, Mukherjee, Jörg and Rechtsman, "Quantized
   fractional Thouless pumping of solitons", Nature Physics 19, 420 (2023): five waveguides per unit cell at
   x_n(z) = n·d + δ·cos(Ωz + 4πn/5 − 3π/10), d = 17.25 μm, δ = 1 μm, coupled by J(s) = 6.672 mm⁻¹ · e^{−0.2348 s/μm}.
   One position, one distance and one coupling by hand; the 5 × 5 matrix H(k) in the student's own code; the five
   bands during one period; the light of band 3, which moves by two unit cells in one period.
3. **Chern number** (seven questions) — the Zak phase of band 3 from the overlap formula in the student's code, at
   z = 0 and at a quarter period; its growth over the period gives C = 2; then C from the plaquettes of a 10 × 10
   grid; band 2 with C = −3; the sum over all five bands, 2 − 3 + 2 − 3 + 2 = 0.

For the questions with code the worked answer is a few lines in Python and in MATLAB (the MATLAB lines were run in
GNU Octave 8 only). Only the linear lattice is used; the solitons of the paper are named on the last card.

Conventions: +J as in the hands-on code (the paper writes −J; bands and Chern numbers are the same). H(k) has
J₁ … J₄ next to the diagonal, J₅e^{ik} bottom left and J₅e^{−ik} top right. Band b is the b-th eigenvalue.
γ = −arg ∏⟨uₛ|uₛ₊₁⟩ with the loop closed. Plaquette with the same −arg, walked
(k, Ωz) → (k, Ωz + d) → (k + d, Ωz + d) → (k + d, Ωz); C = sum/2π. The position of the light counts every waveguide
with the number of its unit cell. The model is in `app/js/workbook/aah.js`, the reference numbers, computed
independently with numpy, in `tools/workbook_numbers.json`.

**Hamiltonian builder** (`app/builder.html`): a free instrument instead of a guided exercise. A tight-binding
Hamiltonian is built by plugging couplings into a matrix, and its spectrum is shown at once.

- **Palette.** Four couplings J₁ … J₄ and two on-site energies ε₁, ε₂, each with its colour and a slider. A coupling
  can be complex, J = |J|·e^(iφ); the mirror entry then holds the complex conjugate.
- **Real space.** A click on entry (row i, column j) of the N × N matrix plugs the selected coupling in, a second
  click takes it out. In the mode "every unit cell" one click sets that bond along the whole chain, so only the
  first unit cell has to be filled in. In the mode "this entry only" it changes one entry and its mirror image: a
  defect. Two clicks on sites of the chain picture do the same. Shown at once: the eigenvalues against the bands of
  the infinite chain (states outside the bands in orange), the eigenvectors as a colour plot (column n is state n,
  as `numpy.linalg.eigh` returns them), and one eigenstate as bars above the chain.
- **k-space.** The same rules as the Bloch matrix H(k), one row and one column per site of the unit cell and one term
  per bond; an entry is filled by a click with a chosen factor e^(iks). Bands with the levels of the finite chain,
  the curve h(k) (or det h(k)) in the complex plane with its winding number when the model has chiral symmetry, and
  the Zak phase of every band.
- One to four sites per unit cell, 2 to 60 sites, open ends or a ring, eight starting points (uniform chain, SSH,
  SSH with a third-neighbour coupling and winding number 2, zigzag chain, Rice–Mele, trimer, Creutz ladder with
  complex couplings, SSH with a long-long defect), undo, and the matrix as a short numpy script.

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

The app is then at <https://alaaph.github.io/lecture_Quantum_Simulators/>, Exercise 2 at `/exercise2.html`, Exercise 3 at `/exercise3.html`, the
workbook at `/workbook.html`, the Hamiltonian builder at `/builder.html`, the geometry appendix at `/chapters.html`, and a QR code to project at `/share.html`.

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

`app/js/linalg.js` carries the eigensolvers (cyclic Jacobi, real symmetric and complex Hermitian), the SSH chain
builder and the integrators; `app/js/lecture1/continuum.js` the grid Schrödinger (paraxial Helmholtz) solver and the
Wannier projection; `app/js/builder/model.js` the model of the Hamiltonian builder (unit-cell rules, H(k), bands, Zak
phase, winding number), which has no browser code in it and runs in Node.
Quick checks from the repository root:

```bash
cd app/js && node --input-type=module -e "
import { symEig, sshChain } from './linalg.js';
console.log(symEig(sshChain(20, 1, 2)).values.filter(E => Math.abs(E) < 0.5)); // edge states ≈ ±1.5e-3
console.log(symEig(sshChain(21, 1, 2)).values.map(Math.abs).sort((a, b) => a - b)[0]); // exact zero mode
"
node --input-type=module -e "
import { preset, solve } from './builder/model.js';
const s = solve(preset('ssh3'));                      // SSH with a third-neighbour coupling
console.log(s.chiral.nu, s.inGap.filter(Boolean).length);      // winding number 2, four edge states
"
```

The workbook has its own tests. `tools/workbook_numbers.json` holds the numbers of the five-waveguide lattice; they
were computed with numpy in two independent ways and are not produced by the page.

```bash
node tools/test_workbook.mjs       # the model against the stored numbers, every question, the reader of typed numbers
node tools/check_workbook.cjs      # the page in headless Chromium (needs Playwright): every question, hints, phone width
```
