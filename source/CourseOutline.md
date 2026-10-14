# Course outline — Photonic computing & quantum simulation (JProf. Christina Jörg, RPTU)

Source: `CourseOutline.docx` and the VL1 slides `PhQsim_and_PhComp_VL1.pptx` (Google Drive, folder *Quantum simulators / Cj notes*).
Lecture (8 CP): Tue 10:15–11:45 and Thu 12:15–13:45, 46-387/388. Coding sessions (4 CP): Fridays, 56-368, supervised coding in the 90 min.
Slides on OLAT (course "Photonic Quantum Simulation and Computing", access code in the slides).

| Topic | Lecture (VL) | Exercise (Ü) |
|---|---|---|
| 0) Refresher: waves, Fourier transform, Schrödinger equation | VL1: plane waves, evanescent fields, Fourier transform; Schrödinger equation, second quantization | |
| I) Photonic quantum simulation | VL2: quantum simulation | **Ü1: Hilbert space, Task 1** |
| I.1) Waveguides as quantum simulators | VL2: Schrödinger → paraxial Helmholtz, coupling, fabrication; VL3: tight-binding, quantum walk, k-space, direction | |
| I.2) Artificial gauge fields | VL4: AGFs, Peierls substitution; quantum walk, Bloch oscillations | Ü2: Runge–Kutta, Task 2 |
| I.3.1) Topology in 1D: SSH | VL5: topology, SSH in real space, Berry phase, k-space; VL6: k-space and winding, plasmonic experiments, chiral symmetry | Ü3: Task 3 |
| I.3.2) Floquet theory | VL7: modulated SSH defect, Floquet, effective Hamiltonians | |
| I.3.3) Thouless pumping | VL8: Rice–Mele | Ü4: Tasks 4–6 |
| I.3.4) Topology in 2D | VL9: Harper–Hofstadter; VL10: Thouless → 2D, Bravais lattice, graphene + symmetries; VL11: Haldane + FTIs; VL12: FTIs | Ü5: Tasks 7–9; Ü6: Task 10 |
| I.3.5) Topology in 3D | VL13: Weyl points, HOTIs; VL14: repetition | Ü7: Task 11 |
| I.4)* Higher modes | VL15: higher modes, SSH?, AGFs, AB caging?, OHE? | |
| I.5)* Interactions | VL16: Kerr effect, solitons, dimer solitons, solitons in SSH, Thouless pumping, topological edge solitons | Ü8: leftover tasks / questions / lab tour |
| II.1) Optical correlators | VL17 | |
| II.2) Inverse design | VL18: inverse design, gradient descent | Ü9: leftover tasks / coding with agents |
| II.3.1) Photonic neural networks | VL19: NN basics | |
| II.3.2) MPLC and diffractive NNs | VL20: MPL + DNNs | Ü10: code a basic NN |
| II.3.3) WDM with micro-rings | VL20: WDM | |
| II.3.4) Integrated Mach–Zehnder interferometers | VL21: MZIs, Bloch sphere, Reck–Clements | |
| II.3.5) Photonic AI accelerators today | VL21: examples, companies | |
| II.3.6) Reservoir computing | VL22: reservoir computing, repetition | Ü11: design an MZI from waveguides |
| III.1) Photonic qubits | VL23: qubit encoding | |
| III.2) Quantum gates | VL23: logic gates, quantum gates | Ü12: gate with waveguides |
| III.3) Measurement-based QC: KLM | VL24: entanglement, KLM 1 (2-qubit gates, teleportation); VL25: KLM | |
| III.4)* Current technology | VL26: cluster states, fusion gates, squeezed light, GKP; VL27: revision; VL28: quiz | Ü13, Ü14: coding with agents |

\* if time allows

## VL1 slide content (condensed)

- Organisation, coding-session topics (Hamiltonians, eigenvalues in real and k-space, topology basics, RK time evolution, modulation, beam propagation, MZI and Bloch sphere, tiny NN, coding with agents).
- Why care: photonic computing and quantum simulation companies (Xanadu, PsiQuantum, Lightmatter, ...).
- **Computer versus simulator**: Gaudí's hanging-chain model of the Sagrada Família versus a finite-element calculation. A universal computer solves everything with effort; a simulator solves one class of problems very efficiently. Typical simulator problem: the ground state of a system.
- Refresher: Maxwell equations → wave equation; plane waves versus evanescent modes (exponential decay, no energy transport, important for waveguide coupling); impedance; field continuity at interfaces.
- Waves and wave packets: a complex field is intensity and phase; adding two waves gives beats; Fourier series and Fourier transform (Gaussian ↔ Gaussian, square ↔ sinc, ...); linearity, convolution, shift theorem, Wiener–Khinchin.
- Properties of quantum systems: wavefunction, superposition and entanglement, uncertainty, discreteness; Schrödinger equation; classical physics deterministic, quantum physics probabilistic; the exponential number of combinations is why quantum systems are hard to simulate; a quantum simulator is a machine that does the same things with the same probabilities.
- Why photonic quantum simulation: classical light is macroscopic, room temperature, the "wavefunction" (field amplitude) can be imaged directly. Platforms: waveguide arrays, fibre loops, coupled rings, photonic crystals, SLM optics, photon BECs, polaritons.
- Bibliography: Okamoto, *Fundamentals of optical waveguides*; Longhi, *Quantum-optical analogies using photonic structures*, LPR 3, 243 (2009); Szameit & Nolte, J. Phys. B 43, 163001 (2010).
- Waveguides as model systems: V number, single-mode condition, frustrated total internal reflection. Slowly varying envelope → **paraxial Helmholtz equation**, which has the form of the time-dependent Schrödinger equation with the propagation distance z as time and the refractive-index profile as the potential.
