// "Show me how" for the questions that are done with code: the same few lines in Python and in MATLAB.
// Every block uses the functions of the blocks before it. In MATLAB each function is its own file (H.m, u.m, F.m).
// Tested: Python 3 with numpy; the MATLAB lines in GNU Octave 8, not in MATLAB itself.
export const CODE = {
  matrix: {
    py: `import numpy as np

def couplings(phase):                 # phase = Omega*z
    n = np.arange(1, 7)               # waveguides 1 ... 6
    x = n*17.25 + np.cos(phase + 4*np.pi*n/5 - 3*np.pi/10)   # positions in um
    return 6.672*np.exp(-0.2348*np.diff(x))                  # J1 ... J5 in 1/mm

def H(k, phase):
    J = couplings(phase)
    M = np.zeros((5, 5), complex)
    for i in range(4):
        M[i, i+1] = M[i+1, i] = J[i]
    M[4, 0] = J[4]*np.exp(1j*k)
    M[0, 4] = J[4]*np.exp(-1j*k)
    return M

print(np.linalg.eigvalsh(H(0, 0)))`,
    m: `% file H.m
function M = H(k, phase)                             % phase = Omega*z
    n = 1:6;                                         % waveguides 1 ... 6
    x = n*17.25 + cos(phase + 4*pi*n/5 - 3*pi/10);   % positions in um
    J = 6.672*exp(-0.2348*diff(x));                  % J1 ... J5 in 1/mm
    M = diag(J(1:4), 1) + diag(J(1:4), -1);
    M(5, 1) = J(5)*exp(1i*k);
    M(1, 5) = J(5)*exp(-1i*k);
end

% then, in your script:
disp(sort(real(eig(H(0, 0)))))`,
  },
  zak: {
    py: `# uses H(k, phase) from part 2
def u(band, k, phase):                # eigenvector of one band
    return np.linalg.eigh(H(k, phase))[1][:, band - 1]

def zak(band, phase, M=50):
    us = [u(band, 2*np.pi*s/M, phase) for s in range(M)]
    p = 1
    for s in range(M):
        p = p*np.vdot(us[s], us[(s + 1) % M])   # the last one closes the loop
    return -np.angle(p)

print(zak(3, 0)/np.pi)`,
    m: `% file u.m: the eigenvector of one band, uses H.m from part 2
function v = u(band, k, phase)
    [V, E] = eig(H(k, phase));
    [~, idx] = sort(real(diag(E)));
    v = V(:, idx(band));
end

% then, in your script:
M = 50;  U = zeros(5, M);
for s = 1:M
    U(:, s) = u(3, 2*pi*(s - 1)/M, 0);
end
p = 1;
for s = 1:M
    p = p*(U(:, s)'*U(:, mod(s, M) + 1));            % the last one closes the loop
end
disp(-angle(p)/pi)`,
  },
  zak2: { py: `# the function zak of question 1, with the phase pi/2
print(zak(3, np.pi/2)/np.pi)`, m: `for s = 1:M
    U(:, s) = u(3, 2*pi*(s - 1)/M, pi/2);            % only the phase changes
end
p = 1;
for s = 1:M
    p = p*(U(:, s)'*U(:, mod(s, M) + 1));
end
disp(-angle(p)/pi)` },
  plaquette: {
    py: `# uses u(band, k, phase) from question 1
def F(band, k, phase, step):
    a = u(band, k, phase)
    b = u(band, k, phase + step)
    c = u(band, k + step, phase + step)
    d = u(band, k + step, phase)
    return -np.angle(np.vdot(a, b)*np.vdot(b, c)*np.vdot(c, d)*np.vdot(d, a))

step = 2*np.pi/10
print(F(3, 0, 0, step)/np.pi)`,
    m: `% file F.m, uses u.m from question 1
function f = F(band, k, phase, step)
    a = u(band, k, phase);
    b = u(band, k, phase + step);
    c = u(band, k + step, phase + step);
    d = u(band, k + step, phase);
    f = -angle((a'*b)*(b'*c)*(c'*d)*(d'*a));
end

% then, in your script:
step = 2*pi/10;
disp(F(3, 0, 0, step)/pi)`,
  },
  sum: {
    py: `total = 0
for i in range(10):
    for j in range(10):
        total = total + F(3, i*step, j*step, step)

print(total/np.pi)`,
    m: `total = 0;
for i = 0:9
    for j = 0:9
        total = total + F(3, i*step, j*step, step);
    end
end
disp(total/pi)`,
  },
  band2: {
    py: `total = 0
for i in range(10):
    for j in range(10):
        total = total + F(2, i*step, j*step, step)

print(total/(2*np.pi))`,
    m: `total = 0;
for i = 0:9
    for j = 0:9
        total = total + F(2, i*step, j*step, step);
    end
end
disp(total/(2*pi))`,
  },
};
