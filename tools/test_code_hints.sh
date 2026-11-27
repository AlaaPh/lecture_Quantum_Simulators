#!/usr/bin/env bash
# Runs the "Show me how" code of the workbook (app/js/workbook/code.js) as a student would. One program is the blocks
# of one part (PROGRAMS in code.js): the Python blocks one after another in one file; the MATLAB blocks in GNU Octave,
# each function in its own file and the other lines in one script, with the display that MATLAB and Octave use by
# default (no "format long"). Compares the printed numbers with tools/workbook_numbers.json.
# Run from the repository root:  bash tools/test_code_hints.sh
# Needs node, python3 with numpy, and octave (without octave the MATLAB half is skipped and reported).
set -euo pipefail
dir=$(mktemp -d); trap 'rm -rf "$dir"' EXIT
node --input-type=module -e "
import { CODE, PROGRAMS } from './app/js/workbook/code.js';
import { writeFileSync, mkdirSync } from 'node:fs';
const dir = process.argv[1];
let bad = 0;
const used = PROGRAMS.flatMap((p) => p.blocks);
for (const k of Object.keys(CODE)) if (used.filter((u) => u === k).length !== 1) { bad++; console.log('block is not in exactly one program:', k); }
for (const k of used) if (!CODE[k]) { bad++; console.log('program names a block that does not exist:', k); }
if (bad) process.exit(1);
for (const k of used) for (const lang of ['py', 'm']) for (const line of CODE[k][lang].split('\n')) {
  if (line.length > 46) { bad++; console.log('line longer than 46 characters:', k, lang, line); }
  if (lang === 'm' && /^\s*(angle|i|j)\s*=|for\s+(i|j)\s*=/.test(line)) { bad++; console.log('a variable named angle, i or j in MATLAB:', k, line); }
}
if (bad) process.exit(1);
for (const p of PROGRAMS) {
  const d = dir + '/' + p.id; mkdirSync(d);
  writeFileSync(d + '/hints.py', p.blocks.map((k) => CODE[k].py).join('\n\n') + '\n');
  let script = '';
  for (const k of p.blocks) {                 // a block is either lines for the script, or '% file X.m' + function + lines
    const m = /^% file (\w+)\.m[^\n]*\n(function[\s\S]*?\nend)\n\n% then, in your script:\n([\s\S]*)$/.exec(CODE[k].m);
    if (m) { writeFileSync(d + '/' + m[1] + '.m', m[2] + '\n'); script += m[3] + '\n'; }
    else { if (/^function/m.test(CODE[k].m)) { console.log('a function that is not written as a file:', k); process.exit(1); } script += CODE[k].m + '\n'; }
  }
  writeFileSync(d + '/hints_run.m', script);
}
writeFileSync(dir + '/programs.txt', PROGRAMS.map((p) => p.id).join('\n') + '\n');
" "$dir"
have_octave=1; command -v octave > /dev/null || have_octave=0
while read -r id; do
  OPENBLAS_NUM_THREADS=1 python3 "$dir/$id/hints.py" > "$dir/$id/py.out"
  if [ "$have_octave" = 1 ]; then (cd "$dir/$id" && octave --no-gui --quiet hints_run.m > m.out 2>&1); fi
done < "$dir/programs.txt"
python3 - "$dir" "$have_octave" <<'PY'
import json, re, sys
d, have = sys.argv[1], sys.argv[2] == '1'
R = json.load(open('tools/workbook_numbers.json')); X = R['exercises']
# what each program prints, in the order of its questions
WANT = {
    'chain': [X['chain20_lowest'], X['chain20_top_abs'][9], X['chain20_I10_z1']],
    'aah': R['J_z0'] + R['J_quarter'] + R['eig_k0_z0'] + [R['abs_overlap3_k0_k2pi50_phi0'], R['zak3_M50_phi0_over_pi'], R['zak3_M50_phiquarter_over_pi'], R['F3_first_plaquette_N10_over_pi'], R['sumF3_N10_over_pi'], R['chern_N10'][1]],
}
def numbers(text):                      # every number on the lines that hold nothing but numbers
    out = []
    for line in text.replace('[', ' ').replace(']', ' ').split('\n'):
        if line.strip() and re.fullmatch(r'[\s\d.eE+-]+', line): out += [float(x) for x in line.split()]
    return out
ok = True
programs = open(d + '/programs.txt').read().split()
if sorted(programs) != sorted(WANT): print('  FAIL the programs of code.js and of this test differ:', programs, sorted(WANT)); ok = False
for pid in programs:
    want = WANT.get(pid, [])
    # numpy prints an array with 8 decimals; MATLAB and Octave show 5 significant digits by default
    for name, f, tol in [('Python', 'py.out', 1e-7)] + ([('MATLAB lines in Octave', 'm.out', 1e-4)] if have else []):
        text = open(d + '/' + pid + '/' + f).read(); got = numbers(text)
        good = len(got) == len(want) and all(abs(a - b) < tol * max(1, abs(b)) for a, b in zip(got, want))
        ok &= good
        print(('  ok   ' if good else '  FAIL ') + pid + ', ' + name + ': ' + ' '.join('%.5g' % x for x in got))
        if not good: print(text); print('expected: ' + ' '.join('%.5g' % x for x in want))
if not have: print('  skipped: octave is not installed, the MATLAB lines were not run')
sys.exit(0 if ok else 1)
PY
