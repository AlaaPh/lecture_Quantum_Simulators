# Lecture conventions, VL1–VL8 (condensed)

Extracted from the lecture slides of JProf. Christina Jörg (PhQsim_and_PhComp_VL1–VL8), the three papers in
"further reading" and the hands-on code. Only what the exercises in `app/` must agree with. Page numbers refer to
the slide PDFs. The slides themselves are on OLAT and are not part of this repository.

## Lectures

| slides | content |
|---|---|
| VL1 | organisation, computer versus simulator, waves and Fourier refresher, quantum basics, platforms |
| VL2 | paraxial Helmholtz equation as Schrödinger equation (z as time), two guides β₀ ± J, supermodes, coupling length |
| VL3 | coupler Ĥ = (0 J; J 0), fabrication, quantum walk, Fourier-space imaging, tight binding, Bloch oscillations in curved guides, Peierls substitution |
| VL4 | artificial gauge fields again, topology (quantum Hall, Chern, Berry), SSH in real space, Zak phase, H(k) |
| VL5 | same as VL4 with the SSH part completed: spectrum versus J₂/J₁, end state, terminations, bands E(k) |
| VL6 | d(k) circle and winding number, plasmonic SSH experiment, chiral symmetry, on-site term +Δσ_z |
| VL7 | defects (long-long, short-short), Floquet theorem, modulated defect, modulated chain, effective Hamiltonian |
| VL8 | (k, t) torus, Berry curvature, Chern number, Rice–Mele model, Thouless pumping, Wannier centre |

## Conventions on the slides

- **Evolution.** i ∂ψ/∂z = Hψ, ψ ∝ e^{−iEz}; z plays the role of time (VL2 p18, p27). The slides often write t.
- **Sign of the coupling.** The coupler is written with +J (VL3 p07–12). From the tight-binding part on, every
  Hamiltonian carries a minus sign: H = −J Σ â†â + h.c. (VL3 p38, VL4 p29, VL5 p25, VL7 p02, VL8 p23).
- **Energy versus β.** β is called "(negative) energy": the in-phase supermode has the largest β (VL2 p27–30).
- **Coupling length.** L_J = π/(2|J|) (VL2 p33, VL3 p13).
- **SSH.** Sites 1 = A, 2 = B; unit cell (A, B); J₁ inside the cell (drawn solid, short), J₂ between cells (dashed,
  long). Edge states for J₂ > J₁ (VL4 p28–35, VL5 p23–30, VL7 p04).
- **k-space.** âₙ = N^{−1/2} Σ_k â_k e^{−ikn}; H(k) = −(0, J₁ + J₂e^{−ik}; J₁ + J₂e^{ik}, 0) in the basis (a_k, b_k);
  E(k) = ±√(J₁² + J₂² + 2J₁J₂ cos k); band edges ±(J₁ + J₂) at k = 0, ±|J₁ − J₂| at k = π (VL5 p33–36).
- **Winding.** H(k) = −(J₁ + J₂cos k)σₓ − (J₂ sin k)σ_y; circle with centre J₁ and radius J₂; winding number 0 for
  J₂ < J₁, 1 for J₂ > J₁, ill-defined at J₂ = J₁ (VL6 p13–15).
- **Zak phase.** γ = i∮⟨ψ|∂_kψ⟩dk; discrete γ = −arg(⟨ψ₁|ψ₂⟩⟨ψ₂|ψ₃⟩…⟨ψ_N|ψ₁⟩), gauge invariant; values 0 and π
  (VL5 p30–32). VL6 p06 and VL5 p31 print it without the minus sign, VL8 p19 with −i: no effect on 0 or π, but
  with an on-site term and in the pump the sign matters (see "One rule for the signs" below).
- **Chiral symmetry.** Γ̂ĤΓ̂† = −Ĥ, Γ̂ = P̂_A − P̂_B; symmetric spectrum; E = 0 states live on one sublattice (VL6 p21–28).
- **On-site term.** +Δσ_z, +Δ on A and −Δ on B; "winding number not defined" (VL6 p31–33). Rice–Mele uses ±Δ/2
  (VL8 p27), so its smallest gap is Δ₀.
- **Floquet.** |Ψ(t)⟩ = e^{−iε t}|u(t)⟩, T = 2π/ω, H(t) = Σ_m e^{−imωt}H_m, quasi-energy modulo ω (VL7 p10–13).
  Lattice drive J₁ − v(t), J₂ + v(t), v = 2V_AC cos(Ωt), J₁,₂ = J₀ ± δ (VL7 p27). Defect drive
  J₂ + (ΔJ/2) sin(ωt) on the two couplings at the defect (VL7 p20).
- **Pumping.** Loop in the (J₁ − J₂, Δ) plane, starting at J₁ − J₂ > 0, Δ = 0, counter-clockwise: J₁ − J₂ ∝ cos(Ωt),
  Δ ∝ +sin(Ωt). Centre of mass Σ n·Iₙ/Σ Iₙ; Wannier centre = φ^Zak/2π unit cells; shift per cycle = winding of
  φ^Zak = Chern number (VL8 p22–35).
- **Bloch oscillations.** Produced with curved waveguides, ẍ₀ = const (VL3 p42–47, VL4 p08–13). No period or
  amplitude formula on the slides.

## One rule for the signs (Exercise 3, the workbook, task 9 of the task sheet)

Checked numerically (numpy and JavaScript, random phase on every eigenvector) and by propagation in real space.

- H(k) = [[Δ, h*], [h, −Δ]], h = J₁ + J₂e^{ik}, basis (A, B); lower band = smallest eigenvalue.
- Zak phase γ = −arg ∏⟨uₛ|uₛ₊₁⟩ = +i∮⟨u|∂_k u⟩dk modulo 2π. γ/2π is the position of the light of the band
  inside the unit cell (VL8 p32–33, written there with +i).
- With on-site term, lower band: γ = ½∮(dφ/dk)(1 − Δ/E₀)dk, E₀ = √(Δ² + |h|²), φ = arg h, as long as h(k) ≠ 0.
  Example J₁ = 1, J₂ = 2, Δ = 0.5: γ = 0.7079π. The upper band, +arg, e^{−ik} in h, or −Δ on A each give −0.7079π.
- Plaquette of the (k, t) grid: the same −arg, walked (k, t) → (k, t+dt) → (k+dk, t+dt) → (k+dk, t) → back.
  C = (sum of the plaquettes)/2π. The plaquettes between two times add up to the change of γ (modulo 2π).
  This equals +arg walked the other way round, which is the definition of VL8 p19 (A = −i⟨ψ|∇ψ⟩, k_x = k, k_y := t).
- Cycle of task 9 (J₁ − J₂ ∝ cos, Δ ∝ +sin), lower band: C = +1, γ rises by 2π, the light moves one unit cell
  (two waveguides) toward higher cell numbers. Upper band or reversed cycle: −1. −J instead of +J changes none of
  these numbers; only the lower-band pair becomes (A + B)/√2 instead of (A − B)/√2.
- The +i of VL5 p30–32 and VL8 p32–34 and the −i of VL8 p19 are consistent only together with the orientation
  above: the −i reverses the sign of A, the order (k, t) of the curl reverses it back.
- On-site term in the pump: VL8 p27 writes ±Δ/2, the task sheet "potential difference Δ", VL6 and Exercise 3 ±Δ.
  Exercise 3 uses +Δ on A and −Δ on B. C is the same for both readings; the shift at finite T is not.
- Rice–Mele pump of task 9: shift per cycle X(T), with X counted in unit cells from the cell where the light starts, Runge–Kutta with
  dt = 0.05, input (A − B)/√2 on one cell, δJ = 1, Δ₀ = 0.5: 0.8891 (T = 20, 40 cells), 0.9673 (T = 50, 60 cells),
  0.9989 (T = 100, 120 cells). Numbers of the task sheet (δJ = 0.5, Δ₀ = 0.2) with the same input: 0.55 at T = 20. Two
  reasons: the cycle is too fast, and (A − B)/√2 is not exactly the lower band at t = 0, because J₂ = 0.5 there and
  not 0. A slow cycle therefore ends near 0.95 (0.849 at T = 100, 0.949 at T = 200, 0.952 at T = 400), not at 1.
  The exact lower-band state of one cell (the Wannier state) reaches 1.
- Grid sizes: 4 × 4 is enough for the Rice–Mele pump (3 × 3 gives 0 for the numbers of the task sheet). Three k points give
  a zero overlap for J₁ = 1, J₂ = 2. Harper–Hofstadter at flux 1/4 has touching bands and needs the two-band form.

## Numbers of the workbook for Exercises 1 to 3

Computed with numpy by `tools/workbook_reference.py` and by the page (`app/js/workbook/lattice.js`); the test
`tools/test_workbook.mjs` compares the two. Conventions: i dψ/dz = Hψ, +J next to the diagonal, waveguides from 1.

- Three waveguides, J = 1: E = √2, 0, −√2. Light from waveguide 1: |ψ₃(z)|² = ¼(1 − cos √2 z)², all of it in
  waveguide 3 at z = π/√2 = 2.221.
- Chain of 20 waveguides: E_n = 2cos(nπ/21), lowest −1.97766. Light from waveguide 10: 0.0501 left at z = 1; at
  z = 4 the outer maxima are 6 to 7 waveguides away (J₆(8)² = 0.114, J₇(8)² = 0.103; the limit 2J·z is 8).
- One Runge–Kutta step, E = 1, dz = 1, ψ₀ = 1: k₁ = −i, k₂ = −0.5 − i, k₃ = −0.5 − 0.75i, k₄ = −0.75 − 0.5i,
  ψ₁ = 13/24 − (5/6)i, |ψ₁| = 0.99390 (exact e^{−i}); Euler |ψ| = √2. |ψ₁| ≤ 1 for |E|·dz ≤ 2√2.
  41 waveguides, light in 21, 20 steps of 0.1: |ψ₂₁|² = 0.157733 (exact 0.157728), sum 0.999994; Euler 0.3417, sum 1.54.
- Beam ψ_j ∝ e^{−(j−26)²/18}·e^{iπj/2} in 41 waveguides: centre 16.274 at z = 5 (−9.726 = −10·e^{−1/36}).
  With −J the beam moves the other way. Gradient F·j with F = 0.5, k₀ = 0, start at 16: period 4π = 12.566,
  centre 23.78 after half a period (4J/F = 8 for one wavenumber), 16.00 after one period.
- SSH, 20 waveguides, J₁ = 2, J₂ = 1: smallest positive eigenvalue 1.06665; lowest eigenvector antiphase in all
  10 pairs, highest in phase. 21 waveguides: eigenvalue 11 is 0, ψ₃/ψ₁ = −2, 75 % of the light in waveguide 21.
  J₁ = 1, J₂ = 2, 20 waveguides: ±0.0014649.
- k-space, J₁ = 2, J₂ = 1: |h| = 3, √5, 1 at k = 0, π/2, π; E(2π/3) = −√3.
- Zak phase by program, J₁ = 1, J₂ = 2: |⟨u(0)|u(π/2)⟩| = 0.85065, product of four overlaps −0.2, product for
  M = 50 is −0.891, M = 3 gives 0. γ = π; J₁ = 2, J₂ = 1: γ = 0. Usual mistakes: without the closing overlap the
  product of four k is −0.2 ∓ 0.1236i and γ(M = 50) = ±0.9867π (the sign depends on the phases the eigensolver
  returns); without the complex conjugate the product is +0.2 and γ = 0; with ⟨u_{s+1}|u_s⟩ the sign of γ flips.
- The two SSH chains (J₁, J₂) = (2, 1) and (1, 2) are the same lattice inside, shifted by one waveguide. They differ
  in where the chain is cut, that is which coupling lies inside the unit cells 1–2, 3–4, …; the Zak phase is the Zak
  phase of this unit cell. "Opposite signs inside a pair in the lower band" holds for the strongly coupled pairs,
  except next to a zero of the eigenvector (4 of 200 pairs for 20 waveguides with J₁ = 2, J₂ = 1). An edge state in
  an even chain of M pairs needs J_weak/J_strong < M/(M + 1).
- Chain of 20 waveguides, light from waveguide 10, z = 4: 4.3 % of the light is further than 2J·z = 8 waveguides.
  Highest eigenvector: |ψ₄| = 0.17384 (waveguides 3 and 5: 0.13390, 0.20991). Without the i in e^{−iEz} the value
  of |ψ₁₀|² at z = 1 is 5.197. Runge–Kutta with the plain mean of the four slopes gives 0.15816 in place of 0.15773.
- On-site term Δ = 0.5: 21 waveguides (2, 1): eigenvalue 11 is 0.5 with the unchanged eigenvector; band edge
  √1.25 = 1.11803; 20 waveguides (1, 2): ±0.5000021; γ = 0.70791π (M = 400; 0.70742π for M = 50) and 0.03699π.

## The lattice of the workbook (Thouless pump and Chern number)

Model of M. Jürgensen, S. Mukherjee, C. Jörg, M. C. Rechtsman, "Quantized fractional Thouless pumping of solitons",
Nature Physics 19, 420 (2023): off-diagonal Aubry–André–Harper model, five waveguides per unit cell, no on-site term.
All numbers below were computed with numpy in two independent ways and by the page (`tools/workbook_numbers.json`).

- Definition as in the paper: waveguide n at x_n(z) = n·d + δ·cos(Ωz + 4πn/5 − 6π/20), d = 17.25 μm, δ = 1 μm;
  coupling J(s)/mm⁻¹ = 6.672·exp(−234.8·s/mm) with s = x_{n+1} − x_n. The couplings lie between 0.074 and 0.182 mm⁻¹.
- The paper writes H with −J, the workbook with +J as the hands-on code. Bands and Chern numbers are the same for
  both signs: the chain has only nearest-neighbour couplings, so −H has the bands of H shifted by π in k.
- Chern numbers of the five bands, lowest first: 2, −3, 2, −3, 2 (as printed in the paper), with the sign rule of
  the section above: C = +2 means that the light moves two unit cells toward higher waveguide numbers per period.
- **The cosine form is the same model only for a weak modulation.** With J_n = K·(1 + δ·cos(Ωz + 4πn/5)) the gap
  between bands 1 and 2 (and between 4 and 5) closes at δ = 0.2016. Below it the Chern numbers are 2, −3, 2, −3, 2,
  with a gap of at most 0.0003·K; above it they are −3, 2, 2, 2, −3 (checked for δ = 0.1 to 0.95; δ = 0.5 by both
  independent computations). The exponential law of the experiment, J ∝ exp(0.447·cos(…)), has a first harmonic of
  0.44, but its second harmonic keeps 2, −3, 2, −3, 2. Band 3 has C = 2 and the two lowest bands together −1 in
  every case, so the fraction (C₁ + C₂)/2 = −1/2 of the paper does not depend on this.
- Gaps (smallest over k and z): 0.0060 mm⁻¹ between bands 1 and 2 and between 4 and 5, 0.102 mm⁻¹ on both sides of
  band 3. A linear pump in the lowest band would need a period far longer than any sample. The workbook therefore
  shows the pump with band 3, which also has C = 2.
- Pump of the workbook: the narrowest state that fills band 3 evenly (maximally localized Wannier state) at z = 0,
  centre at γ/2π = −0.49 unit cells, mostly on waveguide 5 of one cell and waveguide 2 of the next (0.42 each).
  Shift of the centre in one period: 1.950 unit cells for L = 100 mm, 1.934 for 200 mm, 2.001 for 400 mm. The light
  spreads meanwhile (rms width 1.7 unit cells after 100 mm), because the band is not flat: without the nonlinearity
  of the experiment there is no soliton.
- Zak phase of band 3 (M = 50): −0.984π at z = 0, 0.178π at a quarter period; it grows by 2·2π in one period.
- Plaquette grid: 6 × 6 already gives 2, −3, 2, −3, 2; 4 × 4 and 5 × 5 do not. The workbook uses 10 × 10.
- In the paper: a soliton that bifurcates from the lowest band moves two unit cells per period at low power
  (calculated, gP/J_max = 0.55). At higher power it follows the Wannier states of bands 1 and 2 together and moves
  one unit cell to the left in two periods, f = (2 − 3)/2 = −1/2 (calculated at gP/J_max = 1.65, measured at 2.15).
- Compared with the figures of the paper: Fig. 1b shows the five couplings between 0.075 and 0.18 mm⁻¹, as the
  formulas above give (0.074 to 0.182), and Fig. 1c the same five bands (band 3 between ±0.17 J_max, top of band 5 at
  1.36 J_max). The distances between neighbours are then 15.35 to 19.15 μm; the Methods of the paper say "between
  16.25 μm and 18.25 μm", which does not fit its own formula and figure. In Fig. 1b the largest coupling at Ωz = 0 is
  called J₄, here J₃: the paper counts the couplings one waveguide later (its J_n couples waveguides n − 1 and n).
  The lattice is the same.

## Where the app differs

- The app and the hands-on code use **+J** everywhere. Eigenvalues, bands, Zak phase and edge-state energies are
  the same. Only the dimer symmetry of the two SSH bands swaps: with −J the lower band is in phase on each J₁ pair.
- The app sweeps J₁ at J₂ = 1; the slides sweep J₂/J₁ at J₁ = 1.
- The slides show only even chains. The 20 versus 21 guides distinction comes from the task sheet.
- The slides' "end state only occupies the B sublattice" is drawn on a chain that starts with a lone B site. In the
  app's 21-guide chain the same state is on the odd guides, which are A.
- VL3 p02 and VL4 p02 link to `https://alaaph.github.io/lecture_Quantum_Simulators/#guides`. Keep that anchor.

## Slips on the slides

- VL6 p29–30 (and VL4 p33): Asbóth figure axis printed J₂/J₁; it is J₁/J₂ (corrected by hand on VL6 p10).
- VL6 p31 and VL8 p26: caption V_A = 0, V_B = 0.1; the plotted spectrum fits V_B = 0.2 with couplings 0.5 and 1.
- VL8 p17–18: zero mode and γ = π plotted where J₂ < J₁, opposite to the chain drawn on the slide.
- VL7 p29 calls J₁ > J₂ topological, for a chain that ends on a J₂ coupling.
- Peierls phase: exp(−ie∫A·dr) on VL3 p50, exp(i(q/ħc)∫A·dr) on VL4 p16.

## Hands-on code (`tight_binding.py`, `tight_binding.m`)

- H = β₀·1 + couplings with +j; j1 on (1-2), (3-4), …; j2 on (2-3), …; i dψ/dz = Hψ; bands
  β₀ ± √(j1² + j2² + 2 j1 j2 cos k).
- "Flip (j1, j2): edge modes migrate to the other boundary" holds only for odd N. For N = 100 they appear at both
  ends (j1 < j2) or at none.
- `tight_binding.m` starts with j1 = 0.9, j2 = 0.1 and an edge launch: the trivial phase, no trapping.
- `beam steering.txt`: with this H a phase gradient k₀ = +π/2 moves the beam toward lower site numbers,
  velocity −2j sin k₀.

## Further reading in the course folder

- R. Resta, J. Phys.: Condens. Matter 12, R107 (2000): Berry phase, discrete formula, Zak phase, polarization.
- K. Viebahn, "Introduction to Floquet theory" (ETH lecture notes, 2020): Floquet theorem, quasi-energy,
  high-frequency expansion, dynamic localisation J → J·J₀(F₀/ω).
- Lesko et al., arXiv:2407.17917 (2025): optical control of electrons in a Floquet topological insulator.
- Cited on the slides for the SSH part: Asbóth, Oroszlány, Pályi, Lecture Notes in Physics 919 (2016), arXiv:1509.02295.
