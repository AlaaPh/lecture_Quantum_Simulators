"""Zak phase, Thouless pump and Chern number: you calculate them yourself, one line at a time.

The idea. The overlap <u|v> = conj(u_A) v_A + conj(u_B) v_B of two eigenvectors is one complex number. arg is its
angle: the angle of a complex number in the complex plane. The computer gives every eigenvector an arbitrary phase
factor, so the angle of a single overlap means nothing. Around a closed loop every phase factor cancels:
Berry phase of the loop = -arg of the product of the overlaps = minus the angle of the product.
Loop once through all k from 0 to 2 pi: the Zak phase gamma. gamma/2pi is the position of the light of this band
inside the unit cell (one waveguide A and one waveguide B; short: guide). Pump: J1, J2, Delta go slowly through a
cycle of length T. Chern number C = how often gamma goes around in one cycle = unit cells the light moves per cycle.

Conventions. H(k) = [[Delta, conj(h)], [h, -Delta]], h(k) = J1 + J2 exp(ik), basis (A, B), +Delta on guide A.
Lower band = smallest eigenvalue. k_s = 2 pi (s-1)/M, s = 1 .. M. gamma = -arg(<u_1|u_2> <u_2|u_3> ... <u_M|u_1>).
Plaquette (one small square of a grid in k and t): the same -arg, walked (k, t) -> (k, next t) -> (next k, next t)
-> (next k, t) -> back. C = (sum of all plaquette phases)/2pi. Position of the light: X = sum over the cells m of
m (I_A,m + I_B,m). I_A,m is the light on guide A of cell m. Cell 0 is the cell where the light starts.

How to work: do a hand step of the worksheet (A1 to A5, B1, B4, B6) on paper before you do the same step here.
Then run this file. It stops at the first open step. Write the line marked TODO there. Run again.
For a hand step the file prints no number: check your own numbers on the page workbook.html.
A code step prints its numbers after OK: type them into the page with four decimals.
"""
import os
import sys

import numpy as np

# the folder of this file: the file zak_chern_check.py must be there, and the figures are saved there
FOLDER = os.path.dirname(os.path.abspath(__file__)) if "__file__" in globals() else os.getcwd()
sys.path.insert(0, FOLDER)
try:
    from zak_chern_check import check              # check(step, ...) tests your line and prints the result
except ImportError:
    sys.exit("The file zak_chern_check.py is missing. Put it into the folder of this file and run again.")

TODO = None        # every line that you write is marked TODO
FIGURES = True     # each figure is saved as a PNG file next to this file; the newest one opens when the run stops
LONG = False       # True: step B3 also runs the slow cycle T = 100 on 120 cells

pi = np.pi
try:                                               # figures need matplotlib; without it the file runs all the same
    import matplotlib.pyplot as plt
except Exception:
    plt = None
BLUE, ORANGE, AQUA, INK, PALE = "#257de0", "#f47230", "#00b894", "#191919", "#e7e7e7"


def save(name):                                    # given: stores the newest figure as zak_chern_<name>.png
    plt.savefig(os.path.join(FOLDER, "zak_chern_" + name + ".png"), dpi=130, bbox_inches="tight")
    print("         figure saved:", os.path.join(FOLDER, "zak_chern_" + name + ".png"))


# ====================================================================================================================
# Part A: Zak phase of the SSH chain (task 8)
# ====================================================================================================================

# A1. h(k) is the entry of H(k) that couples guide A to guide B. Its angle phi is the phase between A and B.
#     J1 couples A and B inside one unit cell, J2 couples B to the A of the next cell. Write h(k) = J1 + J2 exp(ik).
def h(k, J1, J2):
    return TODO                                                    # TODO A1


check("A1", h)


def H_k(k, J1, J2, Delta=0.0):                     # given: H(k) in the basis (A, B); +Delta on guide A, -Delta on B
    return np.array([[Delta, np.conj(h(k, J1, J2))], [h(k, J1, J2), -Delta]])


def k_points(M):                                   # given: k_s = 2 pi (s-1)/M. The point 2 pi is the point 0 again
    return 2 * pi * np.arange(M) / M


def u_hand(k, J1, J2):                             # given: the lower-band eigenvector that you use on paper (Delta = 0)
    return np.array([-np.exp(-1j * np.angle(h(k, J1, J2))), 1.0]) / np.sqrt(2)


# A2. The overlap <u|v> = conj(u_A) v_A + conj(u_B) v_B is one complex number. Its length says how alike the two
#     vectors are, its angle is the phase between them. Write it as the sum of conj(u_j) v_j over all entries j:
#     Part C has vectors with three entries. Without the complex conjugate no later step works.
def overlap(u, v):
    return TODO                                                    # TODO A2


check("A2", overlap)


# A3. Go around the closed loop u_1 -> u_2 -> ... -> u_M -> u_1 and multiply the overlaps. In this product every
#     arbitrary phase factor cancels. The loop below stops at u_M. Write the overlap that closes the loop.
def loop_product(us):
    p = 1.0
    for s in range(len(us) - 1):
        p = p * overlap(us[s], us[s + 1])                          # <u_1|u_2> <u_2|u_3> ... <u_(M-1)|u_M>
    return p * TODO                                                # TODO A3, first line


#     The Zak phase is minus the angle of this product. Write it. np.angle gives the angle of a complex number.
def zak(us):
    return TODO                                                    # TODO A3, second line


check("A3", loop_product, zak)

# A4 and A5: nothing to write. These two steps are hand steps of the worksheet. The check repeats them with your
#     overlap, loop_product and zak. It prints no numbers: check your own numbers on the page workbook.html.
us = [u_hand(k, 1, 2) for k in k_points(4)]
us[1] = 1j * us[1]                                 # A4: the second eigenvector is multiplied by i
check("A4", overlap(us[0], us[1]), overlap(us[1], us[2]), loop_product(us))
us = [u_hand(k, 2, 1) for k in k_points(4)]        # A5: the same four k points for J1 = 2, J2 = 1
check("A5", loop_product(us), zak(us))


# A6. Now the computer finds the eigenvectors. np.linalg.eigh returns the eigenvalues E in rising order and the
#     eigenvectors as the columns of V. Write the eigenvector that belongs to eigenvalue number `band`.
#     band = 0 is the smallest eigenvalue: the lower band.
def eigenvector(H, band=0):
    E, V = np.linalg.eigh(H)
    return TODO                                                    # TODO A6


check("A6", eigenvector)


def states(J1, J2, Delta, M, band=0):              # given: the eigenvector of one band at the M points k_s
    return [eigenvector(H_k(k, J1, J2, Delta), band) for k in k_points(M)]


# A7. Now with the on-site term: +Delta on guide A, -Delta on guide B. Then the Zak phase is no longer 0 or pi:
#     gamma/2pi tells where the light sits inside the unit cell. Write the Zak phase of the lower band on M points.
#     Use states and zak. This step tests the sign and the band. A3 to A6 cannot: without on-site term the Zak phase
#     is 0 or pi, and each of them is the same angle with the opposite sign.
def zak_ssh(J1, J2, Delta, M):
    return TODO                                                    # TODO A7


check("A7", zak_ssh)


# ====================================================================================================================
# Part B: the Thouless pump (task 9) and its Chern number
# ====================================================================================================================

def pump(s):                                       # given: the cycle. s = t/T goes from 0 to 1. Returns J1, J2, Delta
    return 1 + np.cos(2 * pi * s), 1 - np.cos(2 * pi * s), 0.5 * np.sin(2 * pi * s)


def pump_sheet(s):                                 # given: the cycle with the numbers of the task sheet
    return 1 + 0.5 * np.cos(2 * pi * s), 1 - 0.5 * np.cos(2 * pi * s), 0.2 * np.sin(2 * pi * s)


# B1 (task 9a). H(k) has the eigenvalues +E and -E with E = sqrt(Delta^2 + |h|^2): the upper and the lower band.
#     Write E. The gap between the bands is 2E. The pump needs a gap that never closes during the cycle.
def band_energy(k, J1, J2, Delta):
    return TODO                                                    # TODO B1


check("B1", band_energy)
k_grid, s_grid = np.linspace(0, 2 * pi, 201), np.linspace(0, 1, 201)


def smallest_gap(cycle):                           # given: the smallest gap on a grid in k and t, and where it is
    E = np.array([[band_energy(k, *cycle(s)) for s in s_grid] for k in k_grid])
    i, j = np.unravel_index(E.argmin(), E.shape)
    return 2 * E[i, j], k_grid[i], s_grid[j]


check("B1", smallest_gap(pump), smallest_gap(pump_sheet))
if FIGURES and not plt:
    print("         No figures: Python cannot load matplotlib (is it installed?). All steps run without figures.")
if FIGURES and plt:                                # figure (given): the two bands over k and t/T
    E = np.array([[band_energy(k, *pump(s)) for s in s_grid[::5]] for k in k_grid[::5]])
    K, S = np.meshgrid(k_grid[::5] / pi, s_grid[::5], indexing="ij")
    ax = plt.figure(figsize=(6.4, 4.8)).add_subplot(projection="3d")
    ax.plot_surface(K, S, E, color=ORANGE, alpha=0.9, linewidth=0)
    ax.plot_surface(K, S, -E, color=BLUE, alpha=0.9, linewidth=0)
    ax.set_xlabel("k / pi"), ax.set_ylabel("t / T"), ax.set_zlabel("E")
    ax.set_title("B1: upper band (orange) and lower band (blue)")
    save("B1")


# B2 (task 9b). An open chain of N unit cells. Cell m (m = 0 .. N-1) has its guide A at index 2m and its guide B
#     at index 2m + 1. The couplings are given. Write the on-site term of cell m: +Delta on A, -Delta on B.
#     Then look at the eigenvalues: the open chain can have states that live at its two ends, inside the gap
#     (edge states).
def H_chain(N, J1, J2, Delta):
    H = np.zeros((2 * N, 2 * N))
    for m in range(N):
        H[2 * m, 2 * m + 1] = H[2 * m + 1, 2 * m] = J1             # A and B of cell m
        if m < N - 1:
            H[2 * m + 1, 2 * m + 2] = H[2 * m + 2, 2 * m + 1] = J2     # B of cell m and A of cell m + 1
        TODO                                                       # TODO B2: the two diagonal entries of cell m
    return H


check("B2", H_chain)
E, V = np.linalg.eigh(H_chain(40, *pump(3 / 8)))                   # 40 cells at t = 3T/8: 80 eigenvalues, rising
E_half = np.linalg.eigvalsh(H_chain(40, *pump(1 / 2)))             # the same at t = T/2
check("B2", E[39:41], V[:, 39:41], E_half[39:41])                  # the two in the middle lie in the gap
if FIGURES and plt:                                # figure (given): all eigenvalues of the open chain over t/T
    ss = np.linspace(0, 1, 161)
    plt.figure(figsize=(6.4, 4.4))
    plt.plot(ss, [np.linalg.eigvalsh(H_chain(40, *pump(s))) for s in ss], ".", color=INK, markersize=1.5)
    plt.xlabel("t / T"), plt.ylabel("eigenvalues"), plt.title("B2: all eigenvalues of the open chain of 40 cells")
    save("B2")


def start(N, amplitudes=(1, -1)):                  # given: the input state. Light on the cell in the middle of N cells.
    psi = np.zeros(2 * N, dtype=complex)           # (1, -1) is (A - B)/sqrt(2): the lower band of the cycle pump
    psi[N], psi[N + 1] = amplitudes                # at t = 0. Cell N/2 has its guide A at index N, its guide B at N + 1
    return psi / np.linalg.norm(psi)


# B3 (task 9c). i dpsi/dt = H(t) psi, solved in Runge-Kutta steps of length dt. H changes during one step:
#     the four slopes k1 .. k4 need H at the start of the step, in the middle (twice) and at the end.
#     Write these three matrices. H(t) is defined inside the function: the matrix of the chain at the time t.
def propagate(psi, T, dt=0.05, cycle=pump):
    """One cycle of length T. Returns the state at the end and the position X of the light after every step."""
    N = len(psi) // 2
    cell = np.repeat(np.arange(N), 2) - N // 2     # cell number m of every guide; the light starts in cell m = 0
    H = lambda t: H_chain(N, *cycle(t / T))
    X = [np.sum(cell * np.abs(psi) ** 2)]
    for n in range(int(round(T / dt))):
        t = n * dt
        H1, H2, H3 = TODO, TODO, TODO                              # TODO B3
        k1 = -1j * H1 @ psi
        k2 = -1j * H2 @ (psi + dt / 2 * k1)
        k3 = -1j * H2 @ (psi + dt / 2 * k2)
        k4 = -1j * H3 @ (psi + dt * k3)
        psi = psi + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        X.append(np.sum(cell * np.abs(psi) ** 2))
    return psi, np.array(X)


check("B3", propagate)
psi, X20 = propagate(start(40), T=20)              # given: X(0) = 0, so the last X is the shift per cycle in unit cells
check("B3", "T = 20", X20, psi)
psi, X50 = propagate(start(60), T=50)
check("B3", "T = 50", X50, psi)
psi, X_guide = propagate(start(60, (1, 0)), T=50)                  # all light on one guide A
check("B3", "one guide, T = 50", X_guide, psi)
psi, X_sheet = propagate(start(60), T=20, cycle=pump_sheet)
check("B3", "task sheet, T = 20", X_sheet, psi)
X_slow = X50                                       # the slowest cycle that was run; B5 compares it with gamma
if LONG:
    psi, X_slow = propagate(start(120), T=100)
    check("B3", "T = 100", X_slow, psi)
if FIGURES and plt:                                # figure (given): the position of the light during one cycle
    plt.figure(figsize=(6.4, 4.4))
    plt.plot(np.linspace(0, 1, len(X20)), X20, color=BLUE, linewidth=2, label="T = 20")
    plt.plot(np.linspace(0, 1, len(X50)), X50, color=ORANGE, linewidth=2, label="T = 50")
    plt.plot(np.linspace(0, 1, len(X_guide)), X_guide, color=AQUA, linewidth=2, label="one guide, T = 50")
    if LONG:
        plt.plot(np.linspace(0, 1, len(X_slow)), X_slow, color=INK, linewidth=2, label="T = 100")
    plt.xlabel("t / T"), plt.ylabel("X (unit cells)"), plt.title("B3: position of the light")
    plt.legend(frameon=False), plt.grid(color=PALE)
    save("B3")


# B4. The Zak phase at one time of the cycle. cycle(s) gives J1, J2, Delta at the time s = t/T.
#     Write the Zak phase at this time on M points. Use zak_ssh. Compare gamma/2pi with the position X of B3.
def zak_pump(s, M, cycle=pump):
    J1, J2, Delta = cycle(s)
    return TODO                                                    # TODO B4


check("B4", zak_pump)

# B5. gamma at 17 times of one cycle. np.angle gives angles between -pi and pi, so these raw values jump by 2 pi.
#     One rule: from one time to the next, take the change that lies between -pi and pi. np.unwrap does exactly this.
#     Write gamma without jumps, then C = (gamma at the end - gamma at the start)/2pi. Do not round C.
s_list = np.arange(17) / 16
gamma_raw = np.array([zak_pump(s, 400) for s in s_list])
gamma = TODO                                                       # TODO B5, first line
C = TODO                                                           # TODO B5, second line
check("B5", gamma_raw, gamma, C, X_slow)
if FIGURES and plt:                                # figure (given): gamma/2pi on top of the position X of B3
    plt.figure(figsize=(6.4, 4.4))
    plt.plot(np.linspace(0, 1, len(X_slow)), X_slow, color=BLUE, linewidth=2, label="X(t) of B3, slowest cycle")
    plt.plot(s_list, gamma / (2 * pi), "o", color=ORANGE, markersize=6, label="gamma(t) / 2pi")
    plt.xlabel("t / T"), plt.ylabel("unit cells"), plt.title("B5: the light follows the Zak phase")
    plt.legend(frameon=False), plt.grid(color=PALE)
    save("B5")


# B6. Cut the (k, t) plane into small squares: plaquettes. The Berry phase of one plaquette with the corners
#     a -> b -> c -> d -> a is minus the angle of the product of the four overlaps around it. Write it.
def plaquette(a, b, c, d):
    return TODO                                                    # TODO B6


check("B6", plaquette)


def grid(N, cycle=pump, band=0):                   # given: U[i][j] = eigenvector at k_i = 2 pi i/N and t_j = j T/N
    return [[eigenvector(H_k(2 * pi * i / N, *cycle(j / N)), band) for j in range(N)] for i in range(N)]


def plaquettes(U):                                 # given: F[i, j] = plaquette that starts at the point (k_i, t_j):
    N = len(U)                                     # (i, j) -> (i, j+1) -> (i+1, j+1) -> (i+1, j) -> back to (i, j).
    F = np.zeros((N, N))                           # Point N is point 0 again (% N): the grid closes in k and in t.
    for i in range(N):
        for j in range(N):
            F[i, j] = plaquette(U[i][j], U[i][(j + 1) % N], U[(i + 1) % N][(j + 1) % N], U[(i + 1) % N][j])
    return F


# B7. Inner edges are walked once in each direction and drop out. So the plaquette phases between two times add up to
#     the change of gamma, up to a multiple of 2 pi. On a fine grid every plaquette phase is small and nothing is left
#     over: all plaquette phases together give gamma(T) - gamma(0), without the rule of B5.
#     Write the Chern number: the sum of all plaquette phases, divided by 2 pi. Do not round it.
def chern(U):
    return TODO                                                    # TODO B7


check("B7", chern)
F = plaquettes(grid(4))                            # row i: k interval, column j: t interval
check("B7", F, chern(grid(4)), chern(grid(24)))
if FIGURES and plt:                                # figure (given): the 16 plaquette phases and the sum of each column
    from matplotlib.colors import LinearSegmentedColormap
    top = np.abs(F).max() / pi
    plt.figure(figsize=(6.4, 4.8))
    plt.imshow(F / pi, origin="lower", vmin=-top, vmax=top, extent=(0, 1, 0, 2), aspect="auto",
               cmap=LinearSegmentedColormap.from_list("two_sided", [BLUE, "#efefef", "#dc3c3d"]))
    for j in range(4):
        plt.text((j + 0.5) / 4, 2.03, "sum %.4f" % (F[:, j].sum() / pi), ha="center", va="bottom", color=INK)
        for i in range(4):
            plt.text((j + 0.5) / 4, (i + 0.5) / 2, "%.4f" % (F[i, j] / pi), ha="center", va="center", color=INK)
    plt.xlabel("t / T"), plt.ylabel("k / pi"), plt.colorbar(label="F / pi")
    plt.title("B7: plaquette phases F / pi, and the sum of each t column", pad=24)
    save("B7")


def pump_back(s):                                  # given: the cycle run backwards, Delta -> -Delta
    return 1 + np.cos(2 * pi * s), 1 - np.cos(2 * pi * s), -0.5 * np.sin(2 * pi * s)


def pump_aside(s):                                 # given: one more cycle
    return 2.5 + 0.5 * np.cos(2 * pi * s), 1 - 0.5 * np.cos(2 * pi * s), 0.2 * np.sin(2 * pi * s)


if FIGURES and plt:                                # figure (given): the cycles in the plane (J1 - J2, Delta)
    plt.figure(figsize=(6.4, 4.4))
    for cycle, color, style in ((pump, BLUE, "solid"), (pump_sheet, ORANGE, "dashed"), (pump_aside, AQUA, "dotted")):
        J1, J2, Delta = cycle(np.linspace(0, 1, 201))
        plt.plot(J1 - J2, Delta, color=color, linestyle=style, linewidth=2, label="%s (%s)" % (cycle.__name__, style))
        plt.annotate("", xy=(J1[26] - J2[26], Delta[26]), xytext=(J1[22] - J2[22], Delta[22]),
                     arrowprops=dict(arrowstyle="-|>", color=color, mutation_scale=22))
    plt.plot(0, 0, "x", color=INK, markersize=9)
    plt.annotate("(0, 0)", (0, 0), textcoords="offset points", xytext=(8, -16), color=INK)
    plt.xlabel("J1 - J2"), plt.ylabel("Delta"), plt.xlim(-2.3, 4.6), plt.grid(color=PALE)
    plt.legend(frameon=False, loc="upper right")
    plt.title("B8: the cycles. pump_back is pump with the arrow reversed")
    save("B8")

# B8. Predict first, then calculate. Look at each cycle in the plane (J1 - J2, Delta): does it go around the point
#     (0, 0), and which way round? Type the Chern number that you expect, an integer. (b), (c), (d): the lower band.
predicted = [TODO,         # TODO B8 (a): upper band of pump (solid cycle)
             TODO,         # TODO B8 (b): pump_back (solid cycle backwards)
             TODO,         # TODO B8 (c): pump_aside (dotted cycle)
             TODO]         # TODO B8 (d): pump_sheet with the numbers of the task sheet (dashed cycle)
N = 8                                              # grid points in k and in t
grids = [grid(N, pump, band=1), grid(N, pump_back), grid(N, pump_aside), grid(N, pump_sheet)]
check("B8", predicted, [chern(U) for U in grids], grids)


# ====================================================================================================================
# Part C: 2D lattices. The same functions, with k_y in place of the time t.
# ====================================================================================================================

def grid_2d(H, N, band=0, **more):                 # given: U[i][j] = eigenvector of H(x_i, y_j, **more),
    return [[eigenvector(H(2 * pi * i / N, 2 * pi * j / N, **more), band) for j in range(N)]     # x_i = 2 pi i/N,
            for i in range(N)]                                                                   # y_j = 2 pi j/N


def H_hofstadter(kappa, ky):                       # given: Harper-Hofstadter lattice, flux 1/3, three sites per cell.
    H = np.zeros((3, 3), dtype=complex)            # kappa = 3 k_x. Only the link that leaves the cell has a phase.
    for j in range(3):
        H[j, j] = 2 * np.cos(ky + 2 * pi * j / 3)
    H[0, 1] = H[1, 0] = H[1, 2] = H[2, 1] = 1.0
    H[2, 0], H[0, 2] = np.exp(1j * kappa), np.exp(-1j * kappa)
    return H


# C1. Three bands, so three Chern numbers. The grid has 6 x 6 points in kappa and k_y.
#     Write the Chern number of each band: chern of grid_2d(H_hofstadter, 6, band).
C_hofstadter = [TODO, TODO, TODO]                                  # TODO C1: band = 0, 1, 2
check("C1", C_hofstadter, np.allclose(H_hofstadter(2 * pi, 0.3), H_hofstadter(0, 0.3)))


def H_haldane(k1, k2, m=0.0, t1=1.0, t2=0.1, phi=pi / 2):          # given: Haldane model. k1, k2 = k times the two
    f = t1 * (1 + np.exp(-1j * k1) + np.exp(-1j * k2))             # lattice vectors. On-site term +m on A, -m on B.
    s = np.sin(k1) + np.sin(k2 - k1) - np.sin(k2)
    c = np.cos(k1) + np.cos(k2 - k1) + np.cos(k2)
    return np.array([[m + 2 * t2 * (np.cos(phi) * c + np.sin(phi) * s), f],
                     [np.conj(f), -m + 2 * t2 * (np.cos(phi) * c - np.sin(phi) * s)]])


# C2. Lower band of the Haldane model on a 6 x 6 grid. grid_2d hands extra arguments on to H, for example
#     grid_2d(H_haldane, 6, m=0.6). Write the Chern number for m = 0, for m = 0.6, and for m = 0 with phi = -pi/2.
C_haldane = [TODO, TODO, TODO]                                     # TODO C2
check("C2", C_haldane)

check("end")
