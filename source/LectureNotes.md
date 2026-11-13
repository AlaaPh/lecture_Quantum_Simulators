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
  (VL5 p30–32). VL6 p06 and VL5 p31 print it without the minus sign, VL8 p19 with −i: no effect on 0 or π.
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
