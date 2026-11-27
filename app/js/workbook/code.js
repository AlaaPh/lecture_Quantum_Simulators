// "Show me how" for the questions that are done with code: the same few lines in Python and in MATLAB.
// Every block uses the functions of the blocks before it. In MATLAB each function is its own file: a block names
// them with lines "% file X.m" and ends with the lines for the script after "% then, in your script:". The names are long on purpose: a function H, u or F would be hidden
// by a variable of the same name in the script of a student, and "angle", "i" and "j" are not used as variables,
// because in MATLAB they are the function for arg and the imaginary unit.
// No line is longer than 46 characters, so that a phone shows every line whole.
// Tested by tools/test_code_hints.sh: Python 3 with numpy; the MATLAB lines in GNU Octave 8, not in MATLAB itself.
// PROGRAMS (at the end) lists which blocks make one program, in the order of the questions.
export const CODE = {
  // ---------- Exercise 1: the chain of 20 waveguides (task 0) ----------
  chainE: {
    py: `import numpy as np

N = 20
one = np.ones(N - 1)     # 19 times the 1
# 1 above and below the diagonal
H = np.diag(one, 1) + np.diag(one, -1)
# E: eigenvalues, lowest first
# V: eigenvectors, one in each column
E, V = np.linalg.eigh(H)
print(E[0])              # the lowest`,
    m: `N = 20;
one = ones(1, N - 1);    % 19 times the 1
% 1 above and below the diagonal
H = diag(one, 1) + diag(one, -1);
% V: eigenvectors, one in each column
[V, D] = eig(H);
% sort: lowest eigenvalue first
[E, idx] = sort(diag(D));
V = V(:, idx);
disp(E(1))               % the lowest`,
  },
  chainV: {
    py: `# uses E, V from question 2
top = V[:, -1]           # the last column
# waveguide 4 is the index 3
print(abs(top[3]))`,
    m: `% uses E, V from question 2
top = V(:, end);         % the last column
% waveguide 4 is the index 4
disp(abs(top(4)))`,
  },
  chainProp: {
    py: `# uses N, E, V from question 2
psi0 = np.zeros(N)
psi0[9] = 1              # waveguide 10
z = 1
# the 20 overlaps <v_n|psi(0)>
c = V.T @ psi0
# V @ x adds the columns of V,
# each multiplied by its number in x
psi = V @ (np.exp(-1j*E*z)*c)
print(abs(psi[9])**2)`,
    m: `% uses N, E, V from question 2
psi0 = zeros(N, 1);
psi0(10) = 1;            % waveguide 10
z = 1;
% the 20 overlaps <v_n|psi(0)>
c = V'*psi0;
% V*x adds the columns of V,
% each multiplied by its number in x
psi = V*(exp(-1i*E*z).*c);
disp(abs(psi(10))^2)`,
  },
  // ---------- Exercise 2: Runge–Kutta steps for the chain of 41 waveguides ----------
  rkChain: {
    py: `import numpy as np

N = 41
one = np.ones(N - 1)
H = np.diag(one, 1) + np.diag(one, -1)

# the slope of psi
def f(psi):
    return -1j*(H @ psi)

psi = np.zeros(N, complex)
psi[20] = 1              # waveguide 21
dz = 0.1
for n in range(20):      # 20 steps
    k1 = f(psi)
    k2 = f(psi + dz/2*k1)
    k3 = f(psi + dz/2*k2)
    k4 = f(psi + dz*k3)
    psi = psi + dz/6*(k1 + 2*k2 + 2*k3 + k4)

print(abs(psi[20])**2)`,
    m: `N = 41;
one = ones(1, N - 1);
H = diag(one, 1) + diag(one, -1);

% the slope of psi
f = @(psi) -1i*(H*psi);

psi = zeros(N, 1);
psi(21) = 1;             % waveguide 21
dz = 0.1;
for n = 1:20             % 20 steps
    k1 = f(psi);
    k2 = f(psi + dz/2*k1);
    k3 = f(psi + dz/2*k2);
    k4 = f(psi + dz*k3);
    psi = psi + dz/6*(k1 + 2*k2 + 2*k3 + k4);
end
disp(abs(psi(21))^2)`,
  },
  // ---------- Exercise 2: a beam with the wavenumber k ----------
  beam: {
    py: `import numpy as np

N = 41
one = np.ones(N - 1)
H = np.diag(one, 1) + np.diag(one, -1)
E, V = np.linalg.eigh(H)

j = np.arange(1, N + 1)  # waveguides 1 to 41
k = np.pi/2
psi0 = np.exp(-(j - 26)**2/(2*3**2))
psi0 = psi0*np.exp(1j*k*j)
# normalise: the sum of |psi|^2 is 1
psi0 = psi0/np.linalg.norm(psi0)

z = 5
c = V.T @ psi0           # the 41 overlaps
psi = V @ (np.exp(-1j*E*z)*c)
# the centre of the light
print(np.sum(j*abs(psi)**2))`,
    m: `N = 41;
one = ones(1, N - 1);
H = diag(one, 1) + diag(one, -1);
[V, D] = eig(H);
E = diag(D);

n = (1:N)';              % waveguides 1 to 41
k = pi/2;
psi0 = exp(-(n - 26).^2/(2*3^2));
psi0 = psi0.*exp(1i*k*n);
% normalise: the sum of |psi|^2 is 1
psi0 = psi0/norm(psi0);

z = 5;
c = V'*psi0;             % the 41 overlaps
psi = V*(exp(-1i*E*z).*c);
% the centre of the light
disp(sum(n.*abs(psi).^2))`,
  },
  // ---------- Exercise 2: the SSH chain (tasks 1 and 2) ----------
  sshE: {
    py: `import numpy as np

def ssh_chain(N, J1, J2):
    hop = np.ones(N - 1) # N - 1 couplings
    hop[0::2] = J1       # 1-2, 3-4, ...
    hop[1::2] = J2       # 2-3, 4-5, ...
    return np.diag(hop, 1) + np.diag(hop, -1)

H = ssh_chain(20, 2, 1)
# eigenvalues, lowest first
E, V = np.linalg.eigh(H)
print(E[E > 0].min())    # smallest positive`,
    m: `% file ssh_chain.m, next to your script
function H = ssh_chain(N, J1, J2)
    hop = ones(1, N - 1); % N - 1 couplings
    hop(1:2:end) = J1;    % 1-2, 3-4, ...
    hop(2:2:end) = J2;    % 2-3, 4-5, ...
    H = diag(hop, 1) + diag(hop, -1);
end

% then, in your script:
H = ssh_chain(20, 2, 1);
[V, D] = eig(H);
% sort: lowest eigenvalue first
[E, idx] = sort(diag(D));
V = V(:, idx);
disp(min(E(E > 0)))      % smallest positive`,
  },
  sshOdd: {
    py: `# uses ssh_chain from question 2
H = ssh_chain(21, 2, 1)
E, V = np.linalg.eigh(H)
print(E[10])             # number 11`,
    m: `% uses ssh_chain.m from question 2
H = ssh_chain(21, 2, 1);
[V, D] = eig(H);
[E, idx] = sort(diag(D));
V = V(:, idx);
disp(E(11))              % number 11`,
  },
  sshEdge: {
    py: `# uses ssh_chain from question 2
H = ssh_chain(20, 1, 2)
E, V = np.linalg.eigh(H)
# with four decimals
print(round(E[E > 0].min(), 4))`,
    m: `% uses ssh_chain.m from question 2
H = ssh_chain(20, 1, 2);
[V, D] = eig(H);
E = sort(diag(D));
% with four decimals
fprintf('%.4f\\n', min(E(E > 0)))`,
  },
  // ---------- Exercise 3: the SSH chain in k-space (task 8a) ----------
  kspaceE: {
    py: `import numpy as np

def Hk(k, J1, J2):
    h = J1 + J2*np.exp(1j*k)
    return np.array([[0, np.conj(h)],
                     [h, 0]])

k = 2*np.pi/3
# the two eigenvalues, lowest first
E = np.linalg.eigvalsh(Hk(k, 2, 1))
print(E[0])              # the lower one`,
    m: `% file Hk.m, next to your script
function Hm = Hk(k, J1, J2)
    h = J1 + J2*exp(1i*k);
    Hm = [0, conj(h); h, 0];
end

% then, in your script:
k = 2*pi/3;
% the two eigenvalues, lowest first
E = sort(real(eig(Hk(k, 2, 1))));
disp(E(1))               % the lower one`,
  },
  // ---------- Exercise 3: the Zak phase with the own program (task 8b) ----------
  zakOverlap: {
    py: `import numpy as np

def Hk(k, J1, J2):
    h = J1 + J2*np.exp(1j*k)
    return np.array([[0, np.conj(h)],
                     [h, 0]])

# the eigenvector of the lower band
def u_lower(k, J1, J2):
    E, V = np.linalg.eigh(Hk(k, J1, J2))
    return V[:, 0]       # the first column

u1 = u_lower(0, 1, 2)
u2 = u_lower(np.pi/2, 1, 2)
# vdot takes the complex conjugate of u1
print(abs(np.vdot(u1, u2)))`,
    m: `% file Hk.m, next to your script
function Hm = Hk(k, J1, J2)
    h = J1 + J2*exp(1i*k);
    Hm = [0, conj(h); h, 0];
end

% file u_lower.m: the lower band
function v = u_lower(k, J1, J2)
    [V, E] = eig(Hk(k, J1, J2));
    [~, idx] = sort(real(diag(E)));
    v = V(:, idx(1));    % lower eigenvalue
end

% then, in your script:
u1 = u_lower(0, 1, 2);
u2 = u_lower(pi/2, 1, 2);
% u1' is the conjugate transpose of u1
disp(abs(u1'*u2))`,
  },
  zakFour: {
    py: `# uses u_lower from question 1
ks = [0, np.pi/2, np.pi, 3*np.pi/2]
us = [u_lower(k, 1, 2) for k in ks]
p = 1
for s in range(4):
    # the last overlap closes the loop
    p = p*np.vdot(us[s], us[(s + 1) % 4])
print(p.real, p.imag)`,
    m: `% uses u_lower.m from question 1
ks = [0, pi/2, pi, 3*pi/2];
U = zeros(2, 4);         % the 4 eigenvectors
for s = 1:4
    U(:, s) = u_lower(ks(s), 1, 2);
end
p = 1;
for s = 1:4
    t = mod(s, 4) + 1;   % after the last: 1
    p = p*(U(:, s)'*U(:, t));
end
disp([real(p), imag(p)])`,
  },
  zakLoop: {
    py: `# uses u_lower from question 1
def zak(J1, J2, M=50):
    ks = 2*np.pi*np.arange(M)/M
    us = [u_lower(k, J1, J2) for k in ks]
    p = 1
    for s in range(M):
        # the last overlap closes the loop
        p = p*np.vdot(us[s], us[(s + 1) % M])
    return -np.angle(p)

print(zak(1, 2)/np.pi)`,
    m: `% file zak.m; uses u_lower.m
function g = zak(J1, J2, M)
    U = zeros(2, M);     % the M eigenvectors
    for s = 1:M
        k = 2*pi*(s - 1)/M;
        U(:, s) = u_lower(k, J1, J2);
    end
    p = 1;
    for s = 1:M
        t = mod(s, M) + 1; % after the last: 1
        p = p*(U(:, s)'*U(:, t));
    end
    g = -angle(p);
end

% then, in your script:
disp(zak(1, 2, 50)/pi)`,
  },
  zakSwap: {
    py: `# the function zak from question 3,
# with the two couplings exchanged
print(zak(2, 1)/np.pi)`,
    m: `% the function zak from question 3,
% with the two couplings exchanged
disp(zak(2, 1, 50)/pi)`,
  },
  // ---------- Exercise 3: the on-site term (task 3) ----------
  onsiteE: {
    py: `import numpy as np

# D is the on-site term Delta
def ssh_chain(N, J1, J2, D):
    hop = np.ones(N - 1)
    hop[0::2] = J1       # 1-2, 3-4, ...
    hop[1::2] = J2       # 2-3, 4-5, ...
    H = np.diag(hop, 1) + np.diag(hop, -1)
    d = np.ones(N)       # the diagonal
    d[0::2] = D          # 1, 3, 5, ...
    d[1::2] = -D         # 2, 4, 6, ...
    return H + np.diag(d)

H = ssh_chain(21, 2, 1, 0.5)
E, V = np.linalg.eigh(H)
print(E[10])             # number 11`,
    m: `% file ssh_chain.m; D is the on-site term
function H = ssh_chain(N, J1, J2, D)
    hop = ones(1, N - 1);
    hop(1:2:end) = J1;    % 1-2, 3-4, ...
    hop(2:2:end) = J2;    % 2-3, 4-5, ...
    H = diag(hop, 1) + diag(hop, -1);
    d = ones(1, N);       % the diagonal
    d(1:2:end) = D;       % 1, 3, 5, ...
    d(2:2:end) = -D;      % 2, 4, 6, ...
    H = H + diag(d);
end

% then, in your script:
H = ssh_chain(21, 2, 1, 0.5);
E = sort(eig(H));        % lowest first
disp(E(11))              % number 11`,
  },
  onsiteZak: {
    py: `# H(k) with the on-site term D
def Hk(k, J1, J2, D):
    h = J1 + J2*np.exp(1j*k)
    return np.array([[D, np.conj(h)],
                     [h, -D]])

def u_lower(k, J1, J2, D):
    E, V = np.linalg.eigh(Hk(k, J1, J2, D))
    return V[:, 0]       # lower eigenvalue

def zak(J1, J2, D, M):
    ks = 2*np.pi*np.arange(M)/M
    us = [u_lower(k, J1, J2, D) for k in ks]
    p = 1
    for s in range(M):
        p = p*np.vdot(us[s], us[(s + 1) % M])
    return -np.angle(p)

print(zak(1, 2, 0.5, 400)/np.pi)`,
    m: `% file Hk.m: with the on-site term D
function Hm = Hk(k, J1, J2, D)
    h = J1 + J2*exp(1i*k);
    Hm = [D, conj(h); h, -D];
end

% file u_lower.m: the lower band
function v = u_lower(k, J1, J2, D)
    [V, E] = eig(Hk(k, J1, J2, D));
    [~, idx] = sort(real(diag(E)));
    v = V(:, idx(1));    % lower eigenvalue
end

% file zak.m
function g = zak(J1, J2, D, M)
    U = zeros(2, M);     % the M eigenvectors
    for s = 1:M
        k = 2*pi*(s - 1)/M;
        U(:, s) = u_lower(k, J1, J2, D);
    end
    p = 1;
    for s = 1:M
        t = mod(s, M) + 1; % after the last: 1
        p = p*(U(:, s)'*U(:, t));
    end
    g = -angle(p);
end

% then, in your script:
disp(zak(1, 2, 0.5, 400)/pi)`,
  },
  onsiteZak2: {
    py: `# the function zak from question 5,
# with the two couplings exchanged
print(zak(2, 1, 0.5, 400)/np.pi)`,
    m: `% the function zak from question 5,
% with the two couplings exchanged
disp(zak(2, 1, 0.5, 400)/pi)`,
  },
  // ---------- Exercise 4: the lattice of five waveguides ----------
  couplings: {
    py: `import numpy as np

# phase = Omega*z
def couplings(phase):
    n = np.arange(1, 7)    # waveguides 1 to 6
    theta = phase + 4*np.pi*n/5 - 3*np.pi/10
    # positions in um: n*d + delta*cos(theta)
    x = n*17.25 + 1.0*np.cos(theta)
    s = np.diff(x)         # distances in um
    # J1 ... J5 in 1/mm
    return 6.672*np.exp(-0.2348*s)

print(couplings(0))          # the picture
print(couplings(np.pi/2))    # the second: J2`,
    m: `% file couplings.m, next to your script
function J = couplings(phase)
    % phase = Omega*z
    n = 1:6;               % waveguides 1 to 6
    theta = phase + 4*pi*n/5 - 3*pi/10;
    % positions in um: n*d + delta*cos(theta)
    x = n*17.25 + 1.0*cos(theta);
    s = diff(x);           % distances in um
    J = 6.672*exp(-0.2348*s);    % in 1/mm
end

% then, in your script:
disp(couplings(0))           % the picture
disp(couplings(pi/2))        % the second: J2`,
  },
  matrix: {
    py: `# uses couplings(phase) from question 5
def Hk(k, phase):
    J = couplings(phase)
    # the matrix must be complex
    Hm = np.zeros((5, 5), complex)
    for i in range(4):
        Hm[i, i+1] = Hm[i+1, i] = J[i]
    # the two corners; J[4] is J5
    Hm[4, 0] = J[4]*np.exp(1j*k)
    Hm[0, 4] = J[4]*np.exp(-1j*k)
    return Hm

# the eigenvalues, lowest first
print(np.linalg.eigvalsh(Hk(0, 0)))`,
    m: `% file Hk.m; uses couplings.m
function Hm = Hk(k, phase)
    J = couplings(phase);
    % J1 ... J4 next to the diagonal
    Hm = diag(J(1:4), 1) + diag(J(1:4), -1);
    Hm(5, 1) = J(5)*exp(1i*k);   % bottom left
    Hm(1, 5) = J(5)*exp(-1i*k);  % top right
end

% then, in your script:
% the eigenvalues, lowest first
disp(sort(real(eig(Hk(0, 0)))))`,
  },
  overlap: {
    py: `# uses Hk(k, phase) from the part before

# the eigenvector of one band
def u_band(band, k, phase):
    E, V = np.linalg.eigh(Hk(k, phase))
    return V[:, band - 1]    # band 3: V[:, 2]

u1 = u_band(3, 0, 0)
u2 = u_band(3, 2*np.pi/50, 0)
# vdot takes the complex conjugate of u1
print(abs(np.vdot(u1, u2)))`,
    m: `% file u_band.m: the eigenvector of one band
function v = u_band(band, k, phase)
    [V, E] = eig(Hk(k, phase));
    [~, idx] = sort(real(diag(E)));
    v = V(:, idx(band));   % band 3: column 3
end

% then, in your script:
u1 = u_band(3, 0, 0);
u2 = u_band(3, 2*pi/50, 0);
% u1' is the conjugate transpose of u1
disp(abs(u1'*u2))`,
  },
  zak: {
    py: `# uses u_band(band, k, phase) from question 1
def zak(band, phase, M=50):
    ks = 2*np.pi*np.arange(M)/M
    us = [u_band(band, k, phase) for k in ks]
    p = 1
    for s in range(M):
        # the last overlap closes the loop
        p = p*np.vdot(us[s], us[(s + 1) % M])
    return -np.angle(p)

print(zak(3, 0)/np.pi)`,
    m: `% file zak.m; uses u_band.m from question 1
function g = zak(band, phase, M)
    U = zeros(5, M);     % the M eigenvectors
    for s = 1:M
        k = 2*pi*(s - 1)/M;
        U(:, s) = u_band(band, k, phase);
    end
    p = 1;
    for s = 1:M
        t = mod(s, M) + 1; % after the last: 1
        p = p*(U(:, s)'*U(:, t));
    end
    g = -angle(p);
end

% then, in your script:
disp(zak(3, 0, 50)/pi)`,
  },
  zak2: {
    py: `# the function zak from question 2,
# with Omega*z = pi/2
print(zak(3, np.pi/2)/np.pi)`,
    m: `% the function zak from question 2,
% with Omega*z = pi/2
disp(zak(3, pi/2, 50)/pi)`,
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
    m: `% file F_square.m; uses u_band.m
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
    py: `# uses F_square and step from question 5
values = step*np.arange(10)  # 0, 2*pi/10, ...
total = 0
for k in values:
    for phase in values:
        f = F_square(3, k, phase, step)
        total = total + f

print(total/np.pi)`,
    m: `% uses F_square.m and step from question 5
values = (0:9)*step;         % 0, 2*pi/10, ...
total = 0;
for k = values
    for phase = values
        f = F_square(3, k, phase, step);
        total = total + f;
    end
end
disp(total/pi)`,
  },
  band2: {
    py: `total = 0
for k in values:
    for phase in values:
        f = F_square(2, k, phase, step)
        total = total + f

print(total/(2*np.pi))`,
    m: `total = 0;
for k = values
    for phase = values
        f = F_square(2, k, phase, step);
        total = total + f;
    end
end
disp(total/(2*pi))`,
  },
};

// One program is the blocks of one part, in the order of its questions. numbers: what the program prints, as keys of
// tools/workbook_numbers.json (a key of "exercises" for the parts of Exercises 1 to 3).
export const PROGRAMS = [
  { id: 'chain', blocks: ['chainE', 'chainV', 'chainProp'] },
  { id: 'rk', blocks: ['rkChain'] },
  { id: 'beam', blocks: ['beam'] },
  { id: 'ssh', blocks: ['sshE', 'sshOdd', 'sshEdge'] },
  { id: 'kspace', blocks: ['kspaceE'] },
  { id: 'zakcode', blocks: ['zakOverlap', 'zakFour', 'zakLoop', 'zakSwap'] },
  { id: 'onsite', blocks: ['onsiteE', 'onsiteZak', 'onsiteZak2'] },
  { id: 'aah', blocks: ['couplings', 'matrix', 'overlap', 'zak', 'zak2', 'plaquette', 'sum', 'band2'] },
];
