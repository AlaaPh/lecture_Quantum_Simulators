// "Show me how" for the questions that are done with code: the same few lines in Python and in MATLAB.
// Every block uses the functions of the blocks before it. In MATLAB each function is its own file
// (couplings.m, Hk.m, u_band.m, F_square.m). The names are long on purpose: a function H, u or F would be hidden by a
// variable of the same name in the script of a student.
// No line is longer than 60 characters, so that the block needs no sideways scroll on a wide screen.
// Tested by tools/test_code_hints.sh: Python 3 with numpy; the MATLAB lines in GNU Octave 8, not in MATLAB itself.
export const CODE = {
  couplings: {
    py: `import numpy as np

def couplings(phase):                # phase = Omega*z
    n = np.arange(1, 7)              # waveguides 1 ... 6
    angle = phase + 4*np.pi*n/5 - 3*np.pi/10
    x = n*17.25 + np.cos(angle)      # positions in um
    s = np.diff(x)                   # distances in um
    return 6.672*np.exp(-0.2348*s)   # J1 ... J5 in 1/mm

print(couplings(0))                  # the picture
print(couplings(np.pi/2))            # the third one is J3`,
    m: `% file couplings.m
function J = couplings(phase)        % phase = Omega*z
    n = 1:6;                         % waveguides 1 ... 6
    angle = phase + 4*pi*n/5 - 3*pi/10;
    x = n*17.25 + cos(angle);        % positions in um
    s = diff(x);                     % distances in um
    J = 6.672*exp(-0.2348*s);        % J1 ... J5 in 1/mm
end

% then, in your script:
disp(couplings(0))                   % the picture
disp(couplings(pi/2))                % the third one is J3`,
  },
  matrix: {
    py: `# uses couplings(phase) from the question before
def Hk(k, phase):
    J = couplings(phase)
    M = np.zeros((5, 5), complex)
    for i in range(4):
        M[i, i+1] = M[i+1, i] = J[i]
    M[4, 0] = J[4]*np.exp(1j*k)
    M[0, 4] = J[4]*np.exp(-1j*k)
    return M

print(np.linalg.eigvalsh(Hk(0, 0)))`,
    m: `% file Hk.m; uses couplings.m from the question before
function M = Hk(k, phase)
    J = couplings(phase);
    M = diag(J(1:4), 1) + diag(J(1:4), -1);
    M(5, 1) = J(5)*exp(1i*k);
    M(1, 5) = J(5)*exp(-1i*k);
end

% then, in your script:
disp(sort(real(eig(Hk(0, 0)))))`,
  },
  overlap: {
    py: `# uses Hk(k, phase) from part 2

# the eigenvector of one band; band 3 is column 2
def u_band(band, k, phase):
    E, V = np.linalg.eigh(Hk(k, phase))
    return V[:, band - 1]

u1 = u_band(3, 0, 0)
u2 = u_band(3, 2*np.pi/50, 0)
print(abs(np.vdot(u1, u2)))   # vdot conjugates u1`,
    m: `% file u_band.m: the eigenvector of one band; uses Hk.m
function v = u_band(band, k, phase)
    [V, E] = eig(Hk(k, phase));
    [~, idx] = sort(real(diag(E)));
    v = V(:, idx(band));
end

% then, in your script:
u1 = u_band(3, 0, 0);
u2 = u_band(3, 2*pi/50, 0);
disp(abs(u1'*u2))             % u1' is conjugated`,
  },
  zak: {
    py: `# uses u_band(band, k, phase) from question 1
def zak(band, phase, M=50):
    ks = 2*np.pi*np.arange(M)/M
    us = [u_band(band, k, phase) for k in ks]
    p = 1
    for s in range(M):
        # the last one, <u_M|u_1>, closes the loop
        p = p*np.vdot(us[s], us[(s + 1) % M])
    return -np.angle(p)

print(zak(3, 0)/np.pi)`,
    m: `% uses u_band.m from question 1
M = 50;  U = zeros(5, M);
for s = 1:M
    U(:, s) = u_band(3, 2*pi*(s - 1)/M, 0);
end
p = 1;
for s = 1:M
    t = mod(s, M) + 1;       % after the last: the first
    p = p*(U(:, s)'*U(:, t));
end
disp(-angle(p)/pi)`,
  },
  zak2: {
    py: `# the function zak of question 2, with the phase pi/2
print(zak(3, np.pi/2)/np.pi)`,
    m: `% only the phase changes: pi/2 instead of 0
for s = 1:M
    U(:, s) = u_band(3, 2*pi*(s - 1)/M, pi/2);
end
p = 1;
for s = 1:M
    t = mod(s, M) + 1;
    p = p*(U(:, s)'*U(:, t));
end
disp(-angle(p)/pi)`,
  },
  plaquette: {
    py: `# uses u_band(band, k, phase) from question 1
def F_square(band, k, phase, step):
    a = u_band(band, k, phase)
    b = u_band(band, k, phase + step)
    c = u_band(band, k + step, phase + step)
    d = u_band(band, k + step, phase)
    p = np.vdot(a, b)*np.vdot(b, c)
    p = p*np.vdot(c, d)*np.vdot(d, a)
    return -np.angle(p)

step = 2*np.pi/10
print(F_square(3, 0, 0, step)/np.pi)`,
    m: `% file F_square.m; uses u_band.m from question 1
function f = F_square(band, k, phase, step)
    a = u_band(band, k, phase);
    b = u_band(band, k, phase + step);
    c = u_band(band, k + step, phase + step);
    d = u_band(band, k + step, phase);
    f = -angle((a'*b)*(b'*c)*(c'*d)*(d'*a));
end

% then, in your script:
step = 2*pi/10;
disp(F_square(3, 0, 0, step)/pi)`,
  },
  sum: {
    py: `total = 0
for i in range(10):
    for j in range(10):
        total = total + F_square(3, i*step, j*step, step)

print(total/np.pi)`,
    m: `total = 0;
for i = 0:9
    for j = 0:9
        total = total + F_square(3, i*step, j*step, step);
    end
end
disp(total/pi)`,
  },
  band2: {
    py: `total = 0
for i in range(10):
    for j in range(10):
        total = total + F_square(2, i*step, j*step, step)

print(total/(2*np.pi))`,
    m: `total = 0;
for i = 0:9
    for j = 0:9
        total = total + F_square(2, i*step, j*step, step);
    end
end
disp(total/(2*pi))`,
  },
};
