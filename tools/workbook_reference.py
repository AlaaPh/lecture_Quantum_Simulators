"""Reference numbers for the parts of the workbook that belong to Exercises 1 to 3.

Run from the repository root:   python3 tools/workbook_reference.py
It recomputes the numbers with numpy only, independently of the JavaScript of the page (other matrices, other
eigensolver, eigenvectors of H(k) from numpy instead of a closed form), and writes them into
tools/workbook_numbers.json under the key "exercises". tools/test_workbook.mjs compares the page with them.

Conventions: i dpsi/dz = H psi, +J next to the diagonal, waveguides numbered from 1, waveguide 1 is an A waveguide,
J1 couples 1-2, 3-4, ... and J2 couples 2-3, 4-5, ...; H(k) = [[D, conj(h)], [h, -D]] with h = J1 + J2 exp(ik).
"""
import json
import pathlib
import numpy as np

pi = np.pi
out = {}


def chain(N, J=1.0, eps=None):
    H = np.zeros((N, N))
    for n in range(N - 1):
        H[n, n + 1] = H[n + 1, n] = J
    if eps is not None:
        H += np.diag(eps)
    return H


def ssh(N, J1, J2, D=0.0):
    H = np.zeros((N, N))
    for n in range(N - 1):
        H[n, n + 1] = H[n + 1, n] = J1 if n % 2 == 0 else J2
    H += np.diag([D if n % 2 == 0 else -D for n in range(N)])
    return H


def evolve(H, psi0, z):
    E, V = np.linalg.eigh(H)
    return V @ (np.exp(-1j * E * z) * (V.conj().T @ psi0))


def one(N, start):
    p = np.zeros(N, complex)
    p[start - 1] = 1
    return p


# ---------- three waveguides ----------
H3 = chain(3)
E3, V3 = np.linalg.eigh(H3)
out['three_E'] = sorted(E3.tolist(), reverse=True)                       # sqrt2, 0, -sqrt2
out['three_weights_guide1'] = [float(V3[0, n] ** 2) for n in (2, 1, 0)]  # 0.25, 0.5, 0.25
out['three_z_cross'] = float(pi / np.sqrt(2))
out['three_I_at_z_cross'] = (abs(evolve(H3, one(3, 1), pi / np.sqrt(2))) ** 2).tolist()
out['three_I_z1'] = (abs(evolve(H3, one(3, 1), 1.0)) ** 2).tolist()
out['three_I_z3_mode1'] = (abs(evolve(H3, np.array([0.5, np.sqrt(0.5), 0.5], complex), 3.0)) ** 2).tolist()

# ---------- the chain of 20 waveguides (task 0) ----------
E20, V20 = np.linalg.eigh(chain(20))
out['chain20_lowest'] = float(E20[0])
out['chain20_highest'] = float(E20[-1])
out['chain19_lowest'] = float(np.linalg.eigvalsh(chain(19))[0])
out['chain21_lowest'] = float(np.linalg.eigvalsh(chain(21))[0])
ring = chain(20)
ring[0, 19] = ring[19, 0] = 1
out['ring20_lowest'] = float(np.linalg.eigvalsh(ring)[0])
out['chain20_formula'] = [float(2 * np.cos(n * pi / 21)) for n in range(1, 21)]
out['chain20_formula_matches'] = bool(np.allclose(sorted(out['chain20_formula']), E20, atol=1e-12))
top = V20[:, -1]
out['chain20_top_abs'] = np.abs(top).tolist()                           # |component| on waveguides 1 ... 20
out['chain20_top_same_sign'] = bool(np.all(top > 0) or np.all(top < 0))
low = V20[:, 0]
out['chain20_lowest_alternates'] = bool(np.all(low[:-1] * low[1:] < 0))
out['chain20_I10_z1'] = float(abs(evolve(chain(20), one(20, 10), 1.0)[9]) ** 2)
I4 = abs(evolve(chain(20), one(20, 10), 4.0)) ** 2
out['chain20_I_z4'] = I4.tolist()
out['chain2_E'] = np.linalg.eigvalsh(chain(2)).tolist()

# ---------- one Runge-Kutta step, i dpsi/dz = E psi, E = 1, dz = 1, psi(0) = 1 ----------
f = lambda p: -1j * p
p0, dz = 1 + 0j, 1.0
k1 = f(p0)
k2 = f(p0 + dz / 2 * k1)
k3 = f(p0 + dz / 2 * k2)
k4 = f(p0 + dz * k3)
p1 = p0 + dz / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
c = lambda z: [float(np.real(z)), float(np.imag(z))]
out.update(rk_k1=c(k1), rk_k2=c(k2), rk_k3=c(k3), rk_k4=c(k4), rk_sum=c(k1 + 2 * k2 + 2 * k3 + k4), rk_psi1=c(p1),
           rk_abs_psi1=float(abs(p1)), rk_euler=c(p0 + dz * k1), rk_abs_euler=float(abs(p0 + dz * k1)), rk_exact=c(np.exp(-1j)))
# the length of psi after one step with E*dz = x is |1 - ix - x^2/2 + ix^3/6 + x^4/24|
R = lambda x: abs(1 - 1j * x - x ** 2 / 2 + 1j * x ** 3 / 6 + x ** 4 / 24)
out['rk_abs_step_x01'] = float(R(0.1))
xs = np.linspace(0, 4, 400001)
out['rk_stability_limit'] = float(xs[np.where(R(xs) <= 1 + 1e-13)[0][-1]])   # 2 sqrt 2

# the chain of 41 waveguides, light in waveguide 21, 20 steps of dz = 0.1
H41 = chain(41)
g = lambda p: -1j * (H41 @ p)
p = one(41, 21)
e = one(41, 21)
for _ in range(20):
    a = g(p)
    b = g(p + 0.05 * a)
    cc = g(p + 0.05 * b)
    d = g(p + 0.1 * cc)
    p = p + 0.1 / 6 * (a + 2 * b + 2 * cc + d)
    e = e + 0.1 * g(e)
out['rk41_I21'] = float(abs(p[20]) ** 2)
out['rk41_norm'] = float(np.sum(abs(p) ** 2))
out['euler41_I21'] = float(abs(e[20]) ** 2)
out['euler41_norm'] = float(np.sum(abs(e) ** 2))
out['exact41_I21_z2'] = float(abs(evolve(H41, one(41, 21), 2.0)[20]) ** 2)
out['exact41_I21_z1'] = float(abs(evolve(H41, one(41, 21), 1.0)[20]) ** 2)

# ---------- a beam with the wavenumber k ----------
out['band_k_pi3'] = float(2 * np.cos(pi / 3))
out['velocity_k_pi2'] = float(-2 * np.sin(pi / 2))


def beam(N, j0, sigma, k):
    j = np.arange(1, N + 1)
    a = np.exp(-(j - j0) ** 2 / (2 * sigma ** 2)) * np.exp(1j * k * j)
    return a / np.linalg.norm(a)


centre = lambda psi: float(np.sum(np.arange(1, len(psi) + 1) * abs(psi) ** 2) / np.sum(abs(psi) ** 2))
b0 = beam(41, 26, 3.0, pi / 2)
out['beam_centre_z0'] = centre(b0)
out['beam_centre_z5'] = centre(evolve(H41, b0, 5.0))
F = 0.5
Hgrad = chain(41, eps=F * np.arange(1, 42))
g0 = beam(41, 16, 3.0, 0.0)
out['bloch_period'] = float(2 * pi / F)
out['bloch_width'] = float(4 / F)
out['bloch_centre_half'] = centre(evolve(Hgrad, g0, pi / F))
out['bloch_centre_full'] = centre(evolve(Hgrad, g0, 2 * pi / F))
out['bloch_centre_z25'] = centre(evolve(Hgrad, g0, 25.0))

# ---------- the SSH chain (tasks 1 and 2) ----------
Ea, Va = np.linalg.eigh(ssh(20, 2, 1))
out['ssh20_21_E'] = Ea.tolist()
out['ssh20_21_smallest_positive'] = float(Ea[Ea > 0].min())
out['ssh20_21_lowest_pair_product_negative'] = bool(Va[0, 0] * Va[1, 0] < 0)
out['ssh20_21_highest_pair_product_positive'] = bool(Va[0, -1] * Va[1, -1] > 0)
out['ssh20_21_all_lower_pairs_negative'] = bool(all(Va[2 * m, n] * Va[2 * m + 1, n] < 0 for n in range(10) for m in range(10)))
Eb, Vb = np.linalg.eigh(ssh(21, 2, 1))
out['ssh21_21_E'] = Eb.tolist()
z = Vb[:, 10]
out['ssh21_21_zero_vector_abs'] = np.abs(z).tolist()
out['ssh21_21_even_weight'] = float(np.sum(z[1::2] ** 2))
out['ssh21_21_ratio_3_1'] = float(z[2] / z[0])
Ec, Vc = np.linalg.eigh(ssh(21, 1, 2))
zc = Vc[:, 10]
out['ssh21_12_ratio_3_1'] = float(zc[2] / zc[0])
out['ssh21_12_mid'] = float(Ec[10])
out['ssh21_12_weight_guide1'] = float(zc[0] ** 2)
out['ssh21_21_weight_guide21'] = float(z[20] ** 2)
Ed = np.linalg.eigvalsh(ssh(20, 1, 2))
out['ssh20_12_E'] = Ed.tolist()
out['ssh20_12_smallest_positive'] = float(Ed[Ed > 0].min())
out['ssh_decay_length_cells'] = float(1 / abs(np.log(2.0)))

# ---------- the SSH chain in k-space ----------
Hk = lambda k, J1, J2, D=0.0: np.array([[D, J1 + J2 * np.exp(-1j * k)], [J1 + J2 * np.exp(1j * k), -D]])
out['kspace_abs_h_21'] = [float(abs(2 + np.exp(1j * k))) for k in (0, pi / 2, pi)]
out['kspace_lower_2pi3'] = float(np.linalg.eigvalsh(Hk(2 * pi / 3, 2, 1))[0])
ks = np.linspace(0, 2 * pi, 2001)
bandE = np.array([np.linalg.eigvalsh(Hk(k, 2, 1))[1] for k in ks])
out['kspace_band_21'] = [float(bandE.min()), float(bandE.max())]
out['kspace_task1_inside_bands'] = bool(np.all((abs(Ea) >= bandE.min() - 1e-9) & (abs(Ea) <= bandE.max() + 1e-9)))
out['kspace_task12_in_gap'] = int(np.sum(abs(Ed) < bandE.min() - 1e-9))


def zak(J1, J2, D, M, rng=None):
    us = []
    for s in range(M):
        u = np.linalg.eigh(Hk(2 * pi * s / M, J1, J2, D))[1][:, 0]
        if rng is not None:
            u = u * np.exp(2j * pi * rng.random())
        us.append(u)
    prod = 1
    for s in range(M):
        prod = prod * np.vdot(us[s], us[(s + 1) % M])
    return prod, float(-np.angle(prod))


u1 = np.linalg.eigh(Hk(0, 1, 2))[1][:, 0]
u2 = np.linalg.eigh(Hk(pi / 2, 1, 2))[1][:, 0]
out['zak_overlap_abs_0_pi2'] = float(abs(np.vdot(u1, u2)))
prod4, _ = zak(1, 2, 0, 4)
out['zak_product_M4'] = c(prod4)
out['zak_gamma_over_pi_M50_12'] = abs(zak(1, 2, 0, 50)[1]) / pi
out['zak_gamma_over_pi_M50_21'] = zak(2, 1, 0, 50)[1] / pi
rng = np.random.default_rng(3)
out['zak_gamma_over_pi_random_phases'] = abs(zak(1, 2, 0, 50, rng)[1]) / pi
out['zak_product_M3_abs'] = float(abs(zak(1, 2, 0, 3)[0]))               # 0: three points are too few here

# ---------- the on-site potential (task 3) ----------
D = 0.5
Eo, Vo = np.linalg.eigh(ssh(21, 2, 1, D))
out['onsite21_E'] = Eo.tolist()
out['onsite21_mid'] = float(Eo[10])
out['onsite21_overlap_with_zero_state'] = float(abs(Vo[:, 10] @ z))
out['onsite_band_pi'] = float(np.linalg.eigvalsh(Hk(pi, 2, 1, D))[1])
Ep = np.linalg.eigvalsh(ssh(20, 1, 2, D))
out['onsite20_12_closest'] = sorted(Ep[np.argsort(abs(Ep))[:2]].tolist())
out['onsite_gamma_over_pi_M400'] = zak(1, 2, D, 400)[1] / pi
out['onsite_gamma_over_pi_M50'] = zak(1, 2, D, 50)[1] / pi
out['onsite_gamma_over_pi_M400_21'] = zak(2, 1, D, 400)[1] / pi

path = pathlib.Path(__file__).with_name('workbook_numbers.json')
data = json.loads(path.read_text(encoding='utf-8'))
data['exercises'] = out
path.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
for key, value in out.items():
    print(key, '=', json.dumps(value)[:150])
