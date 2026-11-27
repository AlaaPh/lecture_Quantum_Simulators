function zak_chern_check(g, label, varargin)
% Checks for zak_chern.m. Keep this file in the same folder. You do not have to read it or change it.
% Tested with GNU Octave 8.4. Not yet run in MATLAB.
%
% check(label, ...) tests one step of zak_chern.m.
%   Right:  it prints "A2 OK" and the result of the step. You can type these numbers into the web page:
%           a complex number is printed as "Re Im", an angle in units of pi or in degrees, as stated in the line.
%   Open or wrong:  it prints "A2: not yet." and one hint, and the run stops at this step.
% Every function is tested first on fixed vectors, then with two sets of random phase factors on all vectors.
% Angles count modulo 2 pi: -pi and pi are the same angle.
%
% g holds the functions of zak_chern.m and the name of that file. zak_chern.m passes it on in every call.
    if nargin == 0
        fprintf('This file only holds the checks. Run zak_chern.m.\n');
        return
    end
    if nargin < 2 || ~isstruct(g) || ~ischar(label)
        error('zak_chern:usage', 'Call the check as zak_chern.m does: check(''A1'', @h).');
    end
    [g.todo, g.cut] = scan_todo_(g);
    switch label
        case 'end'
            fprintf('All steps are done.\n');
        case 'A1'
            A1_(g, label, varargin);
        case 'A2'
            A2_(g, label, varargin);
        case 'A3'
            A3_(g, label, varargin);
        case 'A4'
            A4_(g, label, varargin);
        case 'A5'
            A5_(g, label, varargin);
        case 'A6'
            A6_(g, label, varargin);
        case 'A7'
            A7_(g, label, varargin);
        case 'B1'
            B1_(g, label, varargin);
        case 'B2'
            B2_(g, label, varargin);
        case 'B3'
            B3_(g, label, varargin);
        case 'B4'
            B4_(g, label, varargin);
        case 'B5'
            B5_(g, label, varargin);
        case 'B6'
            B6_(g, label, varargin);
        case 'B7'
            B7_(g, label, varargin);
        case 'B8'
            B8_(g, label, varargin);
        case 'C1'
            C1_(g, label, varargin);
        case 'C2'
            C2_(g, label, varargin);
        otherwise
            changed_(g, label, sprintf('check does not know the step ''%s''.', label));
    end
end


% The expected numbers of all steps are at the end of this file. That block is generated. Do not change it.


function text = hint_(key)
    switch key
        case '1'
            text = ['Overlap of (1, i)/sqrt(2) with itself is not 1 -> the complex conjugate is missing ' ...
                    '(MATLAB: u'' * v).'];
        case '2'
            text = 'The loop over the four hand vectors gives -0.2 - 0.12i -> the loop is not closed.';
        case '3'
            text = 'H u is not E u -> row taken instead of column.';
        case '4'
            text = 'E > 0 -> upper band (MATLAB: the eigenvalues must be sorted in rising order).';
        case '5'
            text = ['The result changes when the random phases change -> a phase does not cancel: ' ...
                    'conjugate, closing overlap.'];
        case '6'
            text = 'A7 gives -0.7079 pi -> one of: +arg; upper band; exp(-ik) in h; -Delta on A.';
        case '7'
            text = 'B5 gives 0 -> no unwrap.';
        case '8'
            text = 'B7 gives 0 -> arg of the total product instead of the sum of the args; or both bands added.';
        case '9'
            text = ['Task 9 on a 3 x 3 grid gives 0; three k points give a zero overlap for J1 = 1, J2 = 2 ' ...
                    '-> use 4 points or more, an even number.'];
        case '10'
            text = '0 and pi swapped -> the unit cell holds the J2 pair.';
        case '11 norm'
            text = 'B3: the norm leaves 1 -> step too large, or H not symmetric.';
        case '11 back'
            text = ['B3: the light moves to lower cell numbers -> the input is the upper band ' ...
                    '(with -J the lower band is (A + B)/sqrt(2)).'];
        case '11 still'
            text = 'B3: the light hardly moves -> one guide alone as input.';
        case 'cut'
            text = ['Do not cut or round the result. floor( ) and fix( ) turn a number like 0.9999999999999998 ' ...
                    'into 0.'];
        otherwise
            text = '';
    end
end


% ---------------------------------------------------------------- printing

function text = pad_()
    text = repmat(' ', 1, 9);
end


function text = fmt_(x, digits)
    % A real number with a fixed number of decimals. Zero is never printed as -0.0000.
    if nargin < 2
        digits = 4;
    end
    text = sprintf(sprintf('%%.%df', digits), double(real(x)));
    if text(1) == '-' && str2double(text) == 0
        text = text(2:end);
    end
end


function text = fc_(z)
    % A complex number as "Re Im".
    text = [fmt_(real(z)) ' ' fmt_(imag(z))];
end


function text = fcw_(z)
    % A complex number as "Re Im" in two columns of equal width, for tables.
    text = sprintf('%8s %8s', fmt_(real(z)), fmt_(imag(z)));
end


function text = fv_(u)
    % A vector with complex entries as "(0.6, 0.8i)".
    text = '(';
    for n = 1:numel(u)
        z = u(n);
        if abs(imag(z)) < 5e-5
            entry = sprintf('%.4g', real(z));
        elseif abs(real(z)) < 5e-5
            entry = sprintf('%.4gi', imag(z));
        else
            entry = sprintf('%.4g%+.4gi', real(z), imag(z));
        end
        if n > 1
            text = [text ', ']; %#ok<AGROW>
        end
        text = [text entry]; %#ok<AGROW>
    end
    text = [text ')'];
end


function text = row_(values, digits)
    if nargin < 2
        digits = 4;
    end
    text = '';
    for n = 1:numel(values)
        if n > 1
            text = [text ' ']; %#ok<AGROW>
        end
        text = [text fmt_(values(n), digits)]; %#ok<AGROW>
    end
end


function x = wrap_(gamma)
    % The same angle between -pi and pi. The angle -pi becomes pi.
    x = mod(gamma + pi, 2 * pi) - pi;
    if abs(x + pi) < 1e-4
        x = pi;
    end
end


function text = in_pi_(gamma)
    % An angle in units of pi, between -1 and 1.
    text = fmt_(wrap_(gamma) / pi);
end


function text = in_degrees_(angle_rad)
    % An angle in degrees with two decimals, between -180 and 180. -180 is printed as 180.
    x = mod(angle_rad * 180 / pi + 180, 360) - 180;
    if abs(x + 180) < 5e-3
        x = 180;
    end
    text = fmt_(x, 2);
end


function text = describe_(value)
    if isnumeric(value) || islogical(value)
        if isempty(value)
            text = 'an empty array';
        elseif numel(value) == 1
            if isreal(value)
                text = sprintf('%g', double(value));
            else
                text = sprintf('%g%+gi', real(value), imag(value));
            end
        else
            text = ['an array of size ' size_text_(size(value))];
        end
    elseif ischar(value)
        text = ['the text ''' value ''''];
    elseif isa(value, 'function_handle')
        text = 'a function';
    else
        text = ['a value of the class ' class(value)];
    end
end


function text = size_text_(shape)
    text = sprintf('%d', shape(1));
    for n = 2:numel(shape)
        text = [text sprintf(' x %d', shape(n))]; %#ok<AGROW>
    end
end


function ok_(label, lines)
    fprintf('%-8s %s\n', [label ' OK'], lines{1});
    for n = 2:numel(lines)
        fprintf('%s%s\n', pad_(), lines{n});
    end
end


function name = file_(g)
    name = 'zak_chern.m';
    if isfield(g, 'file') && ischar(g.file)
        [~, base, extension] = fileparts(g.file);
        name = [base extension];
    end
end


function stop_(g, label, what, hint, where)
    % The message of an open or wrong step. zak_chern.m catches this error and prints the message.
    % where: what to correct, if it is not the step itself.
    if nargin < 5 || isempty(where)
        where = ['step ' label];
    end
    text = sprintf(['%s: not yet. %s\n%sHint: %s\n%sThe run stops here. ' ...
                    'Correct %s in %s and run the file again.'], ...
                   label, what, pad_(), hint, pad_(), where, file_(g));
    error('zak_chern:stop', '%s', text);
end


% ---------------------------------------------------------------- reading what the student gives

function open_(g, label, todo)
    stop_(g, label, 'This step is open.', todo);
end


function changed_(g, label, what)
    if nargin < 3 || isempty(what)
        what = 'The given lines of this step were changed.';
    end
    stop_(g, label, what, sprintf('Restore the given lines of step %s. Change only the lines marked TODO.', label));
end


function args_(g, label, values, n)
    if numel(values) ~= n
        changed_(g, label, sprintf('The line check(''%s'', ...) was changed.', label));
    end
end


function fun = need_(g, label, name)
    if ~isfield(g, name) || ~isa(g.(name), 'function_handle')
        changed_(g, label, sprintf('The function %s is missing in %s.', name, file_(g)));
    end
    fun = g.(name);
end


function [found, cut] = scan_todo_(g)
    % For every function of zak_chern.m: does its body still contain the word TODO? found.(name) = true or false.
    % cut.(name) = the name of a function in its body that cuts a number to an integer (floor, fix, ceil), or ''.
    found = struct();
    cut = struct();
    try
        all_lines = regexp(fileread(g.file), '\r?\n', 'split');
        name = '';
        for n = 1:numel(all_lines)
            code = regexprep(all_lines{n}, '%.*$', '');                 % the line without its comment
            head = regexp(code, '^function\s+(?:.*=\s*)?(\w+)', 'tokens', 'once');
            if ~isempty(head)
                name = head{1};
                found.(name) = false;
                cut.(name) = '';
            elseif ~isempty(name)
                if ~isempty(regexp(code, '(^|[^A-Za-z0-9_])TODO($|[^A-Za-z0-9_])', 'once'))
                    found.(name) = true;
                end
                word = regexp(code, '(?:^|[^A-Za-z0-9_])(floor|fix|ceil)\s*\(', 'tokens', 'once');
                if ~isempty(word)
                    cut.(name) = word{1};
                end
            end
        end
    catch
        found = struct();
        cut = struct();
    end
end


function yes = cut_values_(values, wants, one_right)
    % True if the wrong values are whole numbers that miss the right number by exactly 1 (and one value is right).
    off = abs(values - wants);
    wrong = off > 1e-9;
    yes = any(wrong) && all(values(wrong) == round(values(wrong))) && all(off < 1e-9 | abs(off - 1) < 1e-9) ...
          && (~all(wrong) || ~one_right);
end


function word = cut_in_(g, name)
    % The name of a function that cuts a number to an integer in the function name of zak_chern.m, or ''.
    word = '';
    if isa(name, 'function_handle')
        name = regexprep(func2str(name), '^.*[>/]', '');
    end
    if isfield(g, 'cut') && isvarname(name) && isfield(g.cut, name)
        word = g.cut.(name);
    end
end


function state = todo_state_(g, fun)
    % 1: the body of this function of zak_chern.m still contains the word TODO. 0: it does not. -1: not known.
    state = -1;
    try
        name = regexprep(func2str(fun), '^.*[>/]', '');
        if isfield(g, 'todo') && isvarname(name) && isfield(g.todo, name)
            state = double(g.todo.(name));
        end
    catch
        state = -1;
    end
end


function failed_(g, label, todo, err)
    % An error inside a function of the student: the message, with the line of zak_chern.m if it is known.
    place = '';
    try
        for n = 1:numel(err.stack)
            [~, base, extension] = fileparts(err.stack(n).file);
            if strcmp([base extension], file_(g))
                place = sprintf(' in line %d of %s', err.stack(n).line, file_(g));
                break
            end
        end
    catch
        place = '';
    end
    stop_(g, label, sprintf('The code stopped with an error%s: %s', place, err.message), todo);
end


function yes = is_nothing_(value)
    % What an open line gives: an empty array, or nothing but NaN.
    yes = (isnumeric(value) || islogical(value)) && (isempty(value) || all(isnan(double(value(:)))));
end


function out = call_(g, label, todo, fun, varargin)
    % Calls a function of the student. An open TODO or an error stops the run with a message.
    out = [];
    if ~isa(fun, 'function_handle')
        changed_(g, label);
    end
    state = todo_state_(g, fun);
    try
        out = fun(varargin{:});
    catch err
        if state == 1                                    % a line with TODO was run: the step is open
            open_(g, label, todo);
        end
        failed_(g, label, todo, err);
    end
    if (isnumeric(out) && isempty(out)) || (state ~= 0 && is_nothing_(out))
        open_(g, label, todo);
    end
end


function [first, second] = call2_(g, label, todo, fun, varargin)
    % The same for a function with two results.
    first = [];
    second = [];
    if ~isa(fun, 'function_handle')
        changed_(g, label);
    end
    state = todo_state_(g, fun);
    try
        [first, second] = fun(varargin{:});
    catch err
        if state == 1
            open_(g, label, todo);
        end
        failed_(g, label, todo, err);
    end
    if (isnumeric(first) && isempty(first)) || (state ~= 0 && is_nothing_(first))
        open_(g, label, todo);
    end
end


function number = complex_(g, label, todo, name, value)
    % One finite complex number.
    fine = (isnumeric(value) || islogical(value)) && numel(value) == 1;
    if fine
        number = double(value);
        fine = isfinite(real(number)) && isfinite(imag(number));
    end
    if ~fine
        number = 0;
        if isnumeric(value) && isempty(value)
            open_(g, label, todo);
        end
        stop_(g, label, sprintf('%s must be one number. You give %s.', name, describe_(value)), todo);
    end
end


function number = real_(g, label, todo, name, value)
    % One finite real number.
    number = complex_(g, label, todo, name, value);
    if abs(imag(number)) > 1e-9
        stop_(g, label, sprintf('%s must be a real number. You give the complex number %s (Re Im).', ...
                                name, fc_(number)), todo);
    end
    number = real(number);
end


function array = array_(g, label, todo, name, value, shape, must_be_real)
    % An array of finite numbers. shape = n: a row or a column of n numbers, returned as a column.
    % shape = [rows, columns]: a matrix of exactly this size.
    fine = isnumeric(value) || islogical(value);
    if fine && numel(shape) == 1
        fine = isvector(value) && numel(value) == shape;
        wanted = sprintf('%d entries', shape);
    elseif fine
        fine = isequal(size(value), shape);
        wanted = ['the size ' size_text_(shape)];
    else
        wanted = 'numbers';
    end
    if fine
        array = double(value);
        fine = all(isfinite(real(array(:)))) && all(isfinite(imag(array(:))));
    end
    if ~fine
        array = [];
        if isnumeric(value) && isempty(value)
            open_(g, label, todo);
        end
        stop_(g, label, sprintf('%s must be an array of finite numbers with %s. You give %s.', ...
                                name, wanted, describe_(value)), todo);
    end
    if numel(shape) == 1
        array = array(:);
    end
    if must_be_real
        if max(abs(imag(array(:)))) > 1e-9
            stop_(g, label, sprintf('%s must be real numbers. You give complex numbers.', name), todo);
        end
        array = real(array);
    end
end


function yes = close_(a, b, tol)
    if nargin < 3
        tol = 1e-9;
    end
    a = a(:);
    b = b(:);
    if numel(a) ~= numel(b) && numel(a) ~= 1 && numel(b) ~= 1
        yes = false;
        return
    end
    yes = all(abs(a - b) < tol);
end


function yes = same_angle_(a, b, tol)
    % Two angles are the same if they differ by a multiple of 2 pi.
    if nargin < 3
        tol = 1e-5;
    end
    yes = all(abs(exp(1i * a(:)) - exp(1i * b(:))) < tol(:));
end


% ---------------------------------------------------------------- fixed vectors and reference formulas

function k = ks4_()
    k = [0, pi / 2, pi, 3 * pi / 2];
end


function e = e4_()
    e = [1, 1i, -1, -1i];                                    % exp(ik) at these four k, exact
end


function q = quarters_()
    q = [2, 0, 0; 1, 1, 0.5; 0, 2, 0; 1, 1, -0.5];           % rows: J1, J2, Delta at t = 0, T/4, T/2, 3T/4
end


function u = u_fixed_(h, D)
    % Lower-band eigenvector of [D, conj(h); h, -D], with a real B component that is not negative.
    a = abs(h);
    if a < 1e-13
        if D > 0
            u = [0; 1];
        else
            u = [-1; 0];
        end
        return
    end
    c = D / hypot(D, a);
    u = [-sqrt((1 - c) / 2) * conj(h) / a; sqrt((1 + c) / 2)];
end


function us = hand_(J1, J2, D)
    % The four hand vectors at k = 0, pi/2, pi, 3 pi/2 as the columns of us.
    e = e4_();
    us = zeros(2, 4);
    for s = 1:4
        us(:, s) = u_fixed_(J1 + J2 * e(s), D);
    end
end


function U = grid_()
    % U(:, i, j): the hand vector of the pump at k_i and t_j, on the 4 x 4 grid.
    e = e4_();
    q = quarters_();
    U = zeros(2, 4, 4);
    for i = 1:4
        for j = 1:4
            U(:, i, j) = u_fixed_(q(j, 1) + q(j, 2) * e(i), q(j, 3));
        end
    end
end


function us = free_()
    us = [0.6, (1 + 2i) / 3, 0.8, (2 - 1i) / 3; 0.8i, 2 / 3, -0.6, 2i / 3];
end


function H = hk_(k, J1, J2, D)
    h = J1 + J2 * exp(1i * k);
    H = [D, conj(h); h, -D];
end


function [E, V] = sorted_eig_(H)
    [V, E] = eig(H);
    [E, idx] = sort(real(diag(E)));
    V = V(:, idx);
end


function p = loop_(us)
    M = size(us, 2);
    p = 1;
    for s = 1:M
        p = p * (us(:, s)' * us(:, mod(s, M) + 1));
    end
end


function p = open_loop_(us)
    % The product without the closing overlap.
    p = 1;
    for s = 1:size(us, 2) - 1
        p = p * (us(:, s)' * us(:, s + 1));
    end
end


function F = plaquette_ref_(a, b, c, d)
    F = -angle((a' * b) * (b' * c) * (c' * d) * (d' * a));
end


function [J1, J2, D] = pump_ref_(s)
    J1 = 1 + cos(2 * pi * s);
    J2 = 1 - cos(2 * pi * s);
    D = 0.5 * sin(2 * pi * s);
end


function H = chain_(N, J1, J2, D)
    H = zeros(2 * N);
    for m = 1:N
        H(2 * m - 1, 2 * m - 1) = D;
        H(2 * m, 2 * m) = -D;
        H(2 * m - 1, 2 * m) = J1;
        H(2 * m, 2 * m - 1) = J1;
        if m < N
            H(2 * m, 2 * m + 1) = J2;
            H(2 * m + 1, 2 * m) = J2;
        end
    end
end


function H = chain_at_(N, t, T)
    [J1, J2, D] = pump_ref_(t / T);
    H = chain_(N, J1, J2, D);
end


function psi = runge_kutta_(psi, T, dt, at)
    % One cycle with Runge-Kutta steps. at = the three times of H inside one step, in units of dt.
    N = numel(psi) / 2;
    for n = 1:round(T / dt)
        t = (n - 1) * dt;
        H1 = chain_at_(N, t + at(1) * dt, T);
        H2 = chain_at_(N, t + at(2) * dt, T);
        H3 = chain_at_(N, t + at(3) * dt, T);
        k1 = -1i * H1 * psi;
        k2 = -1i * H2 * (psi + dt / 2 * k1);
        k3 = -1i * H2 * (psi + dt / 2 * k2);
        k4 = -1i * H3 * (psi + dt * k3);
        psi = psi + dt / 6 * (k1 + 2 * k2 + 2 * k3 + k4);
    end
end


function chi = phase_table_(seed)
    % 16 phases between 0 and 2 pi, drawn once at random for each of the two seeds.
    table = [3.2158701122134374, 5.971939531762716, 0.9057815605287021, 5.960540267916768, ...
             1.9592947975887585, 2.659838524324996, 5.200608776207033, 2.57107400134529, ...
             3.453198983306014, 0.17315901540774553, 4.734462493192759, 3.381254158776311, ...
             2.0717654764182005, 4.953843645140002, 1.9050292966180866, 2.8494112760217813; ...
             1.6437575180951982, 1.8754751666228542, 5.115931210029399, 0.5775248971188099, ...
             3.770542807578139, 4.577680797454887, 1.1806172633803163, 0.3464964785996422, ...
             1.7276834923516766, 4.130773459521102, 3.5328193511135773, 0.9428690079622023, ...
             2.718299428218124, 4.2053189525384145, 2.656434447191589, 3.978414914254461];
    chi = table(seed, :);
end


function us = phases_(us, seed)
    % The same vectors (the columns of us), each one multiplied by a random phase factor.
    chi = phase_table_(seed);
    for s = 1:size(us, 2)
        us(:, s) = us(:, s) * exp(1i * chi(s));
    end
end


function U = phases_grid_(U, seed)
    chi = phase_table_(seed);
    n = 0;
    for i = 1:size(U, 2)
        for j = 1:size(U, 3)
            n = n + 1;
            U(:, i, j) = U(:, i, j) * exp(1i * chi(n));
        end
    end
end


function [E, miss] = energy_(H, u)
    % E = <u|H|u>/<u|u> and the length of H u - E u.
    E = real((u' * H * u) / (u' * u));
    miss = norm(H * u - E * u) / norm(u);
end


% ---------------------------------------------------------------- Part A

function A1_(g, label, values)
    args_(g, label, values, 1);
    h = values{1};
    todo = 'Write h(k) = J1 + J2 exp(ik). In MATLAB the imaginary unit is 1i, the exponential function is exp.';
    k4 = ks4_();
    e4 = e4_();
    pairs = [1, 2; 2, 1];
    got = zeros(1, 8);
    want = zeros(1, 8);
    for p = 1:2
        for s = 1:4
            n = 4 * (p - 1) + s;
            got(n) = complex_(g, label, todo, 'h(k, J1, J2)', ...
                              call_(g, label, todo, h, k4(s), pairs(p, 1), pairs(p, 2)));
            want(n) = pairs(p, 1) + pairs(p, 2) * e4(s);
        end
    end
    if ~close_(got, want)
        n = find(~(abs(got - want) < 1e-9), 1);
        p = ceil(n / 4);
        k_names = {'0', 'pi/2', 'pi', '3 pi/2'};
        seen = sprintf('For J1 = %d, J2 = %d and k = %s your h is %s (Re Im).', ...
                       pairs(p, 1), pairs(p, 2), k_names{n - 4 * (p - 1)}, fc_(got(n)));
        if close_(got, conj(want))
            stop_(g, label, [seen ' The imaginary part has the wrong sign.'], 'exp(-ik) in h. The exponent is +ik.');
        end
        if close_(got, [want(5:8), want(1:4)])
            stop_(g, label, [seen ' J1 and J2 are exchanged: J1 has no factor, J2 has the factor exp(ik).'], todo);
        end
        stop_(g, label, [seen ' Calculate this number by hand and compare.'], todo);
    end
    free = complex_(g, label, todo, 'h(k, J1, J2)', call_(g, label, todo, h, 0.7, 1.3, 0.6));
    if abs(free - (1.3 + 0.6 * exp(0.7i))) > 1e-9
        stop_(g, label, sprintf(['For J1 = 1.3, J2 = 0.6 and k = 0.7 your h is %s (Re Im). Calculate this number ' ...
                                 'by hand and compare.'], fc_(free)), todo);
    end
    N = numbers_();
    numbers = N.A.set1;
    lines = {'J1 = 1, J2 = 2. Columns: k/pi | h (Re Im) | phi in degrees | E = -|h| | u_A (Re Im) | is H u = E u?'};
    k_names = {'0', '0.5', '1', '1.5'};
    for s = 1:4
        hs = got(s);
        u = [-exp(-1i * angle(hs)); 1] / sqrt(2);
        H = [0, conj(hs); hs, 0];
        fine = close_(H * u, -abs(hs) * u) && abs(-abs(hs) - numbers.E(s)) < 2e-6 ...
               && abs(u(1) - complex(numbers.uA(s, 1), numbers.uA(s, 2))) < 2e-6;
        if fine
            word = 'yes';
        else
            word = 'no';
        end
        lines{end + 1} = sprintf('%-4s %s %10s %10s   %s    %s', k_names{s}, fcw_(hs), in_degrees_(angle(hs)), ...
                                 fmt_(-abs(hs)), fcw_(u(1)), word); %#ok<AGROW>
    end
    ok_(label, lines);
end


function A2_(g, label, values)
    args_(g, label, values, 1);
    overlap = values{1};
    todo = ['Write <u|v> = the sum of conj(u_j) v_j over all entries j: one complex number. u and v are columns. ' ...
            'u'' is the complex conjugate transpose of u, so u'' * v does all of it.'];
    w = [1; 1i] / sqrt(2);
    self_overlap = complex_(g, label, todo, 'overlap(u, v)', call_(g, label, todo, overlap, w, w));
    if abs(self_overlap - 1) > 1e-9
        seen = sprintf('The overlap of (1, i)/sqrt(2) with itself is %s (Re Im), not 1.', fc_(self_overlap));
        if abs(self_overlap) < 1e-9
            stop_(g, label, seen, hint_('1'));
        end
        stop_(g, label, seen, todo);
    end
    free = free_();
    pairs = {[1; 0], [1i; 0]; free(:, 1), free(:, 2); free(:, 2), free(:, 4)};
    for n = 1:3
        u = pairs{n, 1};
        v = pairs{n, 2};
        got = complex_(g, label, todo, 'overlap(u, v)', call_(g, label, todo, overlap, u, v));
        want = u' * v;
        if abs(got - want) > 1e-9
            seen = sprintf('For u = %s and v = %s your overlap is %s (Re Im).', fv_(u), fv_(v), fc_(got));
            if abs(got - conj(want)) < 1e-9
                stop_(g, label, [seen ' This is <v|u>, the complex conjugate of <u|v>.'], ...
                      'The complex conjugate belongs on the first vector u, not on v.');
            end
            if abs(got - sum(u .* v)) < 1e-9
                stop_(g, label, [seen ' The complex conjugate is missing.'], hint_('1'));
            end
            stop_(g, label, [seen ' Calculate conj(u_A) v_A + conj(u_B) v_B by hand and compare.'], todo);
        end
    end
    u = [1; 2i; 2] / 3;
    v = [2i; 1; -2] / 3;
    got = complex_(g, label, todo, 'overlap(u, v)', call_(g, label, todo, overlap, u, v));
    if abs(got - u' * v) > 1e-9
        stop_(g, label, sprintf(['For vectors with three entries, u = %s and v = %s, your overlap is %s (Re Im). ' ...
                                 'It must be the sum over all entries.'], fv_(u), fv_(v), fc_(got)), ...
              ['Part C has three guides per unit cell. Write the overlap for any number of entries: ' ...
               'u'' * v, or sum(conj(u) .* v).']);
    end
    N = numbers_();
    numbers = N.A.set1;
    hand1 = hand_(1, 2, 0);
    lines = {'overlaps of the four hand vectors, J1 = 1, J2 = 2. Columns: value (Re Im) | length | -arg in degrees'};
    for s = 1:4
        s2 = mod(s, 4) + 1;
        got = complex_(g, label, todo, 'overlap(u, v)', call_(g, label, todo, overlap, hand1(:, s), hand1(:, s2)));
        if abs(got - complex(numbers.ov(s, 1), numbers.ov(s, 2))) > 2e-6
            stop_(g, label, sprintf(['The overlap <u%d|u%d> of the hand vectors is %s (Re Im). ' ...
                                     'Compare with your paper.'], s, s2, fc_(got)), todo);
        end
        lines{end + 1} = sprintf('<u%d|u%d> = %s %10s %10s', s, s2, fcw_(got), fmt_(abs(got)), ...
                                 in_degrees_(-angle(got))); %#ok<AGROW>
    end
    ok_(label, lines);
end


function A3_(g, label, values)
    args_(g, label, values, 2);
    loop_product = values{1};
    zak = values{2};
    todo1 = ['Write the first line marked TODO A3, in loop_product: the overlap that closes the loop, <u_M|u_1>. ' ...
             'The last vector is us(:, end), the first is us(:, 1).'];
    todo2 = ['Write the second line marked TODO A3, in zak: gamma = -(angle of loop_product(us)). ' ...
             'angle gives the angle of a complex number.'];
    N = numbers_();
    numbers = N.A;
    hand1 = hand_(1, 2, 0);
    hand2 = hand_(2, 1, 0);
    hand_a7 = hand_(0, 4, 3);
    free = free_();
    name = 'loop_product(us)';
    product = complex_(g, label, todo1, name, call_(g, label, todo1, loop_product, hand1));
    shaken = zeros(1, 2);
    for seed = 1:2
        shaken(seed) = complex_(g, label, todo1, name, call_(g, label, todo1, loop_product, phases_(hand1, seed)));
    end
    seen = sprintf('The product over the four hand vectors (J1 = 1, J2 = 2) is %s (Re Im).', fc_(product));
    if abs(product - loop_(hand1)) > 1e-9 || ~close_(shaken, product)
        if abs(product - open_loop_(hand1)) < 1e-9
            stop_(g, label, seen, hint_('2'));
        end
        if ~close_(shaken, product)
            stop_(g, label, [seen sprintf(' With random phase factors on the vectors it is %s and %s.', ...
                                          fc_(shaken(1)), fc_(shaken(2)))], hint_('5'));
        end
        stop_(g, label, [seen ' It is not the product of the four overlaps of A2.'], todo1);
    end
    second = complex_(g, label, todo1, name, call_(g, label, todo1, loop_product, hand2));
    if abs(product - complex(numbers.set1.prod(1), numbers.set1.prod(2))) > 2e-6 ...
            || abs(second - complex(numbers.set2.prod(1), numbers.set2.prod(2))) > 2e-6
        stop_(g, label, [seen ' It is not the product of the four overlaps of A2.'], todo1);
    end
    loops = {[free, hand_a7(:, 2:3)], free(:, 1:3)};
    for n = 1:2
        vectors = loops{n};
        got = complex_(g, label, todo1, name, call_(g, label, todo1, loop_product, vectors));
        if abs(got - loop_(vectors)) > 1e-9
            stop_(g, label, sprintf('Your product is right for four vectors, but not for a loop of %d vectors.', ...
                                    size(vectors, 2)), ...
                  'The closing overlap goes from the last vector of the list, us(:, end), to the first, us(:, 1).');
        end
    end
    gamma = real_(g, label, todo2, 'zak(us)', call_(g, label, todo2, zak, hand1));
    gamma2 = real_(g, label, todo2, 'zak(us)', call_(g, label, todo2, zak, hand2));
    for seed = 1:2
        shaken(seed) = real_(g, label, todo2, 'zak(us)', call_(g, label, todo2, zak, phases_(hand1, seed)));
    end
    seen = sprintf('For the four hand vectors (J1 = 1, J2 = 2) your zak gives %s pi.', fmt_(gamma / pi));
    if abs(abs(gamma) - 180) < 1e-6
        stop_(g, label, sprintf(['For the four hand vectors (J1 = 1, J2 = 2) your zak gives %s. ' ...
                                 'This is an angle in degrees.'], fmt_(gamma)), ...
              'Keep the angle in radians, as angle gives it.');
    end
    units = {pi, 'pi'; 2 * pi, '2 pi'};
    for n = 1:2
        if abs(abs(gamma) * units{n, 1} - pi) < 1e-6
            stop_(g, label, sprintf(['For the four hand vectors (J1 = 1, J2 = 2) your zak gives %s. ' ...
                                     'This is the angle in units of %s.'], fmt_(gamma), units{n, 2}), ...
                  'Return the angle in radians, as angle gives it. Do not divide it.');
        end
    end
    there = real_(g, label, todo2, 'zak(us)', call_(g, label, todo2, zak, hand_a7));
    back = real_(g, label, todo2, 'zak(us)', call_(g, label, todo2, zak, hand_a7(:, end:-1:1)));
    if same_angle_(there, back) && ~same_angle_(there, -back)
        stop_(g, label, sprintf(['For a loop of four vectors your zak gives %s pi. For the same loop walked the ' ...
                                 'other way round it gives %s pi again. The two must have opposite signs.'], ...
                                fmt_(there / pi), fmt_(back / pi)), ...
              'The sign of the angle is lost. gamma = -angle(product), without abs.');
    end
    if ~same_angle_(shaken, gamma)
        stop_(g, label, [seen sprintf(' With random phase factors on the vectors it gives %s pi and %s pi.', ...
                                      fmt_(shaken(1) / pi), fmt_(shaken(2) / pi))], hint_('5'));
    end
    if ~(same_angle_(gamma, pi * numbers.set1.gamma_over_pi) && same_angle_(gamma2, pi * numbers.set2.gamma_over_pi))
        if same_angle_(gamma, -angle(open_loop_(hand1)))
            stop_(g, label, seen, hint_('2'));
        end
        stop_(g, label, [seen sprintf(' This is not minus the angle of the product %s (Re Im).', fc_(product))], todo2);
    end
    ok_(label, {sprintf(['J1 = 1, J2 = 2, four k points: product = %s    gamma/pi = %s    ' ...
                         '(-pi and pi are the same angle)'], fc_(product), in_pi_(gamma))});
end


function A4_(g, label, values)
    % Hand step A4, repeated with the functions of the student. Nothing is printed: A5_ prints one line for both.
    args_(g, label, values, 3);
    N = numbers_();
    numbers = N.A.set1.A4;
    got = zeros(1, 3);
    for n = 1:3
        got(n) = complex_(g, label, '', 'A value of A4', values{n});
    end
    want = [complex(numbers.ov12(1), numbers.ov12(2)), complex(numbers.ov23(1), numbers.ov23(2)), ...
            complex(numbers.prod(1), numbers.prod(2))];
    if ~close_(got, want, 2e-6)
        changed_(g, label);
    end
end


function A5_(g, label, values)
    % Hand step A5, repeated the same way. The numbers of A4 and A5 belong to the paper: they are not printed.
    args_(g, label, values, 2);
    N = numbers_();
    numbers = N.A.set2;
    product = complex_(g, label, '', 'The product of A5', values{1});
    gamma = real_(g, label, '', 'The Zak phase of A5', values{2});
    overlap = need_(g, label, 'overlap');
    hand2 = hand_(2, 1, 0);
    angles = zeros(1, 4);
    for s = 1:4
        value = complex_(g, label, '', 'overlap(u, v)', ...
                         call_(g, label, '', overlap, hand2(:, s), hand2(:, mod(s, 4) + 1)));
        angles(s) = -angle(value);
    end
    if abs(product - complex(numbers.prod(1), numbers.prod(2))) > 2e-6 ...
            || ~same_angle_(gamma, pi * numbers.gamma_over_pi) ...
            || ~close_(angles * 180 / pi, numbers.ov_angle_deg, 2e-5)
        changed_(g, label);
    end
    us = hand_(1, 2, 0);                                     % A4 once more, on the fixed hand vectors
    us(:, 2) = 1i * us(:, 2);
    loop_product = need_(g, label, 'loop_product');
    got = [complex_(g, label, '', 'overlap(u, v)', call_(g, label, '', overlap, us(:, 1), us(:, 2))), ...
           complex_(g, label, '', 'overlap(u, v)', call_(g, label, '', overlap, us(:, 2), us(:, 3))), ...
           complex_(g, label, '', 'loop_product(us)', call_(g, label, '', loop_product, us))];
    a4 = N.A.set1.A4;
    want = [complex(a4.ov12(1), a4.ov12(2)), complex(a4.ov23(1), a4.ov23(2)), complex(a4.prod(1), a4.prod(2))];
    if ~close_(got, want, 2e-6)
        changed_(g, label);
    end
    fprintf('%s\n', ['A4, A5 OK    your overlap, loop_product and zak reproduce the hand steps A4 and A5. ' ...
                     'Check your own numbers on the page workbook.html.']);
end


function A6_(g, label, values)
    args_(g, label, values, 1);
    eigenvector = values{1};
    todo = ['Return the eigenvector that belongs to eigenvalue number band. ' ...
            'After the sort the eigenvalues E are in rising order; the eigenvectors are the columns of V.'];
    k4 = ks4_();
    matrices = {hk_(k4(1), 1, 2, 0), hk_(k4(2), 1, 2, 0), hk_(k4(3), 1, 2, 0), hk_(k4(4), 1, 2, 0), ...
                hk_(0.7, 1, 2, 0.5), hk_(2.1, 2, 1, -0.3)};
    energies = [];
    was_row = false;
    for band = 1:2
        for n = 1:numel(matrices)
            H = matrices{n};
            u = call_(g, label, todo, eigenvector, H, band);
            if isnumeric(u) && isequal(size(u), [1, 2])                 % a row: tested as a column, named below
                was_row = true;
                u = u.';
            end
            u = array_(g, label, todo, 'eigenvector(H, band)', u, [2, 1], false);
            if norm(u) > 1e-9
                [E, miss] = energy_(H, u);
            else
                E = 0;
                miss = 1;
            end
            if miss > 1e-8
                [~, V] = sorted_eig_(H);
                is_row = was_row || close_(u, V(1, :).') || close_(u, V(2, :).') ...
                         || close_(u, V(1, :)') || close_(u, V(2, :)');
                seen = sprintf('H u is not E u for your vector u = %s.', fv_(u));
                if is_row
                    stop_(g, label, seen, hint_('3'));
                end
                stop_(g, label, seen, todo);
            end
            if band == 1 && E > 0
                stop_(g, label, sprintf('The eigenvalue of your vector is E = %s. The lower band has E < 0.', ...
                                        fmt_(E)), hint_('4'));
            end
            if band == 2 && E < 0
                stop_(g, label, sprintf('With band = 2 your function returns the lower band again (E = %s).', ...
                                        fmt_(E)), 'Use the argument band to choose the eigenvector.');
            end
            if abs(norm(u) - 1) > 1e-9
                stop_(g, label, sprintf('Your eigenvector has the length %s, not 1.', fmt_(norm(u))), ...
                      'Return the column of V as it is. eig gives eigenvectors of length 1.');
            end
            energies(end + 1) = E; %#ok<AGROW>
        end
    end
    if was_row
        stop_(g, label, 'Your function returns a row with two entries, not a column.', hint_('3'));
    end
    loop_product = need_(g, label, 'loop_product');
    zak = need_(g, label, 'zak');
    overlap = need_(g, label, 'overlap');
    N = numbers_();
    numbers = N.A.set1;
    us = zeros(2, 4);
    for s = 1:4
        us(:, s) = call_(g, label, todo, eigenvector, matrices{s}, 1);
    end
    product = complex_(g, label, todo, 'loop_product(us)', call_(g, label, todo, loop_product, us));
    first = zeros(1, 3);
    first(1) = complex_(g, label, todo, 'overlap(u, v)', call_(g, label, todo, overlap, us(:, 1), us(:, 2)));
    shaken = zeros(1, 2);
    for seed = 1:2
        vs = phases_(us, seed);
        first(seed + 1) = complex_(g, label, todo, 'overlap(u, v)', call_(g, label, todo, overlap, vs(:, 1), vs(:, 2)));
        shaken(seed) = complex_(g, label, todo, 'loop_product(us)', call_(g, label, todo, loop_product, vs));
    end
    us100 = zeros(2, 100);
    for s = 1:100
        u = call_(g, label, todo, eigenvector, hk_(2 * pi * (s - 1) / 100, 1, 2, 0), 1);
        us100(:, s) = array_(g, label, todo, 'eigenvector(H, band)', u, [2, 1], false);
    end
    product100 = complex_(g, label, todo, 'loop_product(us)', call_(g, label, todo, loop_product, us100));
    gamma100 = real_(g, label, todo, 'zak(us)', call_(g, label, todo, zak, us100));
    if ~close_(shaken, product)
        stop_(g, label, sprintf('The product changes with random phase factors: %s, %s, %s (Re Im).', ...
                                fc_(product), fc_(shaken(1)), fc_(shaken(2))), hint_('5'));
    end
    if abs(product - complex(numbers.prod(1), numbers.prod(2))) > 2e-6 ...
            || abs(product100 - complex(numbers.prod_M100(1), numbers.prod_M100(2))) > 2e-6 ...
            || ~same_angle_(gamma100, pi * numbers.gamma_M100_over_pi)
        stop_(g, label, sprintf(['With your eigenvectors the product over four k points is %s (Re Im). ' ...
                                 'It must be the product of A3.'], fc_(product)), todo);
    end
    ok_(label, { ...
        sprintf('eigenvalue of your vector at k = 0, pi/2, pi, 3pi/2 (J1 = 1, J2 = 2): %s', row_(energies(1:4))), ...
        sprintf('M = 4: product = %s, the same as by hand', fc_(product)), ...
        sprintf('random phase factor on every eigenvector: <u1|u2> = %s, then %s, then %s', ...
                fc_(first(1)), fc_(first(2)), fc_(first(3))), ...
        sprintf('                                          product = %s, then %s, then %s', ...
                fc_(product), fc_(shaken(1)), fc_(shaken(2))), ...
        sprintf('M = 100: product = %s    gamma/pi = %s', fc_(product100), in_pi_(gamma100))});
end


function found = why_wrong_sign_(g)
    % Looks in the functions of the student for the cause of a Zak phase with the wrong sign.
    found = {};
    conjugate_on_v = false;
    try
        if isfield(g, 'h') && todo_state_(g, g.h) ~= 1 && abs(g.h(pi / 2, 1, 2) - (1 - 2i)) < 1e-9
            found{end + 1} = 'exp(-ik) in h';
        end
    catch
    end
    try
        if isfield(g, 'H_k')
            H = g.H_k(0.3, 1, 2, 0.5);
            if abs(H(1, 1) + 0.5) < 1e-9
                found{end + 1} = '-Delta on A in H_k';
            end
        end
    catch
    end
    try
        if isfield(g, 'eigenvector') && todo_state_(g, g.eigenvector) ~= 1
            H = hk_(0.7, 1, 2, 0.5);
            u = g.eigenvector(H, 1);
            if energy_(H, u(:)) > 0
                found{end + 1} = 'upper band in eigenvector';
            end
        end
    catch
    end
    try
        if isfield(g, 'overlap') && todo_state_(g, g.overlap) ~= 1 && abs(g.overlap([1; 0], [1i; 0]) + 1i) < 1e-9
            found{end + 1} = 'the complex conjugate is on v in overlap';
            conjugate_on_v = true;
        end
    catch
    end
    try
        if ~conjugate_on_v && isfield(g, 'zak') && todo_state_(g, g.zak) ~= 1       % zak is tested on fixed vectors
            hand_a7 = hand_(0, 4, 3);
            if same_angle_(g.zak(hand_a7), angle(loop_(hand_a7)))
                found{end + 1} = '+arg in zak (or in loop_product)';
            end
        end
    catch
    end
end


function text = in_your_file_(found)
    text = '';
    if ~isempty(found)
        text = [' In your file: ' strjoin(found, '; ') '.'];
    end
end


function text = this_line_(found)
    % What the last line of the message names, if the cause is found in a line outside the step.
    text = '';
    if numel(found) == 1
        text = 'this line';
    elseif numel(found) > 1
        text = 'these lines';
    end
end


function A7_(g, label, values)
    args_(g, label, values, 1);
    zak_ssh = values{1};
    todo = 'Write the Zak phase of the lower band on M points: zak of states(J1, J2, Delta, M, 1).';
    N = numbers_();
    numbers = N.A.A7;
    cases = [0, 4, 3, 400; 1, 2, 0.5, 4; 1, 2, 0.5, 100; 1, 2, 0.5, 400; 2, 1, 0.5, 400; 1, 2, 0, 100; 2, 1, 0, 100];
    want = pi * [numbers.exact.gamma_over_pi, numbers.set1.M4_over_pi, numbers.set1.M100_over_pi, ...
                 numbers.set1.M400_over_pi, numbers.set2.M400_over_pi, N.A.set1.gamma_M100_over_pi, ...
                 N.A.set2.gamma_M100_over_pi];
    got = zeros(1, 7);
    for n = 1:7
        got(n) = real_(g, label, todo, 'zak_ssh(J1, J2, Delta, M)', ...
                       call_(g, label, todo, zak_ssh, cases(n, 1), cases(n, 2), cases(n, 3), cases(n, 4)));
    end
    tol = [1e-4, 1e-5, 1e-5, 1e-5, 1e-5, 1e-5, 1e-5];   % the first number is the limit of many points; M = 400 is
    if ~same_angle_(got, want, tol)                      % 0.00001 pi away from it
        seen = sprintf(['Your code gives gamma/pi = %s for J1 = 0, J2 = 4, Delta = 3 and gamma/pi = %s for ' ...
                        'J1 = 1, J2 = 2, Delta = 0.5 (M = 400).'], in_pi_(got(1)), in_pi_(got(4)));
        if same_angle_(got(1:5), -want(1:5), tol(1:5))
            found = why_wrong_sign_(g);
            stop_(g, label, [seen ' The size is right, the sign is wrong.'], [hint_('6') in_your_file_(found)], ...
                  this_line_(found));
        end
        if same_angle_(got(6), want(7)) && same_angle_(got(7), want(6))
            stop_(g, label, ['Without on-site term your code gives gamma = 0 for J1 = 1, J2 = 2 and pi for ' ...
                             'J1 = 2, J2 = 1.'], hint_('10'));
        end
        if same_angle_(got(4), got(6)) && same_angle_(got(5), got(7))
            stop_(g, label, [seen ' Your result does not depend on Delta.'], 'Pass Delta on to states.');
        end
        if same_angle_(got(2), got(4))
            stop_(g, label, [seen ' Your result does not depend on the number of points M.'], 'Pass M on to states.');
        end
        if same_angle_(got([1, 4]), want([1, 4]), 2e-3) && ~same_angle_(got(2), want(2))
            stop_(g, label, sprintf(['With M = 400 your code is close to the right value. With M = 4 it gives ' ...
                                     'gamma/pi = %s: this is not the value for the four points k = 0, pi/2, pi, ' ...
                                     '3 pi/2.'], in_pi_(got(2))), ...
                  ['Your k points are not k_s = 2 pi (s-1)/M. The point 2 pi is the point 0 again and must not be ' ...
                   'in the list (linspace(0, 2 * pi, M) contains it). Use states(J1, J2, Delta, M, 1).']);
        end
        stop_(g, label, seen, todo);
    end
    eigenvector = need_(g, label, 'eigenvector');
    u = array_(g, label, todo, 'eigenvector(H, band)', call_(g, label, todo, eigenvector, hk_(0.3, 0, 4, 3), 1), ...
               [2, 1], false);
    weight = abs(u(1)) ^ 2 / real(u' * u);
    if abs(weight - numbers.exact.weight_A) > 2e-6
        changed_(g, label);
    end
    ok_(label, { ...
        sprintf(['J1 = 0, J2 = 4, Delta = 3: gamma/pi = %s, so gamma/2pi = %s. ' ...
                 'Light of the lower band on guide A: %s'], ...
                in_pi_(got(1)), fmt_(wrap_(got(1)) / (2 * pi)), fmt_(weight)), ...
        sprintf('J1 = 1, J2 = 2, Delta = 0.5: gamma/pi = %s (M = 4), %s (M = 100), %s (M = 400)', ...
                in_pi_(got(2)), in_pi_(got(3)), in_pi_(got(4))), ...
        sprintf('J1 = 2, J2 = 1, Delta = 0.5: gamma/pi = %s (M = 400)', in_pi_(got(5)))});
end


% ---------------------------------------------------------------- Part B

function B1_(g, label, values)
    todo = 'Write E = +sqrt(Delta^2 + |h|^2). |h| is abs(h(k, J1, J2)), the square root is sqrt.';
    N = numbers_();
    numbers = N.B.B1;
    if numel(values) == 1 && isa(values{1}, 'function_handle')
        k4 = ks4_();
        q = quarters_();
        k_names = {'0', 'pi/2', 'pi'};
        got = zeros(3, 3);
        want = [numbers.E.t0; numbers.E.tq; numbers.E.th];
        for j = 1:3
            for i = 1:3
                got(j, i) = real_(g, label, todo, 'band_energy(k, J1, J2, Delta)', ...
                                  call_(g, label, todo, values{1}, k4(i), q(j, 1), q(j, 2), q(j, 3)));
            end
        end
        if ~close_(got, want, 2e-6)
            for j = 1:3
                for i = 1:3
                    if abs(got(j, i) - want(j, i)) > 2e-6
                        seen = sprintf('For J1 = %g, J2 = %g, Delta = %g and k = %s your E is %s.', ...
                                       q(j, 1), q(j, 2), q(j, 3), k_names{i}, fmt_(got(j, i)));
                        if close_(got, -want, 2e-6)
                            stop_(g, label, [seen ' This is the lower band.'], ...
                                  'Return the upper band, with the plus sign.');
                        end
                        stop_(g, label, [seen ' Calculate sqrt(Delta^2 + |h|^2) by hand and compare.'], todo);
                    end
                end
            end
        end
        ok_(label, {sprintf('E at k = 0, pi/2, pi.   t = 0: %s    t = T/4: %s    t = T/2: %s', ...
                            row_(got(1, :)), row_(got(2, :)), row_(got(3, :)))});
        return
    end
    args_(g, label, values, 2);
    gap = array_(g, label, todo, 'smallest_gap(cycle)', values{1}, 3, true);
    gap_sheet = array_(g, label, todo, 'smallest_gap(cycle)', values{2}, 3, true);
    if abs(gap(1) - numbers.gap_min) > 2e-6 || abs(gap_sheet(1) - numbers.gap_min_sheet) > 2e-6 ...
            || abs(gap(2) - pi) > 1e-6 || min(abs(gap(3) - 0.25), abs(gap(3) - 0.75)) > 1e-6
        changed_(g, label);
    end
    first = min(gap(3), 1 - gap(3));
    ok_(label, {sprintf(['smallest gap = %s at k/pi = %s, t/T = %s (the same at t/T = %s). ' ...
                         'Numbers of the sheet: %s'], fmt_(gap(1)), fmt_(gap(2) / pi), fmt_(first), ...
                        fmt_(1 - first), fmt_(gap_sheet(1)))});
end


function B2_(g, label, values)
    todo = ['Write the on-site term of cell m: H(2 * m - 1, 2 * m - 1) is the diagonal entry of its guide A ' ...
            '(+Delta), H(2 * m, 2 * m) the one of its guide B (-Delta).'];
    N = numbers_();
    numbers = N.B.B2;
    if numel(values) == 1 && isa(values{1}, 'function_handle')
        H = [];
        H_chain = values{1};
        try
            H = H_chain(3, 1, 2, 0.5);
        catch err
            failed_(g, label, todo, err);
        end
        H = array_(g, label, todo, 'H_chain(3, 1, 2, 0.5)', H, [6, 6], true);
        want = chain_(3, 1, 2, 0.5);
        if ~close_(H - diag(diag(H)), want - diag(diag(want)))
            if close_(diag(H), 0)
                stop_(g, label, 'Your line changes the couplings of H_chain. Its diagonal is still 0.', todo);
            end
            changed_(g, label, 'The couplings in H_chain were changed.');
        end
        if close_(diag(H), 0)
            open_(g, label, todo);
        end
        seen = sprintf('The diagonal of H_chain(3, 1, 2, 0.5) is %s.', row_(diag(H), 2));
        if ~close_(H, want)
            if close_(diag(H), -diag(want))
                stop_(g, label, seen, ['-Delta on A. Guide A (index 2m - 1) gets +Delta, guide B (index 2m) ' ...
                                       'gets -Delta.']);
            end
            stop_(g, label, [seen ' It must be +Delta on every guide A and -Delta on every guide B.'], todo);
        end
        ok_(label, {'H_chain: the on-site term is right'});
        return
    end
    args_(g, label, values, 3);
    E = array_(g, label, todo, 'The two eigenvalues in the gap', values{1}, 2, true);
    V = array_(g, label, todo, 'The two states in the gap', values{2}, [2 * numbers.cells, 2], false);
    E_half = array_(g, label, todo, 'The two eigenvalues at t = T/2', values{3}, 2, true);
    lines = {sprintf(['40 cells. t = 3T/8: the two eigenvalues in the gap are %s and %s    ' ...
                      't = T/2: %s and %s'], fmt_(E(1)), fmt_(E(2)), fmt_(E_half(1)), fmt_(E_half(2)))};
    for n = 1:2
        state = numbers.t0375.ingap(n);
        light = abs(V(:, n)) .^ 2;
        on_A = sum(light(1:2:end));
        left = sum(light(1:numbers.cells));
        if abs(E(n) - state.E) > 2e-6 || abs(on_A - state.weight_A) > 2e-6 ...
                || (left > 0.5) ~= strcmp(state.side, 'left') || abs(E_half(n)) > 2e-6
            changed_(g, label);
        end
        if on_A > 0.5
            guides = 'A';
        else
            guides = 'B';
        end
        lines{end + 1} = sprintf(['state at %7s: light on the A guides %s, light in the left half of the chain %s ' ...
                                  '-> %s end, on the %s guides'], fmt_(E(n)), fmt_(on_A), fmt_(left), state.side, ...
                                 guides); %#ok<AGROW>
    end
    lines{end + 1} = sprintf('these are -Delta(t) and +Delta(t): Delta(3T/8) = %s', fmt_(numbers.t0375.Delta));
    ok_(label, lines);
end


function B3_(g, label, values)
    todo = ['Write the three matrices of one Runge-Kutta step: H at the start of the step, H in the middle, ' ...
            'H at the end. H(t) is given as a function of the time t.'];
    N = numbers_();
    numbers = N.B.B3;
    if numel(values) == 1 && isa(values{1}, 'function_handle')
        psi0 = ((1:8) .* exp(0.4i * (0:7))).';
        psi0 = psi0 / norm(psi0);
        [psi, X] = call2_(g, label, todo, values{1}, psi0, 2.0, 0.25, need_(g, label, 'pump'));
        if is_nothing_(psi)
            open_(g, label, todo);
        end
        psi = array_(g, label, todo, 'The state that propagate returns', psi, 8, false);
        array_(g, label, todo, 'The positions X that propagate returns', X, 9, true);
        if ~close_(psi, runge_kutta_(psi0, 2.0, 0.25, [0, 0.5, 1]))
            times = [0, 0.5, 1];
            names = {'t', 't + dt/2', 't + dt'};
            for a = 1:3
                for b = 1:3
                    for c = 1:3
                        if close_(psi, runge_kutta_(psi0, 2.0, 0.25, times([a, b, c])))
                            stop_(g, label, sprintf('Your three matrices are H(%s), H(%s), H(%s).', ...
                                                    names{a}, names{b}, names{c}), ...
                                  ['The first is H at the start of the step, the second in the middle, ' ...
                                   'the third at the end.']);
                        end
                    end
                end
            end
            stop_(g, label, 'One cycle on 4 cells with your Runge-Kutta step does not give the right state.', todo);
        end
        ok_(label, {'Runge-Kutta step: right (tested on a chain of 4 cells)'});
        return
    end
    args_(g, label, values, 3);
    tag = values{1};
    if ~ischar(tag)
        changed_(g, label);
    end
    norm_known = true;
    switch tag                                            % T, cells, the expected shift, the expected norm
        case 'T = 20'
            T = 20;
            cells = 40;
            want = numbers.shift.T20;
            want_norm = numbers.norm_T20;
        case 'T = 50'
            T = 50;
            cells = 60;
            want = numbers.shift.T50;
            want_norm = numbers.norm_T50;
        case 'T = 100'
            T = 100;
            cells = 120;
            want = numbers.shift.T100;
            want_norm = numbers.norm_T100;
        case 'one guide, T = 50'
            T = 50;
            cells = 60;
            want = numbers.one_guide_T50;
            want_norm = 1;
            norm_known = false;
        case 'sheet, T = 20'
            T = 20;
            cells = 60;
            want = numbers.sheet_T20_pair;
            want_norm = 1;
            norm_known = false;
        otherwise
            T = 0;
            cells = 0;
            want = 0;
            want_norm = 1;
            changed_(g, label);
    end
    psi = values{3};
    if ~(isnumeric(psi) && isvector(psi) && numel(psi) == 2 * cells)
        changed_(g, label, sprintf('The run "%s" must use a chain of %d cells.', tag, cells));
    end
    X = values{2};
    if ~(isnumeric(X) && isvector(X) && numel(X) >= 2)
        changed_(g, label);
    end
    X = real(double(X(:)));
    steps = numel(X) - 1;
    total = sum(abs(psi(:)) .^ 2);
    shift = X(end) - X(1);
    if isfinite(shift)
        shift_text = fmt_(shift);
    else
        shift_text = sprintf('%g', shift);
    end
    if isfinite(total)
        norm_text = fmt_(total, 6);
    else
        norm_text = sprintf('%g', total);
    end
    seen = sprintf('Run "%s": shift per cycle = %s, norm at the end = %s.', tag, shift_text, norm_text);
    if norm_known
        norm_tol = 3e-6;
    else
        norm_tol = 3e-5;
    end
    if ~isfinite(total) || abs(total - want_norm) > norm_tol
        step = '';
        if steps < T / 0.05 - 0.5
            step = sprintf(' Your step is dt = %g.', T / steps);
        end
        stop_(g, label, [seen step], hint_('11 norm'));
    end
    one_guide = strcmp(tag, 'one guide, T = 50');
    if ~one_guide && shift < -0.3
        stop_(g, label, seen, hint_('11 back'));
    end
    if ~one_guide && abs(shift) < 0.3
        stop_(g, label, seen, hint_('11 still'));
    end
    if ~(abs(shift - want) <= 1e-4) || steps ~= round(T / 0.05)
        changed_(g, label, [seen sprintf(' This is not the run with the given input, dt = 0.05 and %d cells.', cells)]);
    end
    lines = {sprintf('%s: shift per cycle = %s    norm at the end = %s', tag, fmt_(shift), fmt_(total, 6))};
    if strncmp(tag, 'T =', 3)
        lines{end + 1} = sprintf('X at t/T = 1/4, 1/2, 3/4, 1: %s', row_(X((1:4) * steps / 4 + 1) - X(1)));
    end
    if one_guide
        lines{end + 1} = 'one guide alone excites both bands, and they move in opposite directions';
    end
    if strncmp(tag, 'sheet', 5)
        lines{end + 1} = 'numbers of the sheet (dJ = 0.5, Delta_0 = 0.2): the gap is small, this cycle is too fast';
        lines{end + 1} = ['a slower cycle needs a longer chain: T = 400 on 800 cells gives 0.95. Not 1: here ' ...
                          '(A - B)/sqrt(2) is not exactly the lower band at t = 0'];
    end
    ok_(label, lines);
end


function B4_(g, label, values)
    args_(g, label, values, 1);
    zak_pump = values{1};
    todo = 'Write the Zak phase at the time s: zak_ssh with J1, J2, Delta of this time and M points.';
    N = numbers_();
    numbers = N.B;
    pump = need_(g, label, 'pump');
    cases = [0, 4; 0.5, 4; 0.25, 4; 0.25, 400; 0.75, 400];
    want = pi * [numbers.B4.t0.gamma_over_pi, numbers.B4.thalf.gamma_over_pi, numbers.B5.quarter_M4_over_pi, ...
                 numbers.B5.quarter_M400_over_pi, numbers.B5.threequarter_M400_over_pi_raw];
    got = zeros(1, 5);
    for n = 1:5
        got(n) = real_(g, label, todo, 'zak_pump(s, M, cycle)', ...
                       call_(g, label, todo, zak_pump, cases(n, 1), cases(n, 2), pump));
    end
    if ~same_angle_(got, want)
        seen = sprintf(['Your code gives gamma/pi = %s at t = 0, %s at t = T/2 (four k points) and %s at t = T/4 ' ...
                        '(M = 400).'], in_pi_(got(1)), in_pi_(got(2)), in_pi_(got(4)));
        if same_angle_(got(1), want(2)) && same_angle_(got(2), want(1))
            stop_(g, label, seen, hint_('10'));
        end
        late = [real_(g, label, todo, 'zak_pump(s, M, cycle)', call_(g, label, todo, zak_pump, 0.375, 400, pump)), ...
                real_(g, label, todo, 'zak_pump(s, M, cycle)', call_(g, label, todo, zak_pump, 0.625, 400, pump))];
        if same_angle_(late(1), late(2))
            stop_(g, label, [seen ' At t = 3T/8 and at t = 5T/8 it gives the same value: your result does not ' ...
                             'depend on Delta.'], 'Pass Delta on to zak_ssh.');
        end
        if same_angle_(got(3), got(4))
            stop_(g, label, [seen ' Your result does not depend on the number of points M.'], ...
                  'Pass M on to zak_ssh.');
        end
        stop_(g, label, seen, todo);
    end
    loop_product = need_(g, label, 'loop_product');
    states = need_(g, label, 'states');
    q = quarters_();
    products = zeros(1, 2);
    pick = [1, 3];                                           % t = 0 and t = T/2
    for n = 1:2
        us = call_(g, label, todo, states, q(pick(n), 1), q(pick(n), 2), q(pick(n), 3), 4, 1);
        products(n) = complex_(g, label, todo, 'loop_product(us)', call_(g, label, todo, loop_product, us));
    end
    want = [complex(numbers.B4.t0.prod(1), numbers.B4.t0.prod(2)), ...
            complex(numbers.B4.thalf.prod(1), numbers.B4.thalf.prod(2))];
    if ~close_(products, want, 2e-6)
        changed_(g, label);
    end
    ok_(label, {sprintf(['four k points.   t = 0: product = %s, gamma/pi = %s    ' ...
                         't = T/2: product = %s, gamma/pi = %s'], fc_(products(1)), in_pi_(got(1)), ...
                        fc_(products(2)), in_pi_(got(2)))});
end


function B5_(g, label, values)
    args_(g, label, values, 4);
    gamma = values{2};
    C = values{3};
    X = values{4};
    todo1 = ['Write the first line marked TODO B5: gamma_raw without the jumps of 2 pi. ' ...
             'unwrap takes, from one time to the next, the change that is smaller than pi.'];
    todo2 = 'Write the second line marked TODO B5: C = (gamma at the end - gamma at the start) / (2 pi).';
    N = numbers_();
    numbers = N.B.B5;
    raw = array_(g, label, todo1, 'gamma_raw', values{1}, 17, true);
    if ~same_angle_(raw, pi * numbers.gamma_raw_over_pi)
        changed_(g, label);
    end
    if is_nothing_(gamma)
        open_(g, label, todo1);
    end
    gamma = array_(g, label, todo1, 'gamma', gamma, 17, true);
    want = pi * numbers.gamma_unwrapped_over_pi;
    if ~close_(gamma, want, 1e-5)
        seen = sprintf('Your gamma/pi goes from %s at the start to %s at the end of the cycle.', ...
                       fmt_(gamma(1) / pi), fmt_(gamma(end) / pi));
        if abs(gamma(end) - gamma(1)) < 1e-5
            stop_(g, label, seen, [hint_('7') ' If unwrap is there: it needs the angles in radians, not divided ' ...
                                   'by pi.']);
        end
        units = {pi, 'pi'; 2 * pi, '2 pi'};
        for n = 1:2
            if close_(gamma * units{n, 1}, want, 1e-5)
                stop_(g, label, sprintf('Your gamma goes from %s to %s. This is gamma in units of %s.', ...
                                        fmt_(gamma(1)), fmt_(gamma(end)), units{n, 2}), ...
                      'Keep gamma in radians: do not divide it.');
            end
        end
        stop_(g, label, [seen ' It must change by less than pi from one time to the next, without jumps.'], todo1);
    end
    if is_nothing_(C)
        open_(g, label, todo2);
    end
    C = real_(g, label, todo2, 'C', C);
    if abs(C - numbers.C) > 1e-6
        seen = sprintf('Your C is %s.', fmt_(C));
        ends = sprintf(' gamma/pi goes from %s to %s.', fmt_(gamma(1) / pi), fmt_(gamma(end) / pi));
        if C == round(C) && abs(abs(C - numbers.C) - 1) < 1e-6 && ~isempty(cut_in_(g, 'run_steps'))
            stop_(g, label, [seen ends], hint_('cut'));
        end
        if abs(C) < 1e-6
            stop_(g, label, seen, hint_('7'));
        end
        stop_(g, label, [seen ends], todo2);
    end
    zak_pump = need_(g, label, 'zak_pump');
    quarter4 = real_(g, label, todo1, 'zak_pump(s, M, cycle)', ...
                     call_(g, label, todo1, zak_pump, 0.25, 4, need_(g, label, 'pump')));
    if ~(isnumeric(X) && isvector(X) && numel(X) >= 5) || mod(numel(X) - 1, 4) ~= 0 ...
            || ~same_angle_(quarter4, pi * numbers.quarter_M4_over_pi)
        changed_(g, label);
    end
    X = real(double(X(:)));
    steps = numel(X) - 1;
    ok_(label, { ...
        sprintf('gamma/pi at t = T/4: %s (M = 400), %s (four k points)    C = %s', ...
                fmt_(gamma(5) / pi), in_pi_(quarter4), fmt_(C)), ...
        sprintf('gamma/2pi at t/T = 1/4, 1/2, 3/4, 1: %s', row_(gamma([5, 9, 13, 17]) / (2 * pi))), ...
        sprintf('X of B3 at these times, T = %-5g   %s', 0.05 * steps, row_(X((1:4) * steps / 4 + 1) - X(1))), ...
        'the slower the cycle, the closer X follows gamma/2pi'});
end


function B6_(g, label, values)
    args_(g, label, values, 1);
    plaquette = values{1};
    todo = ['Write F = -(angle of the product <a|b> <b|c> <c|d> <d|a>). ' ...
            'Use overlap four times, in this order, and angle.'];
    N = numbers_();
    numbers = N.B.B6;
    U = grid_();
    free = free_();
    a = U(:, 2, 1);
    b = U(:, 2, 2);
    c = U(:, 3, 2);
    d = U(:, 3, 1);
    name = 'plaquette(a, b, c, d)';
    F = real_(g, label, todo, name, call_(g, label, todo, plaquette, a, b, c, d));
    F_free = real_(g, label, todo, name, ...
                   call_(g, label, todo, plaquette, free(:, 1), free(:, 2), free(:, 3), free(:, 4)));
    shaken = zeros(1, 2);
    for seed = 1:2
        vs = phases_([a, b, c, d], seed);
        shaken(seed) = real_(g, label, todo, name, ...
                             call_(g, label, todo, plaquette, vs(:, 1), vs(:, 2), vs(:, 3), vs(:, 4)));
    end
    back = real_(g, label, todo, name, call_(g, label, todo, plaquette, a, d, c, b));
    turned = real_(g, label, todo, name, ...
                   call_(g, label, todo, plaquette, a, b * exp(2i), c * exp(4i), d * exp(6i)));
    seen = sprintf('For the plaquette k = pi/2 .. pi, t = 0 .. T/4 (hand vectors) your F is %s pi.', fmt_(F / pi));
    if ~same_angle_(shaken, F)
        stop_(g, label, [seen sprintf(' With random phase factors on the vectors it is %s pi and %s pi.', ...
                                      fmt_(shaken(1) / pi), fmt_(shaken(2) / pi))], hint_('5'));
    end
    if same_angle_(F, pi * numbers.F_over_pi) && ~same_angle_(back, -F)
        stop_(g, label, [seen sprintf([' Walked the other way round (a -> d -> c -> b -> a) it is %s pi. ' ...
                                       'It must be %s pi.'], fmt_(back / pi), fmt_(-F / pi))], ...
              'The sign of the angle is lost. F = -angle(product), without abs.');
    end
    want_free = plaquette_ref_(free(:, 1), free(:, 2), free(:, 3), free(:, 4));
    if ~(same_angle_(F, pi * numbers.F_over_pi) && same_angle_(F_free, want_free))
        if same_angle_(F, -pi * numbers.F_over_pi) && same_angle_(F_free, -want_free)
            stop_(g, label, [seen ' The size is right, the sign is wrong.'], ...
                  ['+arg instead of -arg, or the square is walked the other way round. ' ...
                   'The order is a -> b -> c -> d -> a.']);
        end
        stop_(g, label, seen, todo);
    end
    if ~close_([shaken, turned], F, 1e-9) || max(abs([F, back, F_free])) > pi + 1e-9
        stop_(g, label, [seen sprintf([' With other phase factors on the vectors it is %s pi, walked the other ' ...
                                       'way round %s pi. These are the right angles, but not always as a number ' ...
                                       'between -pi and pi.'], fmt_(turned / pi), fmt_(back / pi))], ...
              ['F must lie between -pi and pi. Multiply the four overlaps first, then take angle of the product ' ...
               'once: not the sum of four angles, and no mod. Step B7 adds the plaquette phases as numbers.']);
    end
    product = (a' * b) * (b' * c) * (c' * d) * (d' * a);
    lines = {sprintf(['plaquette k = pi/2 .. pi, t = 0 .. T/4: product of the four overlaps = %s    ' ...
                      'F/pi = %s'], fc_(product), in_pi_(F))};
    try
        [J1, J2, D] = g.pump(0.25);
        H = g.H_k(pi / 2, J1, J2, D);
        u = g.eigenvector(g.H_k(pi, J1, J2, D), 1);
        E = energy_(H, g.eigenvector(H, 1));
        if abs(E - numbers.E_kpi2_tq) < 2e-6 && close_(abs(u), [0; 1])
            lines{end + 1} = sprintf(['your two checks on paper: E = %s at k = pi/2, t = T/4;  |u_A| = %s, ' ...
                                      '|u_B| = %s at k = pi, t = T/4'], fmt_(E), fmt_(abs(u(1))), fmt_(abs(u(2))));
        end
    catch
    end
    ok_(label, lines);
end


function B7_(g, label, values)
    todo = ['Write C = (sum of all plaquette phases) / (2 pi). plaquettes(U) gives all of them as a matrix F; ' ...
            'sum(F(:)) adds all its entries.'];
    N = numbers_();
    numbers = N.B.B7;
    if numel(values) == 1 && isa(values{1}, 'function_handle')
        U = grid_();
        C = call_(g, label, todo, values{1}, U);
        if isnumeric(C) && isvector(C) && numel(C) == 4
            stop_(g, label, 'chern(U) must be one number. You give four numbers: one sum for each column.', ...
                  'sum(F) adds each column of a matrix F. Add all entries: sum(F(:)), or sum(sum(F)).');
        end
        C = real_(g, label, todo, 'chern(U)', C);
        shaken = zeros(1, 2);
        for seed = 1:2
            shaken(seed) = real_(g, label, todo, 'chern(U)', call_(g, label, todo, values{1}, phases_grid_(U, seed)));
        end
        mirrored = permute(U, [1, 3, 2]);                   % k and t exchanged: every plaquette the other way round
        C_back = real_(g, label, todo, 'chern(U)', call_(g, label, todo, values{1}, mirrored));
        seen = sprintf('For the 4 x 4 grid of the pump (hand vectors) your chern gives %s.', fmt_(C));
        word = cut_in_(g, values{1});
        if ~isempty(word)
            stop_(g, label, sprintf('Your chern uses %s( ): it cuts the result to an integer.', word), hint_('cut'));
        end
        if cut_values_([shaken, C, C_back], [numbers.C, numbers.C, numbers.C, -numbers.C], true)
            stop_(g, label, [seen sprintf([' With random phase factors on the vectors it gives %s and %s, with k ' ...
                                           'and t exchanged %s. These are whole numbers, and not all are right.'], ...
                                          fmt_(shaken(1)), fmt_(shaken(2)), fmt_(C_back))], hint_('cut'));
        end
        if ~close_(shaken, C, 1e-9)
            stop_(g, label, [seen sprintf(' With random phase factors on the vectors it gives %s and %s.', ...
                                          fmt_(shaken(1)), fmt_(shaken(2)))], hint_('5'));
        end
        if abs(C - numbers.C) < 1e-9 && abs(C_back + C) > 1e-9
            stop_(g, label, [seen sprintf([' For the same grid with k and t exchanged it gives %s. ' ...
                                           'It must be %s.'], fmt_(C_back), fmt_(-C))], ...
                  'The sign of the sum is lost. C = sum / (2 pi), without abs.');
        end
        if abs(C - numbers.C) > 1e-9
            if abs(C) < 1e-9
                stop_(g, label, seen, hint_('8'));
            end
            if abs(C - 2 * pi * numbers.C) < 1e-9
                stop_(g, label, [seen ' This is the sum of the plaquette phases.'], 'Divide the sum by 2 pi.');
            end
            stop_(g, label, seen, todo);
        end
        ok_(label, {'chern: right (tested on the 4 x 4 grid of hand vectors, with random phase factors)'});
        return
    end
    args_(g, label, values, 3);
    F = array_(g, label, todo, 'The plaquette phases F', values{1}, [4, 4], true);
    C4 = real_(g, label, todo, 'chern(grid_kt(4, @pump, 1))', values{2});
    C24 = real_(g, label, todo, 'chern(grid_kt(24, @pump, 1))', values{3});
    column_sums = sum(F, 1);
    if ~close_(F / pi, numbers.F_over_pi, 2e-6) || ~close_(column_sums / pi, numbers.col_sums_over_pi, 2e-6) ...
            || abs(C4 - numbers.C) > 1e-9 || abs(C24 - numbers.C_24) > 1e-9
        if close_(F / pi, numbers.F_over_pi, 2e-6) && cut_values_([C4, C24], [numbers.C, numbers.C_24], false)
            stop_(g, label, sprintf(['Your plaquette phases are right. But your chern gives C = %s with ' ...
                                     'grid_kt(4, @pump, 1) and C = %s with grid_kt(24, @pump, 1).'], ...
                                    fmt_(C4), fmt_(C24)), hint_('cut'));
        end
        found = why_wrong_sign_(g);
        stop_(g, label, sprintf(['Your chern is right on fixed vectors. But with the eigenvectors of ' ...
                                 'grid_kt(4, @pump, 1) it gives C = %s, with grid_kt(24, @pump, 1) C = %s.'], ...
                                fmt_(C4), fmt_(C24)), ...
              ['The eigenvectors of the grid are wrong. Compare the given functions H_k, pump and grid_kt with ' ...
               'the original file.' in_your_file_(found)], this_line_(found));
    end
    lines = {'4 x 4 grid, F/pi. One line per k interval (k/pi from 0, 0.5, 1, 1.5), one column per t interval:'};
    for i = 1:4
        lines{end + 1} = sprintf('   %8s %8s %8s %8s', fmt_(F(i, 1) / pi), fmt_(F(i, 2) / pi), fmt_(F(i, 3) / pi), ...
                                 fmt_(F(i, 4) / pi)); %#ok<AGROW>
    end
    lines{end + 1} = sprintf('sum of each t column / pi = %s    total / pi = %s', row_(column_sums / pi), ...
                             fmt_(sum(F(:)) / pi));
    try
        raw = zeros(1, 5);
        for j = 1:5
            raw(j) = g.zak_pump((j - 1) / 4, 4, g.pump);
        end
        steps = diff(unwrap(raw));
        if close_(steps, column_sums, 1e-9)
            lines{end + 1} = sprintf('steps of gamma/pi with four k points  = %s    (the same numbers)', ...
                                     row_(steps / pi));
        end
    catch
    end
    lines{end + 1} = sprintf(['C = %s (4 x 4 grid)    C = %s (24 x 24 grid)    ' ...
                              'smallest single plaquette: F/pi = %s'], fmt_(C4), fmt_(C24), fmt_(min(F(:)) / pi));
    ok_(label, lines);
end


function B8_(g, label, values)
    args_(g, label, values, 3);
    predicted = values{1};
    calculated = values{2};
    grids = values{3};
    todo = ['Type your four predictions: the Chern number that you expect, an integer, in place of each TODO. ' ...
            'Look at the cycle in the plane (J1 - J2, Delta): does it go around the point (0, 0), ' ...
            'and which way round?'];
    N = numbers_();
    numbers = N.B.B8;
    names = {'upper band of the same cycle', 'cycle run backwards (Delta -> -Delta)', ...
             'cycle that does not go around (0, 0)', 'numbers of the task sheet'};
    want = [numbers.upper_band, numbers.reversed_cycle, numbers.not_enclosing, numbers.sheet];
    reasons = {'The two bands together give 0. So the upper band has minus the Chern number of the lower band.', ...
               ['Delta -> -Delta mirrors the cycle. It goes around (0, 0) the other way round, ' ...
                'the light moves back.'], ...
               ['This cycle does not go around (0, 0), the point where the gap closes. gamma comes back to its ' ...
                'start without going around.'], ...
               ['The cycle of the sheet is smaller, but it goes around (0, 0) once, the same way round. ' ...
                'Only this counts.']};
    if ~(isnumeric(predicted) && numel(predicted) == 4)
        stop_(g, label, 'predicted must be a row of four numbers.', todo);
    end
    if ~(isnumeric(calculated) && numel(calculated) == 4 && iscell(grids) && numel(grids) == 4)
        changed_(g, label);
    end
    if any(isnan(predicted))
        stop_(g, label, sprintf('Predict first. Open predictions: %d of 4.', sum(isnan(predicted))), todo);
    end
    for n = 1:4
        real_(g, label, todo, 'A prediction', predicted(n));
        real_(g, label, todo, 'A calculated Chern number', calculated(n));
    end
    predicted = real(double(predicted));
    calculated = real(double(calculated));
    for n = 1:4
        if abs(calculated(n) - want(n)) > 1e-6
            points = size(grids{n}, 2);
            seen = sprintf('Your code gives C = %s for the %s, on a grid of %d x %d points.', ...
                           fmt_(calculated(n)), names{n}, points, points);
            if points < 4 || mod(points, 2) ~= 0
                stop_(g, label, seen, hint_('9'));
            end
            changed_(g, label, seen);
        end
    end
    lines = cell(1, 4);
    for n = 1:4
        lines{n} = sprintf('%-38s predicted %g, calculated %s', [names{n} ':'], predicted(n), fmt_(calculated(n)));
    end
    wrong = find(abs(predicted - calculated) > 1e-6, 1);
    if ~isempty(wrong)
        for n = 1:4
            fprintf('%s%s\n', pad_(), lines{n});
        end
        stop_(g, label, sprintf('Your prediction for the %s differs from your calculation.', names{wrong}), ...
              [reasons{wrong} ' Correct the prediction.']);
    end
    lines{end + 1} = 'the edge states of B2 say the same: per cycle one state crosses the gap at each end, |C| = 1';
    ok_(label, lines);
end


% ---------------------------------------------------------------- Part C

function C1_(g, label, values)
    args_(g, label, values, 2);
    C = values{1};
    periodic = values{2};
    todo = ['Write the three Chern numbers: chern of grid_2d(@H_hofstadter, 6, band) for band = 1, 2, 3, ' ...
            'in place of the three TODO.'];
    N = numbers_();
    numbers = N.C.C1;
    if ~(isnumeric(C) && numel(C) == 3)
        stop_(g, label, 'C_hofstadter must be a row of three numbers: one Chern number for each band.', todo);
    end
    if any(isnan(C))
        open_(g, label, todo);
    end
    for n = 1:3
        real_(g, label, todo, 'A Chern number', C(n));
    end
    C = real(double(C(:).'));
    want = numbers.chern_lower_to_upper;
    if ~(close_(C, want, 1e-6) || close_(C, -want, 1e-6))
        seen = sprintf('Your three Chern numbers are %s.', row_(C));
        if close_(C, C(1), 1e-6)
            stop_(g, label, [seen ' They are all the same.'], 'Give each call its own band number: 1, 2, 3.');
        end
        stop_(g, label, [seen ' They must be integers with sum 0.'], todo);
    end
    if ~(islogical(periodic) && numel(periodic) == 1 && periodic)
        changed_(g, label);
    end
    ok_(label, {sprintf('C = %s for the lower, middle and upper band    sum = %s', row_(C), fmt_(sum(C))), ...
                'H at kappa = 2 pi is the same matrix as H at kappa = 0: the grid closes'});
end


function C2_(g, label, values)
    args_(g, label, values, 1);
    C = values{1};
    todo = ['Write the three Chern numbers of the lower band: chern of grid_2d(H, 6, 1), with H = H_haldane for ' ...
            'm = 0, then for m = 0.6, then for m = 0 and phi = -pi/2, in place of the three TODO.'];
    N = numbers_();
    numbers = N.C.C2;
    if ~(isnumeric(C) && numel(C) == 3)
        stop_(g, label, 'C_haldane must be a row of three numbers.', todo);
    end
    if any(isnan(C))
        open_(g, label, todo);
    end
    for n = 1:3
        real_(g, label, todo, 'A Chern number', C(n));
    end
    C = real(double(C(:).'));
    want = [numbers.C_m0, numbers.C_m06, numbers.C_m0_phi_negative];
    if close_(C, -want, 1e-6)
        stop_(g, label, sprintf(['Your three Chern numbers are %s. All signs are opposite to those of the ' ...
                                 'lower band.'], row_(C)), ...
              'Lower band: band = 1 in grid_2d. phi = -pi/2 belongs to the third entry only.');
    end
    if ~close_(C, want, 1e-6)
        stop_(g, label, sprintf('Your three Chern numbers are %s.', row_(C)), todo);
    end
    lines = {sprintf('m = 0: C = %s    m = 0.6: C = %s    m = 0 and phi = -pi/2: C = %s', ...
                     fmt_(C(1)), fmt_(C(2)), fmt_(C(3)))};
    try
        masses = [0, 0.6];
        at = zeros(2, 2);
        for n = 1:2
            H = g.H_haldane(numbers.K(1), numbers.K(2), masses(n), pi / 2);
            at(n, 1) = real(H(1, 1));
            H = g.H_haldane(numbers.Kprime(1), numbers.Kprime(2), masses(n), pi / 2);
            at(n, 2) = real(H(1, 1));
        end
        want = [numbers.onsite_at_K.m0, numbers.onsite_at_Kprime.m0; ...
                numbers.onsite_at_K.m06, numbers.onsite_at_Kprime.m06];
        if close_(at, want, 2e-6)
            lines{end + 1} = sprintf(['entry H(1, 1) at the points K and K'': %s and %s (m = 0), ' ...
                                      '%s and %s (m = 0.6)'], fmt_(at(1, 1)), fmt_(at(1, 2)), fmt_(at(2, 1)), ...
                                     fmt_(at(2, 2)));
            lines{end + 1} = 'opposite signs at K and K'' -> |C| = 1;  the same sign -> C = 0';
        end
    catch
    end
    ok_(label, lines);
end


% The expected numbers of all steps. This block is generated. Do not change it.
function N = numbers_()
    N = struct();
    % BEGIN NUMBERS
    N.A.set1.J1 = 1.0;
    N.A.set1.J2 = 2.0;
    N.A.set1.k_over_pi = [0, 0.5, 1, 1.5];
    N.A.set1.h = [3.0, 0.0; 1.0, 2.0; -1.0, 0.0; 1.0, -2.0];
    N.A.set1.phi_deg = [0.0, 63.434949, 180.0, -63.434949];
    N.A.set1.E = [-3.0, -2.236068, -1.0, -2.236068];
    N.A.set1.uA = [-0.707107, 0.0; -0.316228, 0.632456; 0.707107, 0.0; -0.316228, -0.632456];
    N.A.set1.uB = 0.707107;
    N.A.set1.winding = 1;
    N.A.set1.ov = [0.723607, -0.447214; 0.276393, -0.447214; 0.276393, -0.447214; 0.723607, -0.447214];
    N.A.set1.ov_len = [0.850651, 0.525731, 0.525731, 0.850651];
    N.A.set1.ov_angle_deg = [31.717474, 58.282526, 58.282526, 31.717474];
    N.A.set1.prod = [-0.2, -0.0];
    N.A.set1.prod_len = 0.2;
    N.A.set1.angle_sum_deg = 180.0;
    N.A.set1.gamma_over_pi = 1.0;
    N.A.set1.open_prod = [-0.2, -0.123607];
    N.A.set1.A4.ov12 = [0.447214, 0.723607];
    N.A.set1.A4.ov23 = [-0.447214, -0.276393];
    N.A.set1.A4.prod = [-0.2, -0.0];
    N.A.set1.prod_M100 = [-0.94404, 0.0];
    N.A.set1.gamma_M100_over_pi = 1.0;
    N.A.set2.J1 = 2.0;
    N.A.set2.J2 = 1.0;
    N.A.set2.k_over_pi = [0, 0.5, 1, 1.5];
    N.A.set2.h = [3.0, 0.0; 2.0, 1.0; 1.0, 0.0; 2.0, -1.0];
    N.A.set2.phi_deg = [0.0, 26.565051, 0.0, -26.565051];
    N.A.set2.E = [-3.0, -2.236068, -1.0, -2.236068];
    N.A.set2.uA = [-0.707107, 0.0; -0.632456, 0.316228; -0.707107, 0.0; -0.632456, -0.316228];
    N.A.set2.uB = 0.707107;
    N.A.set2.winding = 0;
    N.A.set2.ov = [0.947214, -0.223607; 0.947214, 0.223607; 0.947214, 0.223607; 0.947214, -0.223607];
    N.A.set2.ov_len = [0.973249, 0.973249, 0.973249, 0.973249];
    N.A.set2.ov_angle_deg = [13.282526, -13.282526, -13.282526, 13.282526];
    N.A.set2.prod = [0.897214, 0.0];
    N.A.set2.prod_len = 0.897214;
    N.A.set2.angle_sum_deg = 0.0;
    N.A.set2.gamma_over_pi = 0.0;
    N.A.set2.open_prod = [0.897214, 0.211803];
    N.A.set2.A4.ov12 = [0.223607, 0.947214];
    N.A.set2.A4.ov23 = [0.223607, -0.947214];
    N.A.set2.A4.prod = [0.897214, 0.0];
    N.A.set2.prod_M100 = [0.991814, 0.0];
    N.A.set2.gamma_M100_over_pi = 0.0;
    N.A.A7.exact.J1 = 0;
    N.A.A7.exact.J2 = 4;
    N.A.A7.exact.D = 3;
    N.A.A7.exact.gamma_over_pi = 0.4;
    N.A.A7.exact.gamma_over_pi_M4 = 0.311917;
    N.A.A7.exact.weight_A = 0.2;
    N.A.A7.exact.weight_B = 0.8;
    N.A.A7.set1.D = 0.5;
    N.A.A7.set1.M4_over_pi = 0.606656;
    N.A.A7.set1.M100_over_pi = 0.707794;
    N.A.A7.set1.M400_over_pi = 0.707911;
    N.A.A7.set1.limit_over_pi = 0.707918;
    N.A.A7.set1.upper_band_M400_over_pi = -0.707911;
    N.A.A7.set2.D = 0.5;
    N.A.A7.set2.M4_over_pi = 0.021892;
    N.A.A7.set2.M100_over_pi = 0.03696;
    N.A.A7.set2.M400_over_pi = 0.036989;
    N.A.A7.set2.limit_over_pi = 0.036991;
    N.A.A7.set2.upper_band_M400_over_pi = -0.036989;
    N.B.hand.dJ = 1.0;
    N.B.hand.D0 = 0.5;
    N.B.sheet.dJ = 0.5;
    N.B.sheet.D0 = 0.2;
    N.B.B1.E.t0 = [2.0, 2.0, 2.0];
    N.B.B1.E.tq = [2.061553, 1.5, 0.5];
    N.B.B1.E.th = [2.0, 2.0, 2.0];
    N.B.B1.gap_min = 1.0;
    N.B.B1.gap_min_sheet = 0.4;
    N.B.B1.gap_min_at = 'k = pi, t = T/4 and 3T/4';
    N.B.B2.cells = 40;
    N.B.B2.t0125.Delta = 0.353553;
    N.B.B2.t0125.ingap = [];
    N.B.B2.t03.Delta = 0.475528;
    N.B.B2.t03.ingap(1).E = -0.475528;
    N.B.B2.t03.ingap(1).side = 'right';
    N.B.B2.t03.ingap(1).weight_A = 0.0;
    N.B.B2.t03.ingap(2).E = 0.475528;
    N.B.B2.t03.ingap(2).side = 'left';
    N.B.B2.t03.ingap(2).weight_A = 1.0;
    N.B.B2.t0375.Delta = 0.353553;
    N.B.B2.t0375.ingap(1).E = -0.353553;
    N.B.B2.t0375.ingap(1).side = 'right';
    N.B.B2.t0375.ingap(1).weight_A = 0.0;
    N.B.B2.t0375.ingap(2).E = 0.353553;
    N.B.B2.t0375.ingap(2).side = 'left';
    N.B.B2.t0375.ingap(2).weight_A = 1.0;
    N.B.B2.t05.Delta = 0.0;
    N.B.B2.t05.ingap(1).E = -0.0;
    N.B.B2.t05.ingap(1).side = 'right';
    N.B.B2.t05.ingap(1).weight_A = 0.0;
    N.B.B2.t05.ingap(2).E = 0.0;
    N.B.B2.t05.ingap(2).side = 'left';
    N.B.B2.t05.ingap(2).weight_A = 1.0;
    N.B.B2.t0625.Delta = -0.353553;
    N.B.B2.t0625.ingap(1).E = -0.353553;
    N.B.B2.t0625.ingap(1).side = 'left';
    N.B.B2.t0625.ingap(1).weight_A = 1.0;
    N.B.B2.t0625.ingap(2).E = 0.353553;
    N.B.B2.t0625.ingap(2).side = 'right';
    N.B.B2.t0625.ingap(2).weight_A = 0.0;
    N.B.B2.sheet_t0375(1).E = -0.141421;
    N.B.B2.sheet_t0375(1).side = 'right';
    N.B.B2.sheet_t0375(1).weight_A = 0.0;
    N.B.B2.sheet_t0375(2).E = 0.141421;
    N.B.B2.sheet_t0375(2).side = 'left';
    N.B.B2.sheet_t0375(2).weight_A = 1.0;
    N.B.B3.input = '(A - B)/sqrt(2) on one cell in the middle';
    N.B.B3.dt = 0.05;
    N.B.B3.shift.T20 = 0.889112;
    N.B.B3.shift.T50 = 0.967335;
    N.B.B3.shift.T100 = 0.99894;
    N.B.B3.cells.T20 = 40;
    N.B.B3.cells.T50 = 60;
    N.B.B3.cells.T100 = 120;
    N.B.B3.norm_T20 = 0.999997;
    N.B.B3.norm_T50 = 0.999991;
    N.B.B3.norm_T100 = 0.999983;
    N.B.B3.X_over_cycle_T100 = [0.0, -4.8e-05, 0.001163, 0.016586, 0.138684, 0.322209, 0.396974, 0.447549, ...
            0.497165, 0.547785, 0.601089, 0.682146, 0.852926, 0.981537, 0.997066, 0.997833, 0.997893];
    N.B.B3.one_guide_T50 = 0.080361;
    N.B.B3.sheet_T20_pair = 0.552642;
    N.B.B4.t0.ov = [1.0, 0.0];
    N.B.B4.t0.prod = [1.0, 0.0];
    N.B.B4.t0.gamma_over_pi = 0.0;
    N.B.B4.thalf.ov = [0.5, -0.5];
    N.B.B4.thalf.prod = [-0.25, -0.0];
    N.B.B4.thalf.gamma_over_pi = 1.0;
    N.B.B5.t_over_T = [0.0, 0.0625, 0.125, 0.1875, 0.25, 0.3125, 0.375, 0.4375, 0.5, 0.5625, 0.625, 0.6875, ...
            0.75, 0.8125, 0.875, 0.9375, 1.0];
    N.B.B5.gamma_raw_over_pi = [0.0, 7.7e-05, 0.002949, 0.03385, 0.281487, 0.639298, 0.792975, 0.900916, 1.0, ...
            -0.900916, -0.792975, -0.639298, -0.281487, -0.03385, -0.002949, -7.7e-05, 0.0];
    N.B.B5.gamma_unwrapped_over_pi = [0.0, 7.7e-05, 0.002949, 0.03385, 0.281487, 0.639298, 0.792975, 0.900916, ...
            1.0, 1.099084, 1.207025, 1.360702, 1.718513, 1.96615, 1.997051, 1.999923, 2.0];
    N.B.B5.C = 1;
    N.B.B5.quarter_M4_over_pi = 0.174261;
    N.B.B5.quarter_M400_over_pi = 0.281487;
    N.B.B5.threequarter_M400_over_pi_raw = -0.281487;
    N.B.B5.sheet_quarter_M400_over_pi = 0.382759;
    N.B.B5.C_without_unwrap = 0.0;
    N.B.B6.u_kpi2_tq = [-0.408248, 0.408248; 0.816497, 0.0];
    N.B.B6.u_kpi2_tq_times_sqrt6 = [-1.0, 1.0; 2.0, 0.0];
    N.B.B6.E_kpi2_tq = -1.5;
    N.B.B6.u_kpi_tq = [0.0, 0.0; 1.0, 0.0];
    N.B.B6.u_t0 = [-0.707107, 0.0; 0.707107, 0.0];
    N.B.B6.ov = [0.866025, -0.288675; 0.816497, 0.0; 0.707107, 0.0; 1.0, 0.0];
    N.B.B6.prod = [0.5, -0.166667];
    N.B.B6.F_over_pi = 0.102416;
    N.B.B7.F_over_pi = [-0.015286, 0.060453, 0.060453, -0.015286; 0.102416, 0.352416, 0.352416, ...
            0.102416; 0.102416, 0.352416, 0.352416, 0.102416; -0.015286, 0.060453, 0.060453, -0.015286];
    N.B.B7.rows = 'k interval [k_i, k_i+1], i = 0..3';
    N.B.B7.cols = 't interval [t_j, t_j+1], j = 0..3';
    N.B.B7.col_sums_over_pi = [0.174261, 0.825739, 0.825739, 0.174261];
    N.B.B7.total_over_pi = 2.0;
    N.B.B7.C = 1;
    N.B.B7.C_24 = 1;
    N.B.B7.C_sheet_4 = 1;
    N.B.B7.C_sheet_3_wrong = 0;
    N.B.B8.upper_band = -1;
    N.B.B8.reversed_cycle = -1;
    N.B.B8.not_enclosing = 0;
    N.B.B8.sheet = 1;
    N.B.B8.not_enclosing_params = 'J1 = 2.5 + 0.5 cos, J2 = 1 - 0.5 cos, Delta = 0.2 sin';
    N.C.C1.flux = '1/3';
    N.C.C1.grid = 6;
    N.C.C1.chern_lower_to_upper = [-1, 2, -1];
    N.C.C1.abs = [1, 2, 1];
    N.C.C1.matrix = ['H[j][j] = 2 cos(ky + 2 pi j/3); H[0][1] = H[1][2] = 1 (and transposed); H[2][0] ', ...
        '= exp(i kappa), H[0][2] = exp(-i kappa)'];
    N.C.C2.t1 = 1;
    N.C.C2.t2 = 0.1;
    N.C.C2.phiH_over_pi = 0.5;
    N.C.C2.boundary = 0.519615;
    N.C.C2.onsite_at_K.m0 = 0.519615;
    N.C.C2.onsite_at_K.m06 = 1.119615;
    N.C.C2.onsite_at_Kprime.m0 = -0.519615;
    N.C.C2.onsite_at_Kprime.m06 = 0.080385;
    N.C.C2.K = [2.094395, 4.18879];
    N.C.C2.Kprime = [4.18879, 2.094395];
    N.C.C2.C_m0 = -1;
    N.C.C2.C_m06 = 0;
    N.C.C2.C_m0_phi_negative = 1;
    N.C.C2.grid = 6;
    % END NUMBERS
end
