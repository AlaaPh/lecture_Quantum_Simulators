"""Checks for zak_chern.py. Keep this file in the same folder. You do not have to read it or change it.

check(label, ...) tests one step of zak_chern.py.
  Right:  it prints "A2 OK" and the result of the step. You can type these numbers into the web page:
          a complex number is printed as "Re Im", an angle in units of pi or in degrees, as stated in the line.
  Open or wrong:  it prints "A2: not yet." and one hint, and the run stops at this step.
Every function is tested first on fixed vectors, then with two sets of random phase factors on all vectors.
Angles count modulo 2 pi: -pi and pi are the same angle.
"""
import os
import sys
import traceback
import warnings

import numpy as np

PI = np.pi
TAU = 2 * np.pi

# The expected numbers of all steps. They are a copy of tools/zak_chern_numbers.json.
# BEGIN NUMBERS
NUMBERS = {'A': {'set1': {'J1': 1.0,
                'J2': 2.0,
                'k_over_pi': [0, 0.5, 1, 1.5],
                'h': [[3.0, 0.0], [1.0, 2.0], [-1.0, 0.0], [1.0, -2.0]],
                'phi_deg': [0.0, 63.434949, 180.0, -63.434949],
                'E': [-3.0, -2.236068, -1.0, -2.236068],
                'uA': [[-0.707107, 0.0], [-0.316228, 0.632456], [0.707107, 0.0], [-0.316228, -0.632456]],
                'uB': 0.707107,
                'winding': 1,
                'ov': [[0.723607, -0.447214], [0.276393, -0.447214], [0.276393, -0.447214], [0.723607, -0.447214]],
                'ov_len': [0.850651, 0.525731, 0.525731, 0.850651],
                'ov_angle_deg': [31.717474, 58.282526, 58.282526, 31.717474],
                'prod': [-0.2, -0.0],
                'prod_len': 0.2,
                'angle_sum_deg': 180.0,
                'gamma_over_pi': 1.0,
                'open_prod': [-0.2, -0.123607],
                'A4': {'ov12': [0.447214, 0.723607], 'ov23': [-0.447214, -0.276393], 'prod': [-0.2, -0.0]},
                'prod_M100': [-0.94404, 0.0],
                'gamma_M100_over_pi': 1.0},
       'set2': {'J1': 2.0,
                'J2': 1.0,
                'k_over_pi': [0, 0.5, 1, 1.5],
                'h': [[3.0, 0.0], [2.0, 1.0], [1.0, 0.0], [2.0, -1.0]],
                'phi_deg': [0.0, 26.565051, 0.0, -26.565051],
                'E': [-3.0, -2.236068, -1.0, -2.236068],
                'uA': [[-0.707107, 0.0], [-0.632456, 0.316228], [-0.707107, 0.0], [-0.632456, -0.316228]],
                'uB': 0.707107,
                'winding': 0,
                'ov': [[0.947214, -0.223607], [0.947214, 0.223607], [0.947214, 0.223607], [0.947214, -0.223607]],
                'ov_len': [0.973249, 0.973249, 0.973249, 0.973249],
                'ov_angle_deg': [13.282526, -13.282526, -13.282526, 13.282526],
                'prod': [0.897214, 0.0],
                'prod_len': 0.897214,
                'angle_sum_deg': 0.0,
                'gamma_over_pi': 0.0,
                'open_prod': [0.897214, 0.211803],
                'A4': {'ov12': [0.223607, 0.947214], 'ov23': [0.223607, -0.947214], 'prod': [0.897214, 0.0]},
                'prod_M100': [0.991814, 0.0],
                'gamma_M100_over_pi': 0.0},
       'A7': {'exact': {'J1': 0,
                        'J2': 4,
                        'D': 3,
                        'gamma_over_pi': 0.4,
                        'gamma_over_pi_M4': 0.311917,
                        'weight_A': 0.2,
                        'weight_B': 0.8},
              'set1': {'D': 0.5,
                       'M4_over_pi': 0.606656,
                       'M100_over_pi': 0.707794,
                       'M400_over_pi': 0.707911,
                       'limit_over_pi': 0.707918,
                       'upper_band_M400_over_pi': -0.707911},
              'set2': {'D': 0.5,
                       'M4_over_pi': 0.021892,
                       'M100_over_pi': 0.03696,
                       'M400_over_pi': 0.036989,
                       'limit_over_pi': 0.036991,
                       'upper_band_M400_over_pi': -0.036989}}},
 'B': {'hand': {'dJ': 1.0, 'D0': 0.5},
       'sheet': {'dJ': 0.5, 'D0': 0.2},
       'B1': {'E': {'t0': [2.0, 2.0, 2.0], 'tq': [2.061553, 1.5, 0.5], 'th': [2.0, 2.0, 2.0]},
              'gap_min': 1.0,
              'gap_min_sheet': 0.4,
              'gap_min_at': 'k = pi, t = T/4 and 3T/4'},
       'B2': {'cells': 40,
              't0125': {'Delta': 0.353553, 'ingap': []},
              't03': {'Delta': 0.475528,
                      'ingap': [{'E': -0.475528, 'end': 'right', 'weight_A': 0.0},
                                {'E': 0.475528, 'end': 'left', 'weight_A': 1.0}]},
              't0375': {'Delta': 0.353553,
                        'ingap': [{'E': -0.353553, 'end': 'right', 'weight_A': 0.0},
                                  {'E': 0.353553, 'end': 'left', 'weight_A': 1.0}]},
              't05': {'Delta': 0.0,
                      'ingap': [{'E': -0.0, 'end': 'right', 'weight_A': 0.0},
                                {'E': 0.0, 'end': 'left', 'weight_A': 1.0}]},
              't0625': {'Delta': -0.353553,
                        'ingap': [{'E': -0.353553, 'end': 'left', 'weight_A': 1.0},
                                  {'E': 0.353553, 'end': 'right', 'weight_A': 0.0}]},
              'sheet_t0375': [{'E': -0.141421, 'end': 'right', 'weight_A': 0.0},
                              {'E': 0.141421, 'end': 'left', 'weight_A': 1.0}]},
       'B3': {'input': '(A - B)/sqrt(2) on one cell in the middle',
              'dt': 0.05,
              'shift': {'T20': 0.889112, 'T50': 0.967335, 'T100': 0.99894},
              'cells': {'T20': 40, 'T50': 60, 'T100': 120},
              'norm_T20': 0.999997,
              'norm_T50': 0.999991,
              'norm_T100': 0.999983,
              'X_over_cycle_T100': [0.0, -4.8e-05, 0.001163, 0.016586, 0.138684, 0.322209, 0.396974, 0.447549,
                                    0.497165, 0.547785, 0.601089, 0.682146, 0.852926, 0.981537, 0.997066, 0.997833,
                                    0.997893],
              'one_guide_T50': 0.080361,
              'sheet_T20_pair': 0.552642},
       'B4': {'t0': {'ov': [1.0, 0.0], 'prod': [1.0, 0.0], 'gamma_over_pi': 0.0},
              'thalf': {'ov': [0.5, -0.5], 'prod': [-0.25, -0.0], 'gamma_over_pi': 1.0}},
       'B5': {'t_over_T': [0.0, 0.0625, 0.125, 0.1875, 0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.6875, 0.75,
                           0.8125, 0.875, 0.9375, 1.0],
              'gamma_raw_over_pi': [0.0, 7.7e-05, 0.002949, 0.03385, 0.281487, 0.639298, 0.792975, 0.900916, 1.0,
                                    -0.900916, -0.792975, -0.639298, -0.281487, -0.03385, -0.002949, -7.7e-05, 0.0],
              'gamma_unwrapped_over_pi': [0.0, 7.7e-05, 0.002949, 0.03385, 0.281487, 0.639298, 0.792975, 0.900916,
                                          1.0, 1.099084, 1.207025, 1.360702, 1.718513, 1.96615, 1.997051, 1.999923,
                                          2.0],
              'C': 1,
              'quarter_M4_over_pi': 0.174261,
              'quarter_M400_over_pi': 0.281487,
              'threequarter_M400_over_pi_raw': -0.281487,
              'sheet_quarter_M400_over_pi': 0.382759,
              'C_without_unwrap': 0.0},
       'B6': {'u_kpi2_tq': [[-0.408248, 0.408248], [0.816497, 0.0]],
              'u_kpi2_tq_times_sqrt6': [[-1.0, 1.0], [2.0, 0.0]],
              'E_kpi2_tq': -1.5,
              'u_kpi_tq': [[0.0, 0.0], [1.0, 0.0]],
              'u_t0': [[-0.707107, 0.0], [0.707107, 0.0]],
              'ov': [[0.866025, -0.288675], [0.816497, 0.0], [0.707107, 0.0], [1.0, 0.0]],
              'prod': [0.5, -0.166667],
              'F_over_pi': 0.102416},
       'B7': {'F_over_pi': [[-0.015286, 0.060453, 0.060453, -0.015286], [0.102416, 0.352416, 0.352416, 0.102416],
                            [0.102416, 0.352416, 0.352416, 0.102416], [-0.015286, 0.060453, 0.060453, -0.015286]],
              'rows': 'k interval [k_i, k_i+1], i = 0..3',
              'cols': 't interval [t_j, t_j+1], j = 0..3',
              'col_sums_over_pi': [0.174261, 0.825739, 0.825739, 0.174261],
              'total_over_pi': 2.0,
              'C': 1,
              'C_24': 1,
              'C_sheet_4': 1,
              'C_sheet_3_wrong': 0},
       'B8': {'upper_band': -1,
              'reversed_cycle': -1,
              'not_enclosing': 0,
              'sheet': 1,
              'not_enclosing_params': 'J1 = 2.5 + 0.5 cos, J2 = 1 - 0.5 cos, Delta = 0.2 sin'}},
 'C': {'C1': {'flux': '1/3',
              'grid': 6,
              'chern_lower_to_upper': [-1, 2, -1],
              'abs': [1, 2, 1],
              'matrix': 'H[j][j] = 2 cos(ky + 2 pi j/3); H[0][1] = H[1][2] = 1 (and transposed); H[2][0] = exp(i '
                        'kappa), H[0][2] = exp(-i kappa)'},
       'C2': {'t1': 1,
              't2': 0.1,
              'phiH_over_pi': 0.5,
              'boundary': 0.519615,
              'onsite_at_K': {'m0': 0.519615, 'm06': 1.119615},
              'onsite_at_Kprime': {'m0': -0.519615, 'm06': 0.080385},
              'K': [2.094395, 4.18879],
              'Kprime': [4.18879, 2.094395],
              'C_m0': -1,
              'C_m06': 0,
              'C_m0_phi_negative': 1,
              'grid': 6}}}
# END NUMBERS

HINT = {
    1: "Overlap of (1, i)/sqrt(2) with itself is not 1 -> the complex conjugate is missing (np.vdot).",
    2: "The loop over the four hand vectors gives -0.2 - 0.12i -> the loop is not closed.",
    3: "H u is not E u -> row taken instead of column.",
    4: "E > 0 -> upper band (Python: eig instead of eigh).",
    5: "The result changes when the random phases change -> a phase does not cancel: conjugate, closing overlap.",
    6: "A7 gives -0.7079 pi -> one of: +arg; upper band; exp(-ik) in h; -Delta on A.",
    7: "B5 gives 0 -> no unwrap.",
    8: "B7 gives 0 -> arg of the total product instead of the sum of the args; or both bands added.",
    9: "Task 9 on a 3 x 3 grid gives 0; three k points give a zero overlap for J1 = 1, J2 = 2 "
       "-> use 4 points or more, an even number.",
    10: "0 and pi swapped -> the unit cell holds the J2 pair.",
    "11 norm": "B3: the norm leaves 1 -> step too large, or H not symmetric.",
    "11 back": "B3: the light moves to lower cell numbers -> the input is the upper band "
               "(with -J the lower band is (A + B)/sqrt(2)).",
    "11 still": "B3: the light hardly moves -> one guide alone as input.",
}

_FILE = ["zak_chern.py"]
_PAD = " " * 9


# ---------------------------------------------------------------- printing

def _fmt(x, digits=4):
    """A real number with a fixed number of decimals. Zero is never printed as -0.0000."""
    text = "%.*f" % (digits, float(x))
    return text[1:] if text.startswith("-") and float(text) == 0 else text


def _fc(z, digits=4):
    """A complex number as "Re Im"."""
    z = complex(z)
    return _fmt(z.real, digits) + " " + _fmt(z.imag, digits)


def _fv(u):
    """A vector with complex entries as "(0.6, 0.8i)"."""
    def entry(z):
        z = complex(z)
        if abs(z.imag) < 5e-5:
            return "%.4g" % z.real
        if abs(z.real) < 5e-5:
            return "%.4gi" % z.imag
        return "%.4g%+.4gi" % (z.real, z.imag)
    return "(" + ", ".join(entry(z) for z in u) + ")"


def _row(values, digits=4):
    return " ".join(_fmt(v, digits) for v in values)


def _in_pi(gamma):
    """An angle in units of pi, between -1 and 1. The angle -pi is printed as 1: it is the same angle as pi."""
    x = (float(gamma) / PI + 1) % 2 - 1
    return _fmt(1.0 if abs(x + 1) < 5e-5 else x)


def _in_degrees(angle):
    """An angle in degrees with two decimals, between -180 and 180. -180 is printed as 180."""
    x = (np.degrees(float(angle)) + 180) % 360 - 180
    return _fmt(180.0 if abs(x + 180) < 5e-3 else x, 2)


def _describe(value):
    if value is None:
        return "nothing (None)"
    try:
        array = np.asarray(value)
        if array.dtype != object and array.ndim > 0:
            return "an array of shape %s" % (array.shape,)
    except Exception:
        pass
    text = repr(value)
    return text if len(text) < 60 else text[:57] + "..."


def _ok(label, *lines):
    print("%-8s %s" % (label + " OK", lines[0]))
    for line in lines[1:]:
        print(_PAD + line)
    sys.stdout.flush()


def _show_figures(newest_only):
    """Opens the figures that zak_chern.py has drawn (if matplotlib is there)."""
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return
    try:
        numbers = plt.get_fignums()
        if not numbers:
            return
        if newest_only:
            for number in numbers[:-1]:
                plt.close(number)
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            plt.show()
    except Exception:
        pass


def _stop(label, what, hint):
    print("%s: not yet. %s" % (label, what))
    print(_PAD + "Hint: " + hint)
    print(_PAD + "The run stops here. Correct step %s in %s and run the file again." % (label, _FILE[0]))
    sys.stdout.flush()
    _show_figures(newest_only=True)
    sys.exit(0)


# ---------------------------------------------------------------- reading what the student gives

def _open(label, todo):
    _stop(label, "This step is open.", todo)


def _is_open(function):
    """True if the body of the function still contains the word TODO."""
    code = getattr(function, "__code__", None)
    return code is not None and "TODO" in code.co_names


def _changed(label, what="The given lines of this step were changed."):
    _stop(label, what, "Restore the given lines of step %s. Change only the lines marked TODO." % label)


def _need(label, g, name):
    function = g.get(name)
    if not callable(function):
        _changed(label, "The function %s is missing in %s." % (name, _FILE[0]))
    return function


def _call(label, todo, function, *args):
    """Calls a function of the student. An open TODO or a Python error stops the run with a message."""
    if not callable(function):
        _changed(label)
    if _is_open(function):
        _open(label, todo)
    try:
        out = function(*args)
    except Exception as error:
        place = ""
        for frame in traceback.extract_tb(error.__traceback__):
            if os.path.basename(frame.filename) == _FILE[0]:
                place = " in line %d of %s" % (frame.lineno, _FILE[0])
        _stop(label, "Python stopped%s: %s: %s" % (place, type(error).__name__, error), todo)
    if out is None:
        _open(label, todo)
    return out


def _complex(label, todo, name, value):
    """One finite complex number."""
    number = None
    try:
        array = np.asarray(value)
        if array.size == 1 and array.dtype != object:
            number = complex(array.reshape(-1)[0])
    except Exception:
        number = None
    if number is None or not (np.isfinite(number.real) and np.isfinite(number.imag)):
        if value is None:
            _open(label, todo)
        _stop(label, "%s must be one number. You give %s." % (name, _describe(value)), todo)
    return number


def _real(label, todo, name, value):
    """One finite real number."""
    number = _complex(label, todo, name, value)
    if abs(number.imag) > 1e-9:
        _stop(label, "%s must be a real number. You give the complex number %s (Re Im)." % (name, _fc(number)), todo)
    return number.real


def _array(label, todo, name, value, shape, real=False):
    """An array of finite numbers with the given shape."""
    array = None
    try:
        array = np.asarray(value)
        if array.dtype == object:
            array = None
        else:
            array = array.astype(complex)
    except Exception:
        array = None
    if array is None or array.shape != tuple(shape) or not np.all(np.isfinite(array)):
        if value is None:
            _open(label, todo)
        _stop(label, "%s must be an array of finite numbers with shape %s. You give %s."
              % (name, tuple(shape), _describe(value)), todo)
    if real:
        if np.max(np.abs(array.imag)) > 1e-9:
            _stop(label, "%s must be real numbers. You give complex numbers." % name, todo)
        return array.real
    return array


def _close(a, b, tol=1e-9):
    return bool(np.all(np.abs(np.asarray(a) - np.asarray(b)) < tol))


def _same_angle(a, b, tol=1e-5):
    """Two angles are the same if they differ by a multiple of 2 pi."""
    return bool(np.all(np.abs(np.exp(1j * np.asarray(a)) - np.exp(1j * np.asarray(b))) < tol))


# ---------------------------------------------------------------- fixed vectors and reference formulas

_KS4 = [0.0, PI / 2, PI, 3 * PI / 2]
_E4 = [1, 1j, -1, -1j]                                   # exp(ik) at these four k, exact
_QUARTERS = [(2.0, 0.0, 0.0), (1.0, 1.0, 0.5), (0.0, 2.0, 0.0), (1.0, 1.0, -0.5)]   # J1, J2, Delta at t = 0, T/4, T/2, 3T/4


def _u_fixed(h, D=0.0):
    """Lower-band eigenvector of [[D, conj(h)], [h, -D]], with a real B component that is not negative."""
    a = abs(h)
    if a < 1e-13:
        return np.array([0, 1], complex) if D > 0 else np.array([-1, 0], complex)
    c = D / np.hypot(D, a)
    return np.array([-np.sqrt((1 - c) / 2) * np.conj(h) / a, np.sqrt((1 + c) / 2)])


_HAND1 = [_u_fixed(1 + 2 * e) for e in _E4]                                         # J1 = 1, J2 = 2
_HAND2 = [_u_fixed(2 + e) for e in _E4]                                             # J1 = 2, J2 = 1
_HAND_A7 = [_u_fixed(4 * e, 3.0) for e in _E4]                                      # J1 = 0, J2 = 4, Delta = 3
_GRID = [[_u_fixed(J1 + J2 * e, D) for (J1, J2, D) in _QUARTERS] for e in _E4]      # _GRID[i][j]: k_i, t_j
_FREE = [np.array([0.6, 0.8j]), np.array([1 + 2j, 2]) / 3, np.array([0.8, -0.6], complex), np.array([2 - 1j, 2j]) / 3]


def _hk(k, J1, J2, D=0.0):
    h = J1 + J2 * np.exp(1j * k)
    return np.array([[D, np.conj(h)], [h, -D]])


def _loop(us):
    p = 1.0 + 0j
    for s in range(len(us)):
        p *= np.vdot(us[s], us[(s + 1) % len(us)])
    return p


def _plaquette(a, b, c, d):
    return -np.angle(np.vdot(a, b) * np.vdot(b, c) * np.vdot(c, d) * np.vdot(d, a))


def _pump(s):
    return 1 + np.cos(TAU * s), 1 - np.cos(TAU * s), 0.5 * np.sin(TAU * s)


def _chain(N, J1, J2, D):
    H = np.zeros((2 * N, 2 * N))
    for m in range(N):
        H[2 * m, 2 * m], H[2 * m + 1, 2 * m + 1] = D, -D
        H[2 * m, 2 * m + 1] = H[2 * m + 1, 2 * m] = J1
        if m < N - 1:
            H[2 * m + 1, 2 * m + 2] = H[2 * m + 2, 2 * m + 1] = J2
    return H


def _runge_kutta(psi, T, dt, at):
    """One cycle with Runge-Kutta steps. at = the three times of H inside one step, in units of dt."""
    N = len(psi) // 2
    H = lambda t: _chain(N, *_pump(t / T))
    for n in range(int(round(T / dt))):
        t = n * dt
        H1, H2, H3 = H(t + at[0] * dt), H(t + at[1] * dt), H(t + at[2] * dt)
        k1 = -1j * H1 @ psi
        k2 = -1j * H2 @ (psi + dt / 2 * k1)
        k3 = -1j * H2 @ (psi + dt / 2 * k2)
        k4 = -1j * H3 @ (psi + dt * k3)
        psi = psi + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
    return psi


def _phases(vectors, seed):
    """The same vectors, each one multiplied by a random phase factor."""
    rng = np.random.default_rng(seed)
    return [u * np.exp(1j * rng.uniform(0, TAU)) for u in vectors]


def _phases_grid(U, seed):
    rng = np.random.default_rng(seed)
    return [[u * np.exp(1j * rng.uniform(0, TAU)) for u in row] for row in U]


# ---------------------------------------------------------------- Part A

def _A1(label, g, h):
    todo = "Write h(k) = J1 + J2 exp(ik). In Python the imaginary unit is 1j, the exponential function is np.exp."
    got = [_complex(label, todo, "h(k, J1, J2)", _call(label, todo, h, k, J1, J2))
           for (J1, J2) in ((1.0, 2.0), (2.0, 1.0)) for k in _KS4]
    want = [1 + 2 * e for e in _E4] + [2 + e for e in _E4]
    if not _close(got, want):
        n = [abs(a - b) < 1e-9 for a, b in zip(got, want)].index(False)
        seen = "For J1 = %s, J2 = %s and k = %s your h is %s (Re Im)." % (
            ("1", "2", "2", "1")[n // 4 * 2], ("1", "2", "2", "1")[n // 4 * 2 + 1],
            ("0", "pi/2", "pi", "3 pi/2")[n % 4], _fc(got[n]))
        if _close(got, np.conj(want)):
            _stop(label, seen + " The imaginary part has the wrong sign.", "exp(-ik) in h. The exponent is +ik.")
        if _close(got, want[4:] + want[:4]):
            _stop(label, seen + " J1 and J2 are exchanged: J1 has no factor, J2 has the factor exp(ik).", HINT[10])
        _stop(label, seen + " Calculate this number by hand and compare.", todo)
    numbers = NUMBERS["A"]["set1"]
    lines = ["J1 = 1, J2 = 2. Columns: k/pi, h (Re Im), phi in degrees, E = -|h|, u_A (Re Im), is H u = E u?"]
    for s in range(4):
        hs = got[s]
        u = np.array([-np.exp(-1j * np.angle(hs)), 1.0]) / np.sqrt(2)
        H = np.array([[0, np.conj(hs)], [hs, 0]])
        fine = (_close(H @ u, -abs(hs) * u) and abs(-abs(hs) - numbers["E"][s]) < 2e-6
                and abs(u[0] - complex(*numbers["uA"][s])) < 2e-6)
        lines.append("%-5s %-16s %8s   %-9s %-16s %s" % (("0", "0.5", "1", "1.5")[s], _fc(hs), _in_degrees(np.angle(hs)),
                                                        _fmt(-abs(hs)), _fc(u[0]), "yes" if fine else "no"))
    _ok(label, *lines)


def _A2(label, g, overlap):
    todo = ("Write <u|v> = conj(u_A) v_A + conj(u_B) v_B: one complex number. "
            "np.conj gives the complex conjugate; np.vdot(u, v) does all of it.")
    w = np.array([1, 1j]) / np.sqrt(2)
    self_overlap = _complex(label, todo, "overlap(u, v)", _call(label, todo, overlap, w, w))
    if abs(self_overlap - 1) > 1e-9:
        seen = "The overlap of (1, i)/sqrt(2) with itself is %s (Re Im), not 1." % _fc(self_overlap)
        _stop(label, seen, HINT[1] if abs(self_overlap) < 1e-9 else todo)
    for u, v in ((np.array([1, 0j]), np.array([1j, 0])), (_FREE[0], _FREE[1]), (_FREE[1], _FREE[3])):
        got = _complex(label, todo, "overlap(u, v)", _call(label, todo, overlap, u, v))
        want = np.vdot(u, v)
        if abs(got - want) > 1e-9:
            seen = "For u = %s and v = %s your overlap is %s (Re Im)." % (_fv(u), _fv(v), _fc(got))
            if abs(got - np.conj(want)) < 1e-9:
                _stop(label, seen + " This is <v|u>, the complex conjugate of <u|v>.",
                      "The complex conjugate belongs on the first vector u, not on v.")
            if abs(got - np.sum(u * v)) < 1e-9:
                _stop(label, seen + " The complex conjugate is missing.", HINT[1])
            _stop(label, seen + " Calculate conj(u_A) v_A + conj(u_B) v_B by hand and compare.", todo)
    numbers = NUMBERS["A"]["set1"]
    lines = ["overlaps of the four hand vectors, J1 = 1, J2 = 2. Columns: value (Re Im), length, -arg in degrees"]
    for s in range(4):
        got = _complex(label, todo, "overlap(u, v)", _call(label, todo, overlap, _HAND1[s], _HAND1[(s + 1) % 4]))
        if abs(got - complex(*numbers["ov"][s])) > 2e-6:
            _stop(label, "The overlap <u%d|u%d> of the hand vectors is %s (Re Im). Compare with your paper."
                  % (s + 1, (s + 1) % 4 + 1, _fc(got)), todo)
        lines.append("<u%d|u%d> = %-16s %s   %s" % (s + 1, (s + 1) % 4 + 1, _fc(got), _fmt(abs(got)),
                                                   _in_degrees(-np.angle(got))))
    _ok(label, *lines)


def _A3(label, g, loop_product, zak):
    todo1 = ("Write the first line marked TODO A3, in loop_product: the overlap that closes the loop, <u_M|u_1>. "
             "The last vector is us[-1], the first is us[0].")
    todo2 = ("Write the second line marked TODO A3, in zak: gamma = -(angle of loop_product(us)). "
             "np.angle gives the angle of a complex number.")
    numbers = NUMBERS["A"]
    product = _complex(label, todo1, "loop_product(us)", _call(label, todo1, loop_product, _HAND1))
    shaken = [_complex(label, todo1, "loop_product(us)", _call(label, todo1, loop_product, _phases(_HAND1, seed)))
              for seed in (1, 2)]
    seen = "The product over the four hand vectors (J1 = 1, J2 = 2) is %s (Re Im)." % _fc(product)
    if abs(product - _loop(_HAND1)) > 1e-9 or not _close(shaken, product):
        if abs(product - np.prod([np.vdot(_HAND1[s], _HAND1[s + 1]) for s in range(3)])) < 1e-9:
            _stop(label, seen, HINT[2])
        if not _close(shaken, product):
            _stop(label, seen + " With random phase factors on the vectors it is %s and %s."
                  % (_fc(shaken[0]), _fc(shaken[1])), HINT[5])
        _stop(label, seen + " It is not the product of the four overlaps of A2.", todo1)
    second = _complex(label, todo1, "loop_product(us)", _call(label, todo1, loop_product, _HAND2))
    if abs(product - complex(*numbers["set1"]["prod"])) > 2e-6 or abs(second - complex(*numbers["set2"]["prod"])) > 2e-6:
        _stop(label, seen + " It is not the product of the four overlaps of A2.", todo1)
    gamma = _real(label, todo2, "zak(us)", _call(label, todo2, zak, _HAND1))
    gamma2 = _real(label, todo2, "zak(us)", _call(label, todo2, zak, _HAND2))
    shaken = [_real(label, todo2, "zak(us)", _call(label, todo2, zak, _phases(_HAND1, seed))) for seed in (1, 2)]
    seen = "For the four hand vectors (J1 = 1, J2 = 2) your zak gives %s pi." % _fmt(gamma / PI)
    if not _same_angle(shaken, gamma):
        _stop(label, seen + " With random phase factors on the vectors it gives %s pi and %s pi."
              % (_fmt(shaken[0] / PI), _fmt(shaken[1] / PI)), HINT[5])
    if not (_same_angle(gamma, PI * numbers["set1"]["gamma_over_pi"])
            and _same_angle(gamma2, PI * numbers["set2"]["gamma_over_pi"])):
        if abs(abs(gamma) - 180) < 1e-6:
            _stop(label, seen + " This is an angle in degrees.", "Keep the angle in radians, as np.angle gives it.")
        if _same_angle(gamma, -np.angle(np.prod([np.vdot(_HAND1[s], _HAND1[s + 1]) for s in range(3)]))):
            _stop(label, seen, HINT[2])
        _stop(label, seen + " This is not minus the angle of the product %s (Re Im)." % _fc(product), todo2)
    _ok(label, "J1 = 1, J2 = 2, four k points: product = %s    gamma/pi = %s    (-pi and pi are the same angle)"
        % (_fc(product), _in_pi(gamma)))


def _A4(label, g, first, second, product):
    numbers = NUMBERS["A"]["set1"]["A4"]
    got = [_complex(label, "", "A value of A4", value) for value in (first, second, product)]
    if not _close(got, [complex(*numbers[key]) for key in ("ov12", "ov23", "prod")], 2e-6):
        _changed(label)
    _ok(label, "u2 multiplied by i: <u1|u2> = %s    <u2|u3> = %s    product = %s, as before"
        % (_fc(got[0]), _fc(got[1]), _fc(got[2])))


def _A5(label, g, product, gamma):
    numbers = NUMBERS["A"]["set2"]
    product = _complex(label, "", "The product of A5", product)
    gamma = _real(label, "", "The Zak phase of A5", gamma)
    overlap = _need(label, g, "overlap")
    angles = [-np.angle(_complex(label, "", "overlap(u, v)", _call(label, "", overlap, _HAND2[s], _HAND2[(s + 1) % 4])))
              for s in range(4)]
    if (abs(product - complex(*numbers["prod"])) > 2e-6 or not _same_angle(gamma, PI * numbers["gamma_over_pi"])
            or not _close(np.degrees(angles), numbers["ov_angle_deg"], 2e-5)):
        _changed(label)
    _ok(label, "J1 = 2, J2 = 1: -arg of the four overlaps in degrees = %s    product = %s    gamma/pi = %s"
        % (" ".join(_in_degrees(a) for a in angles), _fc(product), _in_pi(gamma)))


def _energy(H, u):
    """E = <u|H|u>/<u|u> and the length of H u - E u."""
    E = (np.vdot(u, H @ u) / np.vdot(u, u)).real
    return E, np.linalg.norm(H @ u - E * u) / np.linalg.norm(u)


def _A6(label, g, eigenvector):
    todo = ("Return the eigenvector that belongs to eigenvalue number `band`. "
            "The eigenvalues E are in rising order; the eigenvectors are the columns of V.")
    matrices = [_hk(k, 1.0, 2.0) for k in _KS4] + [_hk(0.7, 1.0, 2.0, 0.5), _hk(2.1, 2.0, 1.0, -0.3)]
    energies = []
    for band in (0, 1):
        for H in matrices:
            u = _array(label, todo, "eigenvector(H)", _call(label, todo, eigenvector, H, band), (2,))
            if np.linalg.norm(u) < 1e-9:
                _stop(label, "eigenvector(H) is the zero vector.", todo)
            E, miss = _energy(H, u)
            if miss > 1e-8:
                V = np.linalg.eigh(H)[1]
                is_row = any(_close(u, V[n, :]) for n in range(2))
                _stop(label, "H u is not E u for your vector u = (%s, %s)." % (_fc(u[0]), _fc(u[1])),
                      HINT[3] if is_row else todo)
            if band == 0 and E > 0:
                _stop(label, "The eigenvalue of your vector is E = %s. The lower band has E < 0." % _fmt(E), HINT[4])
            if band == 1 and E < 0:
                _stop(label, "With band = 1 your function returns the lower band again (E = %s)." % _fmt(E),
                      "Use the argument band to choose the eigenvector.")
            energies.append(E)
    loop_product, zak, overlap = (_need(label, g, name) for name in ("loop_product", "zak", "overlap"))
    numbers = NUMBERS["A"]["set1"]
    us = [_call(label, todo, eigenvector, H) for H in matrices[:4]]
    product = _complex(label, todo, "loop_product(us)", _call(label, todo, loop_product, us))
    first = [_complex(label, todo, "overlap(u, v)", _call(label, todo, overlap, us[0], us[1]))]
    shaken = []
    for seed in (1, 2):
        vs = _phases(us, seed)
        first.append(_complex(label, todo, "overlap(u, v)", _call(label, todo, overlap, vs[0], vs[1])))
        shaken.append(_complex(label, todo, "loop_product(us)", _call(label, todo, loop_product, vs)))
    us100 = [_call(label, todo, eigenvector, _hk(TAU * s / 100, 1.0, 2.0)) for s in range(100)]
    product100 = _complex(label, todo, "loop_product(us)", _call(label, todo, loop_product, us100))
    gamma100 = _real(label, todo, "zak(us)", _call(label, todo, zak, us100))
    if not _close(shaken, product):
        _stop(label, "The product changes with random phase factors: %s, %s, %s (Re Im)."
              % (_fc(product), _fc(shaken[0]), _fc(shaken[1])), HINT[5])
    if (abs(product - complex(*numbers["prod"])) > 2e-6 or abs(product100 - complex(*numbers["prod_M100"])) > 2e-6
            or not _same_angle(gamma100, PI * numbers["gamma_M100_over_pi"])):
        _stop(label, "With your eigenvectors the product over four k points is %s (Re Im). "
              "It must be the product of A3." % _fc(product), todo)
    _ok(label,
        "eigenvalue of your vector at k = 0, pi/2, pi, 3pi/2 (J1 = 1, J2 = 2): %s" % _row(energies[:4]),
        "M = 4: product = %s, the same as by hand" % _fc(product),
        "random phase factor on every eigenvector: <u1|u2> = %s, then %s, then %s" % tuple(_fc(z) for z in first),
        "                                          product = %s, then %s, then %s"
        % (_fc(product), _fc(shaken[0]), _fc(shaken[1])),
        "M = 100: product = %s    gamma/pi = %s" % (_fc(product100), _in_pi(gamma100)))


def _why_wrong_sign(g):
    """Looks in the functions of the student for the cause of a Zak phase with the wrong sign."""
    found = []

    def test(name, text, bad):
        try:
            if name in g and not _is_open(g[name]) and bad(g[name]):
                found.append(text)
        except Exception:
            pass

    test("h", "exp(-ik) in h", lambda h: abs(h(PI / 2, 1.0, 2.0) - (1 - 2j)) < 1e-9)
    test("H_k", "-Delta on A in H_k", lambda H_k: abs(H_k(0.3, 1.0, 2.0, 0.5)[0, 0] + 0.5) < 1e-9)
    test("eigenvector", "upper band in eigenvector",
         lambda eigenvector: _energy(_hk(0.7, 1.0, 2.0, 0.5), eigenvector(_hk(0.7, 1.0, 2.0, 0.5)))[0] > 0)
    test("overlap", "the complex conjugate is on v in overlap",
         lambda overlap: abs(overlap(np.array([1, 0j]), np.array([1j, 0])) + 1j) < 1e-9)
    if not found:
        test("zak", "+arg in zak (or in loop_product)",
             lambda zak: _same_angle(zak(_HAND_A7), np.angle(_loop(_HAND_A7))))
    return found


def _A7(label, g, zak_ssh):
    todo = "Write the Zak phase of the lower band on M points: zak of states(J1, J2, Delta, M)."
    numbers = NUMBERS["A"]["A7"]
    cases = [((0.0, 4.0, 3.0, 400), numbers["exact"]["gamma_over_pi"]),
             ((1.0, 2.0, 0.5, 4), numbers["set1"]["M4_over_pi"]),
             ((1.0, 2.0, 0.5, 100), numbers["set1"]["M100_over_pi"]),
             ((1.0, 2.0, 0.5, 400), numbers["set1"]["M400_over_pi"]),
             ((2.0, 1.0, 0.5, 400), numbers["set2"]["M400_over_pi"]),
             ((1.0, 2.0, 0.0, 100), NUMBERS["A"]["set1"]["gamma_M100_over_pi"]),
             ((2.0, 1.0, 0.0, 100), NUMBERS["A"]["set2"]["gamma_M100_over_pi"])]
    got = [_real(label, todo, "zak_ssh(J1, J2, Delta, M)", _call(label, todo, zak_ssh, *args)) for args, _ in cases]
    want = [PI * x for _, x in cases]
    tol = [1e-4] + [1e-5] * 6           # the first number is the limit of many points; M = 400 is 0.00001 pi away
    if not _same_angle(got, want, tol):
        seen = ("Your code gives gamma/pi = %s for J1 = 0, J2 = 4, Delta = 3 and gamma/pi = %s for "
                "J1 = 1, J2 = 2, Delta = 0.5 (M = 400)." % (_in_pi(got[0]), _in_pi(got[3])))
        if _same_angle(got[:5], [-x for x in want[:5]], tol[:5]):
            found = _why_wrong_sign(g)
            _stop(label, seen + " The size is right, the sign is wrong.",
                  HINT[6] + (" In your file: %s." % "; ".join(found) if found else ""))
        if _same_angle(got[5], want[6]) and _same_angle(got[6], want[5]):
            _stop(label, "Without on-site term your code gives gamma = 0 for J1 = 1, J2 = 2 and pi for J1 = 2, J2 = 1.",
                  HINT[10])
        if _same_angle(got[3], got[5]) and _same_angle(got[4], got[6]):
            _stop(label, seen + " Your result does not depend on Delta.", "Pass Delta on to states.")
        if _same_angle(got[1], got[3]):
            _stop(label, seen + " Your result does not depend on the number of points M.", "Pass M on to states.")
        _stop(label, seen, todo)
    eigenvector = _need(label, g, "eigenvector")
    u = _array(label, todo, "eigenvector(H)", _call(label, todo, eigenvector, _hk(0.3, 0.0, 4.0, 3.0)), (2,))
    weight = abs(u[0]) ** 2 / np.vdot(u, u).real
    if abs(weight - numbers["exact"]["weight_A"]) > 2e-6:
        _changed(label)
    _ok(label,
        "J1 = 0, J2 = 4, Delta = 3: gamma/pi = %s, so gamma/2pi = %s. Light of the lower band on guide A: %s"
        % (_in_pi(got[0]), _fmt(float(_in_pi(got[0])) / 2), _fmt(weight)),
        "J1 = 1, J2 = 2, Delta = 0.5: gamma/pi = %s (M = 4), %s (M = 100), %s (M = 400)"
        % (_in_pi(got[1]), _in_pi(got[2]), _in_pi(got[3])),
        "J1 = 2, J2 = 1, Delta = 0.5: gamma/pi = %s (M = 400)" % _in_pi(got[4]))


# ---------------------------------------------------------------- Part B

def _B1(label, g, *values):
    todo = "Write E = +sqrt(Delta^2 + |h|^2). |h| is abs(h(k, J1, J2)), the square root is np.sqrt."
    numbers = NUMBERS["B"]["B1"]
    if len(values) == 1 and callable(values[0]):
        got = [[_real(label, todo, "band(k, J1, J2, Delta)", _call(label, todo, values[0], k, *_QUARTERS[j]))
                for k in _KS4[:3]] for j in range(3)]
        want = [numbers["E"][key] for key in ("t0", "tq", "th")]
        if not _close(got, want, 2e-6):
            j, i = [(j, i) for j in range(3) for i in range(3) if abs(got[j][i] - want[j][i]) > 2e-6][0]
            seen = "For J1 = %g, J2 = %g, Delta = %g and k = %s your E is %s." % (
                _QUARTERS[j] + (("0", "pi/2", "pi")[i], _fmt(got[j][i])))
            if _close(got, -np.array(want), 2e-6):
                _stop(label, seen + " This is the lower band.", "Return the upper band, with the plus sign.")
            _stop(label, seen + " Calculate sqrt(Delta^2 + |h|^2) by hand and compare.", todo)
        _ok(label, "E at k = 0, pi/2, pi.   t = 0: %s    t = T/4: %s    t = T/2: %s" % tuple(_row(r) for r in got))
        return
    if len(values) != 2:
        _changed(label)
    gaps = [_array(label, todo, "smallest_gap(cycle)", value, (3,), real=True) for value in values]
    if (abs(gaps[0][0] - numbers["gap_min"]) > 2e-6 or abs(gaps[1][0] - numbers["gap_min_sheet"]) > 2e-6
            or abs(gaps[0][1] - PI) > 1e-6 or min(abs(gaps[0][2] - 0.25), abs(gaps[0][2] - 0.75)) > 1e-6):
        _changed(label)
    _ok(label, "smallest gap = %s at k/pi = %s, t/T = %s (the same at t/T = %s). Numbers of the sheet: %s"
        % (_fmt(gaps[0][0]), _fmt(gaps[0][1] / PI), _fmt(gaps[0][2]), _fmt(1 - gaps[0][2]), _fmt(gaps[1][0])))


def _B2(label, g, *values):
    todo = ("Write the on-site term of cell m: H[2 * m, 2 * m] is the diagonal entry of its guide A (+Delta), "
            "H[2 * m + 1, 2 * m + 1] the one of its guide B (-Delta).")
    numbers = NUMBERS["B"]["B2"]
    if len(values) == 1 and callable(values[0]):
        H = _array(label, todo, "H_chain(3, 1, 2, 0.5)", _call(label, todo, values[0], 3, 1.0, 2.0, 0.5), (6, 6), real=True)
        want = _chain(3, 1.0, 2.0, 0.5)
        seen = "The diagonal of H_chain(3, 1, 2, 0.5) is %s." % _row(np.diag(H), 1)
        if not _close(H - np.diag(np.diag(H)), want - np.diag(np.diag(want))):
            _changed(label, "The couplings in H_chain were changed.")
        if not _close(H, want):
            if _close(np.diag(H), -np.diag(want)):
                _stop(label, seen, "-Delta on A. Guide A (index 2m) gets +Delta, guide B (index 2m + 1) gets -Delta.")
            _stop(label, seen + " It must be +Delta on every guide A and -Delta on every guide B.", todo)
        _ok(label, "H_chain: the on-site term is right")
        return
    if len(values) != 3:
        _changed(label)
    E = _array(label, todo, "The two eigenvalues in the gap", values[0], (2,), real=True)
    V = _array(label, todo, "The two states in the gap", values[1], (2 * numbers["cells"], 2))
    E_half = _array(label, todo, "The two eigenvalues at t = T/2", values[2], (2,), real=True)
    lines = ["40 cells. t = 3T/8: the two eigenvalues in the gap are %s and %s    t = T/2: %s and %s"
             % (_fmt(E[0]), _fmt(E[1]), _fmt(E_half[0]), _fmt(E_half[1]))]
    for n, state in enumerate(numbers["t0375"]["ingap"]):
        light = np.abs(V[:, n]) ** 2
        on_A, left = light[0::2].sum(), light[:numbers["cells"]].sum()
        if (abs(E[n] - state["E"]) > 2e-6 or abs(on_A - state["weight_A"]) > 2e-6
                or (left > 0.5) != (state["end"] == "left") or abs(E_half[n]) > 2e-6):
            _changed(label)
        lines.append("state at %7s: light on the A guides %s, light in the left half of the chain %s -> %s end, on guide %s"
                     % (_fmt(E[n]), _fmt(on_A), _fmt(left), state["end"], "A" if on_A > 0.5 else "B"))
    lines.append("these are -Delta(t) and +Delta(t): Delta(3T/8) = %s" % _fmt(numbers["t0375"]["Delta"]))
    _ok(label, *lines)


_RUNS = {   # tag: T, cells, key of the shift, key of the norm
    "T = 20": (20, 40, ("shift", "T20"), "norm_T20"),
    "T = 50": (50, 60, ("shift", "T50"), "norm_T50"),
    "T = 100": (100, 120, ("shift", "T100"), "norm_T100"),
    "one guide, T = 50": (50, 60, ("one_guide_T50",), None),
    "sheet, T = 20": (20, 60, ("sheet_T20_pair",), None),
}


def _B3(label, g, *values):
    todo = ("Write the three matrices of one Runge-Kutta step: H at the start of the step, H in the middle, "
            "H at the end. H(t) is given as a function of the time t.")
    numbers = NUMBERS["B"]["B3"]
    if len(values) == 1 and callable(values[0]):
        psi0 = np.array([(1 + j) * np.exp(0.4j * j) for j in range(8)])
        psi0 = psi0 / np.linalg.norm(psi0)
        out = _call(label, todo, values[0], psi0.copy(), 2.0, 0.25)
        if not (isinstance(out, tuple) and len(out) == 2):
            _changed(label)
        psi = _array(label, todo, "The state that propagate returns", out[0], (8,))
        _array(label, todo, "The positions X that propagate returns", out[1], (9,), real=True)
        if not _close(psi, _runge_kutta(psi0, 2.0, 0.25, (0, 0.5, 1))):
            name = {0: "t", 0.5: "t + dt/2", 1: "t + dt"}
            for at in [(a, b, c) for a in (0, 0.5, 1) for b in (0, 0.5, 1) for c in (0, 0.5, 1)]:
                if _close(psi, _runge_kutta(psi0, 2.0, 0.25, at)):
                    _stop(label, "Your three matrices are H(%s), H(%s), H(%s)." % tuple(name[a] for a in at),
                          "The first is H at the start of the step, the second in the middle, the third at the end.")
            _stop(label, "One cycle on 4 cells with your Runge-Kutta step does not give the right state.", todo)
        _ok(label, "Runge-Kutta step: right (tested on a chain of 4 cells)")
        return
    if len(values) != 3 or not isinstance(values[0], str) or values[0] not in _RUNS:
        _changed(label)
    tag, (T, cells, key, norm_key) = values[0], _RUNS[values[0]]
    psi = np.asarray(values[2])
    if psi.shape != (2 * cells,):
        _changed(label, "The run \"%s\" must use a chain of %d cells." % (tag, cells))
    X = np.asarray(values[1], dtype=float)
    if X.ndim != 1 or len(X) < 2:
        _changed(label)
    steps = len(X) - 1
    norm = float(np.sum(np.abs(psi) ** 2))
    shift = float(X[-1] - X[0])
    want = numbers[key[0]][key[1]] if len(key) == 2 else numbers[key[0]]
    want_norm = numbers[norm_key] if norm_key else 1.0
    seen = "Run \"%s\": shift per cycle = %s, norm at the end = %s." % (
        tag, _fmt(shift) if np.isfinite(shift) else str(shift), _fmt(norm, 6) if np.isfinite(norm) else str(norm))
    if not np.isfinite(norm) or abs(norm - want_norm) > (3e-6 if norm_key else 3e-5):
        step = " Your step is dt = %g." % (T / steps) if steps < T / 0.05 - 0.5 else ""
        _stop(label, seen + step, HINT["11 norm"])
    if tag != "one guide, T = 50" and shift < -0.3:
        _stop(label, seen, HINT["11 back"])
    if tag != "one guide, T = 50" and abs(shift) < 0.3:
        _stop(label, seen, HINT["11 still"])
    if abs(shift - want) > 1e-4 or steps != int(round(T / 0.05)):
        _changed(label, seen + " This is not the run with the given input, dt = 0.05 and %d cells." % cells)
    lines = ["%s: shift per cycle = %s    norm at the end = %s" % (tag, _fmt(shift), _fmt(norm, 6))]
    if tag.startswith("T ="):
        lines.append("X at t/T = 1/4, 1/2, 3/4, 1: %s" % _row([X[n * steps // 4] - X[0] for n in (1, 2, 3, 4)]))
    if tag.startswith("one guide"):
        lines.append("one guide alone excites both bands, and they move in opposite directions")
    if tag.startswith("sheet"):
        lines.append("numbers of the sheet (dJ = 0.5, Delta_0 = 0.2): the gap is small, this cycle is too fast")
    _ok(label, *lines)


def _B4(label, g, zak_pump):
    todo = "Write the Zak phase at the time s: zak_ssh with J1, J2, Delta of this time and M points."
    numbers = NUMBERS["B"]
    cases = [((0.0, 4), numbers["B4"]["t0"]["gamma_over_pi"]), ((0.5, 4), numbers["B4"]["thalf"]["gamma_over_pi"]),
             ((0.25, 4), numbers["B5"]["quarter_M4_over_pi"]), ((0.25, 400), numbers["B5"]["quarter_M400_over_pi"]),
             ((0.75, 400), numbers["B5"]["threequarter_M400_over_pi_raw"])]
    got = [_real(label, todo, "zak_pump(s, M)", _call(label, todo, zak_pump, *args)) for args, _ in cases]
    want = [PI * x for _, x in cases]
    if not _same_angle(got, want):
        seen = "Your code gives gamma/pi = %s at t = 0, %s at t = T/2 (four k points) and %s at t = T/4 (M = 400)." % (
            _in_pi(got[0]), _in_pi(got[1]), _in_pi(got[3]))
        if _same_angle(got[0], want[1]) and _same_angle(got[1], want[0]):
            _stop(label, seen, HINT[10])
        if _same_angle(got[2], got[3]):
            _stop(label, seen + " Your result does not depend on the number of points M.", "Pass M on to zak_ssh.")
        _stop(label, seen, todo)
    loop_product, states = _need(label, g, "loop_product"), _need(label, g, "states")
    products = [_complex(label, todo, "loop_product(us)", _call(label, todo, loop_product, _call(label, todo, states, J1, J2, D, 4)))
                for (J1, J2, D) in (_QUARTERS[0], _QUARTERS[2])]
    if not _close(products, [complex(*numbers["B4"][key]["prod"]) for key in ("t0", "thalf")], 2e-6):
        _changed(label)
    _ok(label, "four k points.   t = 0: product = %s, gamma/pi = %s    t = T/2: product = %s, gamma/pi = %s"
        % (_fc(products[0]), _in_pi(got[0]), _fc(products[1]), _in_pi(got[1])))


def _B5(label, g, gamma_raw, gamma, C, X):
    todo1 = ("Write the first line marked TODO B5: gamma_raw without the jumps of 2 pi. "
             "np.unwrap takes, from one time to the next, the change that is smaller than pi.")
    todo2 = "Write the second line marked TODO B5: C = (gamma at the end - gamma at the start) / (2 pi)."
    numbers = NUMBERS["B"]["B5"]
    raw = _array(label, todo1, "gamma_raw", gamma_raw, (17,), real=True)
    if not _same_angle(raw, PI * np.array(numbers["gamma_raw_over_pi"])):
        _changed(label)
    if gamma is None:
        _open(label, todo1)
    gamma = _array(label, todo1, "gamma", gamma, (17,), real=True)
    want = PI * np.array(numbers["gamma_unwrapped_over_pi"])
    if not _close(gamma, want, 1e-5):
        seen = "Your gamma/pi goes from %s at the start to %s at the end of the cycle." % (
            _fmt(gamma[0] / PI), _fmt(gamma[-1] / PI))
        if abs(gamma[-1] - gamma[0]) < 1e-5:
            _stop(label, seen, HINT[7])
        _stop(label, seen + " It must change by less than pi from one time to the next, without jumps.", todo1)
    if C is None:
        _open(label, todo2)
    C = _real(label, todo2, "C", C)
    if abs(C - numbers["C"]) > 1e-6:
        seen = "Your C is %s." % _fmt(C)
        if abs(C) < 1e-6:
            _stop(label, seen, HINT[7])
        _stop(label, seen + " gamma/pi goes from %s to %s." % (_fmt(gamma[0] / PI), _fmt(gamma[-1] / PI)), todo2)
    zak_pump = _need(label, g, "zak_pump")
    quarter4 = _real(label, todo1, "zak_pump(s, M)", _call(label, todo1, zak_pump, 0.25, 4))
    X = np.asarray(X, dtype=float)
    if X.ndim != 1 or (len(X) - 1) % 4 or not _same_angle(quarter4, PI * numbers["quarter_M4_over_pi"]):
        _changed(label)
    steps = len(X) - 1
    _ok(label,
        "gamma/pi at t = T/4: %s (M = 400), %s (four k points)    C = %s" % (_fmt(gamma[4] / PI), _in_pi(quarter4), _fmt(C)),
        "gamma/2pi at t/T = 1/4, 1/2, 3/4, 1: %s" % _row(gamma[[4, 8, 12, 16]] / TAU),
        "X of B3 (T = 50) at these times:     %s" % _row([X[n * steps // 4] - X[0] for n in (1, 2, 3, 4)]))


def _B6(label, g, plaquette):
    todo = ("Write F = -(angle of the product <a|b> <b|c> <c|d> <d|a>). "
            "Use overlap four times, in this order, and np.angle.")
    numbers = NUMBERS["B"]["B6"]
    a, b, c, d = _GRID[1][0], _GRID[1][1], _GRID[2][1], _GRID[2][0]
    F = _real(label, todo, "plaquette(a, b, c, d)", _call(label, todo, plaquette, a, b, c, d))
    free = _real(label, todo, "plaquette(a, b, c, d)", _call(label, todo, plaquette, *_FREE))
    shaken = [_real(label, todo, "plaquette(a, b, c, d)", _call(label, todo, plaquette, *_phases([a, b, c, d], seed)))
              for seed in (1, 2)]
    seen = "For the plaquette k = pi/2 .. pi, t = 0 .. T/4 (hand vectors) your F is %s pi." % _fmt(F / PI)
    if not _same_angle(shaken, F):
        _stop(label, seen + " With random phase factors on the vectors it is %s pi and %s pi."
              % (_fmt(shaken[0] / PI), _fmt(shaken[1] / PI)), HINT[5])
    if not (_same_angle(F, PI * numbers["F_over_pi"]) and _same_angle(free, _plaquette(*_FREE))):
        if _same_angle(F, -PI * numbers["F_over_pi"]) and _same_angle(free, -_plaquette(*_FREE)):
            _stop(label, seen + " The size is right, the sign is wrong.",
                  "+arg instead of -arg, or the square is walked the other way round. The order is a -> b -> c -> d -> a.")
        _stop(label, seen, todo)
    product = np.vdot(a, b) * np.vdot(b, c) * np.vdot(c, d) * np.vdot(d, a)
    lines = ["plaquette k = pi/2 .. pi, t = 0 .. T/4: product of the four overlaps = %s    F/pi = %s"
             % (_fc(product), _in_pi(F))]
    try:
        H = g["H_k"](PI / 2, *g["pump"](0.25))
        u = g["eigenvector"](g["H_k"](PI, *g["pump"](0.25)))
        E = _energy(H, g["eigenvector"](H))[0]
        if abs(E - numbers["E_kpi2_tq"]) < 2e-6 and _close(np.abs(u), [0, 1]):
            lines.append("your two checks on paper: E = %s at k = pi/2, t = T/4;  |u_A| = %s, |u_B| = %s at k = pi, t = T/4"
                         % (_fmt(E), _fmt(abs(u[0])), _fmt(abs(u[1]))))
    except Exception:
        pass
    _ok(label, *lines)


def _B7(label, g, *values):
    todo = "Write C = (sum of all plaquette phases) / (2 pi). plaquettes(U) gives all of them; np.sum adds them."
    numbers = NUMBERS["B"]["B7"]
    if len(values) == 1 and callable(values[0]):
        C = _real(label, todo, "chern(U)", _call(label, todo, values[0], _GRID))
        shaken = [_real(label, todo, "chern(U)", _call(label, todo, values[0], _phases_grid(_GRID, seed))) for seed in (1, 2)]
        seen = "For the 4 x 4 grid of the pump (hand vectors) your chern gives %s." % _fmt(C)
        if not _close(shaken, C, 1e-9):
            _stop(label, seen + " With random phase factors on the vectors it gives %s and %s."
                  % (_fmt(shaken[0]), _fmt(shaken[1])), HINT[5])
        if abs(C - numbers["C"]) > 1e-9:
            if abs(C) < 1e-9:
                _stop(label, seen, HINT[8])
            if abs(C - TAU * numbers["C"]) < 1e-9:
                _stop(label, seen + " This is the sum of the plaquette phases.", "Divide the sum by 2 pi.")
            _stop(label, seen, todo)
        _ok(label, "chern: right (tested on the 4 x 4 grid of hand vectors, with random phase factors)")
        return
    if len(values) != 3:
        _changed(label)
    F = _array(label, todo, "The plaquette phases F", values[0], (4, 4), real=True)
    C4 = _real(label, todo, "chern(grid(4))", values[1])
    C24 = _real(label, todo, "chern(grid(24))", values[2])
    columns = F.sum(axis=0)
    if (not _close(F / PI, numbers["F_over_pi"], 2e-6) or not _close(columns / PI, numbers["col_sums_over_pi"], 2e-6)
            or abs(C4 - numbers["C"]) > 1e-9 or abs(C24 - numbers["C_24"]) > 1e-9):
        _changed(label, "The 4 x 4 grid of the pump gives C = %s, the 24 x 24 grid C = %s." % (_fmt(C4), _fmt(C24)))
    lines = ["4 x 4 grid, F/pi. One line per k interval (k/pi from 0, 0.5, 1, 1.5), one column per t interval:"]
    lines += ["   " + " ".join("%8s" % _fmt(x / PI) for x in row) for row in F]
    lines.append("sum of each t column / pi = %s    total / pi = %s" % (_row(columns / PI), _fmt(F.sum() / PI)))
    try:
        steps = np.diff(np.unwrap([g["zak_pump"](j / 4, 4) for j in range(5)]))
        if _close(steps, columns, 1e-9):
            lines.append("steps of gamma/pi with four k points  = %s    (the same numbers)" % _row(steps / PI))
    except Exception:
        pass
    lines.append("C = %s (4 x 4 grid)    C = %s (24 x 24 grid)    smallest single plaquette: F/pi = %s"
                 % (_fmt(C4), _fmt(C24), _fmt(F.min() / PI)))
    _ok(label, *lines)


def _B8(label, g, predicted, calculated, grids):
    todo = ("Type your four predictions: the Chern number that you expect, an integer, in place of each TODO. "
            "Look at the cycle in the plane (J1 - J2, Delta): does it go around the point (0, 0), and which way round?")
    numbers = NUMBERS["B"]["B8"]
    cases = [("upper band of the same cycle", numbers["upper_band"],
              "The two bands together give 0. So the upper band has minus the Chern number of the lower band."),
             ("cycle run backwards (Delta -> -Delta)", numbers["reversed_cycle"],
              "Delta -> -Delta mirrors the cycle. It goes around (0, 0) the other way round, the light moves back."),
             ("cycle that does not go around (0, 0)", numbers["not_enclosing"],
              "This cycle does not go around (0, 0), the point where the gap closes. gamma comes back to its start "
              "without going around."),
             ("numbers of the task sheet", numbers["sheet"],
              "The cycle of the sheet is smaller, but it goes around (0, 0) once, the same way round. Only this counts.")]
    if len(predicted) != 4 or len(calculated) != 4 or len(grids) != 4:
        _changed(label)
    if any(p is None for p in predicted):
        _stop(label, "Predict first: %d of your 4 predictions are open." % sum(p is None for p in predicted), todo)
    predicted = [_real(label, todo, "A prediction", p) for p in predicted]
    calculated = [_real(label, todo, "A calculated Chern number", c) for c in calculated]
    for (name, want, _), c, U in zip(cases, calculated, grids):
        if abs(c - want) > 1e-6:
            N = len(U)
            seen = "Your code gives C = %s for the %s, on a grid of %d x %d points." % (_fmt(c), name, N, N)
            if N < 4 or N % 2:
                _stop(label, seen, HINT[9])
            _changed(label, seen)
    lines = ["%-38s predicted %g, calculated %s" % (name + ":", p, _fmt(c))
             for (name, _, _), p, c in zip(cases, predicted, calculated)]
    wrong = [n for n in range(4) if abs(predicted[n] - calculated[n]) > 1e-6]
    if wrong:
        for line in lines:
            print(_PAD + line)
        _stop(label, "Your prediction for the %s differs from your calculation." % cases[wrong[0]][0],
              cases[wrong[0]][2] + " Correct the prediction.")
    lines.append("the edge states of B2 say the same: per cycle one state crosses the gap at each end, |C| = 1")
    _ok(label, *lines)


# ---------------------------------------------------------------- Part C

def _C1(label, g, C_three, periodic):
    todo = ("Write the three Chern numbers: chern of grid_2d(H_hofstadter, 6, band) for band = 0, 1, 2, "
            "in place of the three TODO.")
    numbers = NUMBERS["C"]["C1"]
    if not isinstance(C_three, (list, tuple)) or len(C_three) != 3:
        _changed(label)
    if any(c is None for c in C_three):
        _open(label, todo)
    C = np.array([_real(label, todo, "A Chern number", c) for c in C_three])
    want = np.array(numbers["chern_lower_to_upper"], dtype=float)
    if not (_close(C, want, 1e-6) or _close(C, -want, 1e-6)):
        seen = "Your three Chern numbers are %s." % _row(C)
        if _close(C, C[0], 1e-6):
            _stop(label, seen + " They are all the same.", "Give each call its own band number: 0, 1, 2.")
        _stop(label, seen + " They must be integers with sum 0.", todo)
    if not periodic:
        _changed(label)
    _ok(label, "C = %s for the lower, middle and upper band    sum = %s" % (_row(C), _fmt(C.sum())),
        "H at kappa = 2 pi is the same matrix as H at kappa = 0: the grid closes")


def _C2(label, g, C_three):
    todo = ("Write the three Chern numbers of the lower band: chern of grid_2d(H_haldane, 6, m=0.0), then with m=0.6, "
            "then with m=0.0 and phi=-pi/2, in place of the three TODO.")
    numbers = NUMBERS["C"]["C2"]
    if not isinstance(C_three, (list, tuple)) or len(C_three) != 3:
        _changed(label)
    if any(c is None for c in C_three):
        _open(label, todo)
    C = np.array([_real(label, todo, "A Chern number", c) for c in C_three])
    want = np.array([numbers["C_m0"], numbers["C_m06"], numbers["C_m0_phi_negative"]], dtype=float)
    if not (_close(C, want, 1e-6) or _close(C, -want, 1e-6)):
        _stop(label, "Your three Chern numbers are %s." % _row(C), todo)
    lines = ["m = 0: C = %s    m = 0.6: C = %s    m = 0 and phi = -pi/2: C = %s" % tuple(_fmt(c) for c in C)]
    try:
        H = g["H_haldane"]
        at = [[H(*numbers[point], m=m)[0, 0].real for point in ("K", "Kprime")] for m in (0.0, 0.6)]
        if _close(at, [[numbers[key][m] for key in ("onsite_at_K", "onsite_at_Kprime")] for m in ("m0", "m06")], 2e-6):
            lines.append("entry H[0, 0] at the points K and K': %s and %s (m = 0), %s and %s (m = 0.6)"
                         % (_fmt(at[0][0]), _fmt(at[0][1]), _fmt(at[1][0]), _fmt(at[1][1])))
            lines.append("opposite signs at K and K' -> |C| = 1;  the same sign -> C = 0")
    except Exception:
        pass
    _ok(label, *lines)


_STEPS = {"A1": _A1, "A2": _A2, "A3": _A3, "A4": _A4, "A5": _A5, "A6": _A6, "A7": _A7,
          "B1": _B1, "B2": _B2, "B3": _B3, "B4": _B4, "B5": _B5, "B6": _B6, "B7": _B7, "B8": _B8,
          "C1": _C1, "C2": _C2}


def check(label, *values):
    """Tests one step. See the top of this file."""
    g = sys._getframe(1).f_globals                      # the functions of the file that calls check
    _FILE[0] = os.path.basename(str(g.get("__file__", "zak_chern.py")))
    if label == "end":
        print("All steps are done.")
        sys.stdout.flush()
        _show_figures(newest_only=False)
        return
    if label not in _STEPS:
        _changed(str(label), "check does not know the step %r." % (label,))
    try:
        _STEPS[label](label, g, *values)
    except TypeError as error:
        if "positional argument" not in str(error):
            raise
        _changed(label, "The line check(\"%s\", ...) was changed." % label)
