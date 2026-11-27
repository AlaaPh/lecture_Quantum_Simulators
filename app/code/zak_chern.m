function zak_chern()
% Zak phase, Thouless pump and Chern number: you calculate them yourself, one line at a time.
% Tested with GNU Octave 8.4. Not yet run in MATLAB.
%
% The idea. The overlap <u|v> = conj(u_A) v_A + conj(u_B) v_B of two eigenvectors is one complex number.
% The computer gives every eigenvector an arbitrary phase factor, so the angle of a single overlap means nothing.
% Around a closed loop every phase factor cancels: Berry phase of the loop = -(angle of the product of the overlaps).
% Loop once through all k from 0 to 2 pi: the Zak phase gamma. gamma/2pi is the position of the light of this band
% inside the unit cell (one waveguide A and one waveguide B; short: guide). Pump: J1, J2, Delta go slowly through a
% cycle of length T. Chern number C = how often gamma goes around in one cycle = unit cells the light moves per cycle.
%
% Conventions. H(k) = [Delta, conj(h); h, -Delta], h(k) = J1 + J2 exp(ik), basis (A, B), +Delta on guide A.
% Lower band = smallest eigenvalue. k_s = 2 pi (s-1)/M, s = 1 .. M. gamma = -arg(<u_1|u_2> <u_2|u_3> ... <u_M|u_1>).
% Plaquette (one small square of a grid in k and t): the same -arg, walked (k, t) -> (k, t+dt) -> (k+dk, t+dt) ->
% (k+dk, t) -> back. C = (sum of all plaquettes)/2pi. Position of the light: X = sum over the cells m of
% m (I_A,m + I_B,m). I_A,m is the light on guide A of cell m. Cell 0 is the cell where the light starts.
%
% How to work: do a hand step of the worksheet (A1 to A5, B1, B4, B6) on paper before you do the same step here.
% Then open this file in the editor and press Run (F5). Run saves the file first. If MATLAB asks, choose
% "Change Folder". The file stops at the first open step and names it. The function run_steps below lists all steps
% in their order. The functions that you complete come after it, in the same order. Search for the step, for example
% "TODO A1", put your code in place of the word TODO and keep the semicolon at the end of the line. Run again.
% Always run the whole file: the functions exist only inside it, so a single line cannot be run alone.
% Compare the numbers after OK with your paper. Keep the file zak_chern_check.m in the same folder.
    if exist('zak_chern_check', 'file') ~= 2
        fprintf('The file zak_chern_check.m is missing. Put it into the folder of this file and run again.\n');
        return
    end
    try
        run_steps();
    catch err                                      % the check stops the run at the first open step
        if ~strcmp(err.identifier, 'zak_chern:stop')
            rethrow(err);
        end
        fprintf('%s\n', err.message);
    end
end


function run_steps()
    % FIGURES: true if a figure window can open (MATLAB with its desktop, Octave with a screen). Write false for none.
    FIGURES = usejava('desktop') || (exist('OCTAVE_VERSION', 'builtin') > 0 && have_window_system());
    LONG = false;                                  % true: step B3 also runs the slow cycle T = 100 on 120 cells
    % given: g hands the functions of this file to the check
    g = struct('file', [mfilename('fullpath'), '.m'], 'h', @h, 'H_k', @H_k, 'overlap', @overlap, ...
               'loop_product', @loop_product, 'zak', @zak, 'eigenvector', @eigenvector, 'states', @states, ...
               'zak_ssh', @zak_ssh, 'pump', @pump, 'zak_pump', @zak_pump, 'H_haldane', @H_haldane);
    check = @(varargin) zak_chern_check(g, varargin{:});           % check(step, ...) tests your line, prints the result

    % ================================================================================================================
    % Part A: Zak phase of the SSH chain (task 8)
    % ================================================================================================================
    check('A1', @h);                               % A1: you write the function h
    check('A2', @overlap);                         % A2: you write the function overlap
    check('A3', @loop_product, @zak);              % A3: you write the functions loop_product and zak

    % A4 and A5: nothing to write. These two steps are hand steps of the worksheet. The check repeats them with your
    %     overlap, loop_product and zak. It prints no numbers: check your own numbers on the page workbook.html.
    k = k_points(4);
    us = zeros(2, 4);                              % the four eigenvectors are the columns of us
    for s = 1:4
        us(:, s) = u_hand(k(s), 1, 2);
    end
    us(:, 2) = 1i * us(:, 2);                      % A4: the second eigenvector is multiplied by i
    check('A4', overlap(us(:, 1), us(:, 2)), overlap(us(:, 2), us(:, 3)), loop_product(us));
    for s = 1:4
        us(:, s) = u_hand(k(s), 2, 1);             % A5: the same four k points for J1 = 2, J2 = 1
    end
    check('A5', loop_product(us), zak(us));

    check('A6', @eigenvector);                     % A6: you write the function eigenvector
    check('A7', @zak_ssh);                         % A7: you write the function zak_ssh

    % ================================================================================================================
    % Part B: the Thouless pump (task 9) and its Chern number
    % ================================================================================================================
    check('B1', @band_energy);                     % B1: you write the function band_energy
    check('B1', smallest_gap(@pump), smallest_gap(@pump_sheet));
    draw(FIGURES, 'B1');                           % figure (given): the two bands over k and t/T

    check('B2', @H_chain);                         % B2: you write one line in the function H_chain
    [J1, J2, Delta] = pump(3 / 8);
    [V, E] = eig(H_chain(40, J1, J2, Delta));      % 40 cells at t = 3T/8: 80 eigenvalues
    [E, idx] = sort(real(diag(E)));                % the eigenvalues in rising order,
    V = V(:, idx);                                 % and the eigenvectors in the same order
    [J1, J2, Delta] = pump(1 / 2);
    E_half = sort(real(eig(H_chain(40, J1, J2, Delta))));          % the same at t = T/2
    check('B2', E(40:41), V(:, 40:41), E_half(40:41));             % the two in the middle lie in the gap
    draw(FIGURES, 'B2');                           % figure (given): all eigenvalues of the open chain over t/T

    check('B3', @propagate);                       % B3: you write one line in the function propagate
    dt = 0.05;                                     % given: the length of one Runge-Kutta step
    [psi, X20] = propagate(start(40, [1, -1]), 20, dt, @pump);     % given: X(0) = 0, so the last X is the shift per
    check('B3', 'T = 20', X20, psi);                               % cycle in unit cells
    [psi, X50] = propagate(start(60, [1, -1]), 50, dt, @pump);
    check('B3', 'T = 50', X50, psi);
    [psi, X_guide] = propagate(start(60, [1, 0]), 50, dt, @pump);  % all light on one guide A
    check('B3', 'one guide, T = 50', X_guide, psi);
    [psi, X_sheet] = propagate(start(60, [1, -1]), 20, dt, @pump_sheet);
    check('B3', 'sheet, T = 20', X_sheet, psi);
    X_slow = X50;                                  % the slowest cycle that was run; B5 compares it with gamma
    if LONG
        [psi, X_slow] = propagate(start(120, [1, -1]), 100, dt, @pump);
        check('B3', 'T = 100', X_slow, psi);
    end
    draw(FIGURES, 'B3', X20, X50, X_guide);        % figure (given): the position of the light during one cycle

    check('B4', @zak_pump);                        % B4: you write the function zak_pump

    % B5. gamma at 17 times of one cycle. angle gives angles between -pi and pi, so these raw values jump by 2 pi.
    %     One rule: from one time to the next, take the change that is smaller than pi. unwrap does exactly this.
    %     Write gamma without jumps, then C = (gamma at the end - gamma at the start)/2pi. Do not round C.
    s_list = (0:16) / 16;
    gamma_raw = zeros(1, 17);
    for n = 1:17
        gamma_raw(n) = zak_pump(s_list(n), 400, @pump);
    end
    gamma = TODO;                                                  % TODO B5, first line
    C = TODO;                                                      % TODO B5, second line
    check('B5', gamma_raw, gamma, C, X_slow);
    draw(FIGURES, 'B5', X_slow, s_list, gamma);    % figure (given): gamma/2pi on top of the position X of B3

    check('B6', @plaquette);                       % B6: you write the function plaquette
    check('B7', @chern);                           % B7: you write the function chern
    F = plaquettes(grid_kt(4, @pump, 1));          % row i: k interval, column j: t interval
    check('B7', F, chern(grid_kt(4, @pump, 1)), chern(grid_kt(24, @pump, 1)));
    draw(FIGURES, 'B7', F);                        % figure (given): the 16 plaquette phases, the sum of each column
    draw(FIGURES, 'B8');                           % figure (given): the cycles in the plane (J1 - J2, Delta)

    % B8. Predict first, then calculate. Look at each cycle in the plane (J1 - J2, Delta): does it go around the point
    %     (0, 0), where the gap closes, and which way round? Type the Chern number that you expect, an integer.
    predicted = [TODO, ...                         % TODO B8: the upper band of the cycle pump
                 TODO, ...                         % TODO B8: the lower band of pump_back (Delta -> -Delta)
                 TODO, ...                         % TODO B8: the lower band of pump_aside
                 TODO];                            % TODO B8: the lower band of pump_sheet (numbers of the sheet)
    N = 8;                                         % grid points in k and in t
    grids = {grid_kt(N, @pump, 2), grid_kt(N, @pump_back, 1), grid_kt(N, @pump_aside, 1), grid_kt(N, @pump_sheet, 1)};
    calculated = [chern(grids{1}), chern(grids{2}), chern(grids{3}), chern(grids{4})];
    check('B8', predicted, calculated, grids);

    % ================================================================================================================
    % Part C: 2D lattices. The same functions, with k_y in place of the time t.
    % ================================================================================================================

    % C1. Three bands, so three Chern numbers. The grid has 6 x 6 points in kappa and k_y.
    %     Write the Chern number of each band: chern of grid_2d(@H_hofstadter, 6, band).
    C_hofstadter = [TODO, TODO, TODO];                             % TODO C1: band = 1, 2, 3
    check('C1', C_hofstadter, norm(H_hofstadter(2 * pi, 0.3) - H_hofstadter(0, 0.3)) < 1e-9);

    % C2. Lower band of the Haldane model on a 6 x 6 grid. grid_2d takes any function of two variables. The model
    %     with m = 0.6 and phi = pi/2 is the function @(k1, k2) H_haldane(k1, k2, 0.6, pi / 2).
    %     Write the Chern number for m = 0 and for m = 0.6 (both with phi = pi/2), and for m = 0 with phi = -pi/2.
    C_haldane = [TODO, TODO, TODO];                                % TODO C2
    check('C2', C_haldane);

    check('end');
end


% ====================================================================================================================
% Part A: Zak phase of the SSH chain (task 8)
% ====================================================================================================================

% A1. h(k) is the entry of H(k) that couples guide A to guide B. Its angle phi is the phase between A and B.
%     J1 couples A and B inside one unit cell, J2 couples B to the A of the next cell. Write h(k) = J1 + J2 exp(ik).
function y = h(k, J1, J2)
    y = TODO;                                                      % TODO A1
end


function H = H_k(k, J1, J2, Delta)                 % given: H(k) in the basis (A, B); +Delta on guide A, -Delta on B
    H = [Delta, conj(h(k, J1, J2)); h(k, J1, J2), -Delta];
end


function k = k_points(M)                           % given: k_s = 2 pi (s-1)/M. The point 2 pi is the point 0 again
    k = 2 * pi * (0:M - 1) / M;
end


function u = u_hand(k, J1, J2)                     % given: the lower-band eigenvector that you use on paper (Delta = 0)
    u = [-exp(-1i * angle(h(k, J1, J2))); 1] / sqrt(2);
end


% A2. The overlap <u|v> = conj(u_A) v_A + conj(u_B) v_B is one complex number. Its length says how alike the two
%     vectors are, its angle is the phase between them. Write it as the sum of conj(u_j) v_j over all entries j:
%     Part C has vectors with three entries. u and v are columns; u' is the complex conjugate transpose of u.
%     Without the complex conjugate no later step works.
function y = overlap(u, v)
    y = TODO;                                                      % TODO A2
end


% A3. The eigenvectors u_1 .. u_M are the columns of the matrix us: u_s is us(:, s). Go around the closed loop
%     u_1 -> u_2 -> ... -> u_M -> u_1 and multiply the overlaps. In this product every arbitrary phase factor
%     cancels. The loop below stops at u_M. Write the overlap that closes the loop.
function p = loop_product(us)
    p = 1;
    for s = 1:size(us, 2) - 1
        p = p * overlap(us(:, s), us(:, s + 1));                   % <u_1|u_2> <u_2|u_3> ... <u_(M-1)|u_M>
    end
    p = p * TODO;                                                  % TODO A3, first line
end


%     The Zak phase is minus the angle of this product. Write it. angle gives the angle of a complex number.
function gamma = zak(us)
    gamma = TODO;                                                  % TODO A3, second line
end


% A6. Now the computer finds the eigenvectors. eig returns the eigenvectors as the columns of V and the eigenvalues
%     on the diagonal of a matrix. It does not promise an order. So the second line sorts the eigenvalues E in rising
%     order, and the third line puts the columns of V in the same order. Write the eigenvector that belongs to
%     eigenvalue number band. band = 1 is the smallest eigenvalue: the lower band.
function u = eigenvector(H, band)
    [V, E] = eig(H);
    [E, idx] = sort(real(diag(E)));
    V = V(:, idx);
    u = TODO;                                                      % TODO A6
end


function us = states(J1, J2, Delta, M, band)       % given: the eigenvector of one band at the M points k_s,
    k = k_points(M);                               % as the columns of us
    us = zeros(2, M);
    for s = 1:M
        us(:, s) = eigenvector(H_k(k(s), J1, J2, Delta), band);
    end
end


% A7. Now with the on-site term: +Delta on guide A, -Delta on guide B. Then the Zak phase is no longer 0 or pi:
%     gamma/2pi tells where the light sits inside the unit cell. Write the Zak phase of the lower band on M points.
%     Use states and zak. The lower band is band = 1.
function gamma = zak_ssh(J1, J2, Delta, M)
    gamma = TODO;                                                  % TODO A7
end


% ====================================================================================================================
% Part B: the Thouless pump (task 9) and its Chern number
% ====================================================================================================================

function [J1, J2, Delta] = pump(s)                 % given: the cycle. s = t/T goes from 0 to 1
    J1 = 1 + cos(2 * pi * s);
    J2 = 1 - cos(2 * pi * s);
    Delta = 0.5 * sin(2 * pi * s);
end


function [J1, J2, Delta] = pump_sheet(s)           % given: the cycle with the numbers of the task sheet
    J1 = 1 + 0.5 * cos(2 * pi * s);
    J2 = 1 - 0.5 * cos(2 * pi * s);
    Delta = 0.2 * sin(2 * pi * s);
end


% B1 (task 9a). H(k) has the eigenvalues +E and -E with E = sqrt(Delta^2 + |h|^2): the upper and the lower band.
%     Write E. The gap between the bands is 2E. The pump needs a gap that never closes during the cycle.
function E = band_energy(k, J1, J2, Delta)
    E = TODO;                                                      % TODO B1
end


function gap = smallest_gap(cycle)                 % given: the smallest gap on a grid in k and t, and where it is:
    k_grid = linspace(0, 2 * pi, 201);             % gap = [smallest gap, its k, its t/T]
    s_grid = linspace(0, 1, 201);
    E = zeros(201, 201);
    for j = 1:201
        [J1, J2, Delta] = cycle(s_grid(j));
        for i = 1:201
            E(i, j) = band_energy(k_grid(i), J1, J2, Delta);
        end
    end
    [E_min, n] = min(E(:));
    [i, j] = ind2sub(size(E), n);
    gap = [2 * E_min, k_grid(i), s_grid(j)];
end


% B2 (task 9b). An open chain of N unit cells. Cell m (m = 1 .. N) has its guide A at index 2m - 1 and its guide B
%     at index 2m. The couplings are given. Write the on-site term of cell m: +Delta on A, -Delta on B.
%     Then look at the eigenvalues: the open chain can have states that live at its two ends, inside the gap.
function H = H_chain(N, J1, J2, Delta)
    H = zeros(2 * N, 2 * N);
    for m = 1:N
        H(2 * m - 1, 2 * m) = J1;                                  % A and B of cell m
        H(2 * m, 2 * m - 1) = J1;
        if m < N
            H(2 * m, 2 * m + 1) = J2;                              % B of cell m and A of cell m + 1
            H(2 * m + 1, 2 * m) = J2;
        end
        TODO;                                                      % TODO B2: the two diagonal entries of cell m
    end
end


function psi = start(N, amplitudes)                % given: the input state. Light on the cell in the middle of N cells.
    psi = zeros(2 * N, 1);                         % [1, -1] is (A - B)/sqrt(2): the lower band of the cycle pump
    psi(N + 1) = amplitudes(1);                    % at t = 0. This cell has its guide A at index N + 1
    psi(N + 2) = amplitudes(2);                    % and its guide B at index N + 2.
    psi = psi / norm(psi);
end


function H = H_cycle(N, cycle, s)                  % given: the matrix of the chain at the time s = t/T of a cycle
    [J1, J2, Delta] = cycle(s);
    H = H_chain(N, J1, J2, Delta);
end


% B3 (task 9c). i dpsi/dt = H(t) psi, solved in Runge-Kutta steps of length dt. H changes during one step:
%     the four slopes k1 .. k4 need H at the start of the step, in the middle (twice) and at the end.
%     Write these three matrices. H(t) is defined inside the function: the matrix of the chain at the time t.
function [psi, X] = propagate(psi, T, dt, cycle)
    % One cycle of length T. Returns the state at the end and the position X of the light after every step.
    N = numel(psi) / 2;
    m = ceil((1:2 * N)' / 2) - floor(N / 2) - 1;   % cell number m of every guide; the light starts in cell m = 0
    H = @(t) H_cycle(N, cycle, t / T);
    steps = round(T / dt);
    X = zeros(1, steps + 1);
    X(1) = sum(m .* abs(psi) .^ 2);
    for n = 1:steps
        t = (n - 1) * dt;
        H1 = TODO; H2 = TODO; H3 = TODO;                           % TODO B3
        k1 = -1i * H1 * psi;
        k2 = -1i * H2 * (psi + dt / 2 * k1);
        k3 = -1i * H2 * (psi + dt / 2 * k2);
        k4 = -1i * H3 * (psi + dt * k3);
        psi = psi + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
        X(n + 1) = sum(m .* abs(psi) .^ 2);
    end
end


% B4. The Zak phase at one time of the cycle. cycle(s) gives J1, J2, Delta at the time s = t/T.
%     Write the Zak phase at this time on M points. Use zak_ssh. Compare gamma/2pi with the position X of B3.
function gamma = zak_pump(s, M, cycle)
    [J1, J2, Delta] = cycle(s);
    gamma = TODO;                                                  % TODO B4
end


% B6. Cut the (k, t) plane into small squares: plaquettes. The Berry phase of one plaquette with the corners
%     a -> b -> c -> d -> a is minus the angle of the product of the four overlaps around it. Write it.
function F = plaquette(a, b, c, d)
    F = TODO;                                                      % TODO B6
end


function U = grid_kt(N, cycle, band)               % given: U(:, i, j) = eigenvector at k_i = 2 pi (i-1)/N
    U = zeros(2, N, N);                            % and t_j = (j-1) T/N
    for i = 1:N
        for j = 1:N
            [J1, J2, Delta] = cycle((j - 1) / N);
            U(:, i, j) = eigenvector(H_k(2 * pi * (i - 1) / N, J1, J2, Delta), band);
        end
    end
end


function F = plaquettes(U)                         % given: F(i, j) = plaquette that starts at the point (k_i, t_j):
    N = size(U, 2);                                % (i, j) -> (i, j+1) -> (i+1, j+1) -> (i+1, j) -> back to (i, j).
    F = zeros(N, N);                               % Point N + 1 is point 1 again: the grid closes in k and in t.
    for i = 1:N
        for j = 1:N
            i2 = mod(i, N) + 1;                    % the next point in k
            j2 = mod(j, N) + 1;                    % the next point in t
            F(i, j) = plaquette(U(:, i, j), U(:, i, j2), U(:, i2, j2), U(:, i2, j));
        end
    end
end


% B7. Inner edges are walked once in each direction and drop out. So the plaquettes between two times add up to the
%     change of gamma, up to a multiple of 2 pi. On a fine grid every plaquette is small and nothing is left over:
%     all plaquettes together give gamma(T) - gamma(0), without the rule of B5.
%     Write the Chern number: the sum of all plaquette phases, divided by 2 pi. Do not round it.
function C = chern(U)
    C = TODO;                                                      % TODO B7
end


function [J1, J2, Delta] = pump_back(s)            % given: the cycle run backwards, Delta -> -Delta
    J1 = 1 + cos(2 * pi * s);
    J2 = 1 - cos(2 * pi * s);
    Delta = -0.5 * sin(2 * pi * s);
end


function [J1, J2, Delta] = pump_aside(s)           % given: one more cycle
    J1 = 2.5 + 0.5 * cos(2 * pi * s);
    J2 = 1 - 0.5 * cos(2 * pi * s);
    Delta = 0.2 * sin(2 * pi * s);
end


% ====================================================================================================================
% Part C: 2D lattices. The same functions, with k_y in place of the time t.
% ====================================================================================================================

function U = grid_2d(H, N, band)                   % given: U(:, i, j) = eigenvector of H(x_i, y_j),
    sites = size(H(0, 0), 1);                      % x_i = 2 pi (i-1)/N, y_j = 2 pi (j-1)/N.
    U = zeros(sites, N, N);                        % H is a function of two variables, for example @H_hofstadter
    for i = 1:N
        for j = 1:N
            U(:, i, j) = eigenvector(H(2 * pi * (i - 1) / N, 2 * pi * (j - 1) / N), band);
        end
    end
end


function H = H_hofstadter(kappa, ky)               % given: Harper-Hofstadter lattice, flux 1/3, three sites per cell.
    H = zeros(3, 3);                               % kappa = 3 k_x. Only the link that leaves the cell has a phase.
    for j = 1:3
        H(j, j) = 2 * cos(ky + 2 * pi * (j - 1) / 3);
    end
    H(1, 2) = 1;
    H(2, 1) = 1;
    H(2, 3) = 1;
    H(3, 2) = 1;
    H(3, 1) = exp(1i * kappa);
    H(1, 3) = conj(H(3, 1));                       % exp(-i kappa)
end


function H = H_haldane(k1, k2, m, phi)             % given: Haldane model. k1, k2 = k times the two lattice vectors.
    t1 = 1.0;                                      % On-site term +m on A, -m on B.
    t2 = 0.1;
    f = t1 * (1 + exp(-1i * k1) + exp(-1i * k2));
    s = sin(k1) + sin(k2 - k1) - sin(k2);
    c = cos(k1) + cos(k2 - k1) + cos(k2);
    H = [m + 2 * t2 * (cos(phi) * c + sin(phi) * s), f; conj(f), -m + 2 * t2 * (cos(phi) * c - sin(phi) * s)];
end


% ====================================================================================================================
% Given: the figures. You do not have to read this part.
% ====================================================================================================================

function draw(FIGURES, name, varargin)             % given: draws the figure of one step, if FIGURES is true
    if ~FIGURES
        if strcmp(name, 'B1')
            fprintf(['         No figures: no figure window can open here, or FIGURES is false. ' ...
                     'All steps run without figures.\n']);
        end
        return
    end
    BLUE = [37, 125, 224] / 255;
    ORANGE = [244, 114, 48] / 255;
    AQUA = [0, 184, 148] / 255;
    INK = [25, 25, 25] / 255;
    try
        switch name
            case 'B1'                              % the two bands over k and t/T
                k_grid = linspace(0, 2 * pi, 41);
                s_grid = linspace(0, 1, 41);
                E = zeros(41, 41);
                for j = 1:41
                    [J1, J2, Delta] = pump(s_grid(j));
                    for i = 1:41
                        E(i, j) = band_energy(k_grid(i), J1, J2, Delta);
                    end
                end
                show_figure(1);
                mesh(k_grid / pi, s_grid, E.', 'EdgeColor', ORANGE); hold on;
                mesh(k_grid / pi, s_grid, -E.', 'EdgeColor', BLUE); hold off;
                xlabel('k / pi'); ylabel('t / T'); zlabel('E');
                title('B1: upper band (orange) and lower band (blue)');
            case 'B2'                              % all eigenvalues of the open chain over t/T
                ss = linspace(0, 1, 161);
                levels = zeros(161, 80);
                for n = 1:161
                    [J1, J2, Delta] = pump(ss(n));
                    levels(n, :) = sort(real(eig(H_chain(40, J1, J2, Delta))));
                end
                show_figure(2);
                plot(ss, levels, '.', 'Color', INK, 'MarkerSize', 4);
                xlabel('t / T'); ylabel('eigenvalues'); title('B2: all eigenvalues of the open chain of 40 cells');
            case 'B3'                              % the position of the light during one cycle
                X20 = varargin{1};
                X50 = varargin{2};
                X_guide = varargin{3};
                show_figure(3);
                plot(linspace(0, 1, numel(X20)), X20, 'Color', BLUE, 'LineWidth', 2); hold on;
                plot(linspace(0, 1, numel(X50)), X50, 'Color', ORANGE, 'LineWidth', 2);
                plot(linspace(0, 1, numel(X_guide)), X_guide, 'Color', AQUA, 'LineWidth', 2); hold off;
                xlabel('t / T'); ylabel('X (unit cells)'); title('B3: position of the light');
                legend('T = 20', 'T = 50', 'one guide, T = 50', 'Location', 'northwest'); grid on;
            case 'B5'                              % gamma/2pi on top of the position X of B3
                X_slow = varargin{1};
                s_list = varargin{2};
                gamma = varargin{3};
                show_figure(4);
                plot(linspace(0, 1, numel(X_slow)), X_slow, 'Color', BLUE, 'LineWidth', 2); hold on;
                plot(s_list, gamma / (2 * pi), 'o', 'Color', ORANGE, 'MarkerFaceColor', ORANGE, 'MarkerSize', 6);
                hold off;
                xlabel('t / T'); ylabel('unit cells'); title('B5: the light follows the Zak phase');
                legend('X(t) of B3, slowest cycle', 'gamma(t) / 2pi', 'Location', 'northwest'); grid on;
            case 'B7'                              % the 16 plaquette phases and the sum of each column
                F = varargin{1};
                show_figure(5);
                imagesc([0.125, 0.875], [0.25, 1.75], F / pi); axis xy;
                top = max(abs(F(:))) / pi;
                caxis([-top, top]);
                colormap(interp1([0; 0.5; 1], [BLUE; 0.94, 0.94, 0.94; 0.86, 0.24, 0.24], linspace(0, 1, 64)'));
                colorbar;
                for i = 1:4
                    for j = 1:4
                        text((j - 0.5) / 4, (i - 0.5) / 2, sprintf('%.4f', F(i, j) / pi), ...
                             'HorizontalAlignment', 'center');
                    end
                end
                xlabel('t / T'); ylabel('k / pi');
                title(sprintf('B7: F / pi. Sum of each t column: %.4f  %.4f  %.4f  %.4f', sum(F, 1) / pi));
            case 'B8'                              % the cycles in the plane (J1 - J2, Delta)
                show_figure(6); hold on;
                cycles = {@pump, @pump_sheet, @pump_aside};
                colors = {BLUE, ORANGE, AQUA};
                for n = 1:3
                    cycle = cycles{n};
                    [J1, J2, Delta] = cycle(linspace(0, 1, 201));
                    plot(J1 - J2, Delta, 'Color', colors{n}, 'LineWidth', 2);
                end
                for n = 1:3                        % one arrow head on each cycle: the direction in which t runs
                    cycle = cycles{n};
                    [J1, J2, Delta] = cycle([0.12, 0.125]);
                    d = [diff(J1 - J2) / 6.9; diff(Delta) / 1.6];      % the direction on the screen
                    d = d / norm(d);
                    for turn = [-0.45, 0.45]                           % the two strokes of the arrow head
                        stroke = 0.04 * [cos(turn), -sin(turn); sin(turn), cos(turn)] * d;
                        plot(J1(2) - J2(2) - [6.9 * stroke(1), 0], Delta(2) - [1.6 * stroke(2), 0], ...
                             'Color', colors{n}, 'LineWidth', 2);
                    end
                end
                plot(0, 0, 'x', 'Color', INK, 'MarkerSize', 9);
                text(0.1, -0.08, 'gap closed');
                hold off; grid on; xlim([-2.3, 4.6]); ylim([-0.8, 0.8]);
                xlabel('J1 - J2'); ylabel('Delta');
                legend({'pump', 'pump_sheet', 'pump_aside'}, 'Location', 'east', 'Interpreter', 'none');
                title('B8: the cycles. pump_back is pump with the arrow reversed', 'Interpreter', 'none');
        end
        drawnow;
    catch err
        fprintf('         The figure of step %s could not be drawn: %s\n', name, err.message);
    end
end


function show_figure(n)                            % given: makes figure n the current figure and empties it.
    if ishghandle(n) && strcmp(get(n, 'Type'), 'figure')           % A window that is open stays where it is
        set(0, 'CurrentFigure', n);
    else
        figure(n);
    end
    clf;
end


function x = TODO()                                % given: every line that you write is marked TODO
    x = NaN;
end
