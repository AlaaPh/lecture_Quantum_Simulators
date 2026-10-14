#!/usr/bin/env python3
"""Build the preview (Claude artifact) version of the app.

The artifact host wraps the page in its own document skeleton, so this script turns app/index.html
into a body fragment with the stylesheet inlined. Usage:

    python3 tools/make_artifact.py OUT_DIR

Writes OUT_DIR/index.html and prints the list of supporting files (js/ and vendor/) to publish next to it.
"""
import json, os, re, sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'app')

def main(out_dir):
    html = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    css = open(os.path.join(ROOT, 'css', 'style.css'), encoding='utf-8').read()
    title = re.search(r'<title>(.*?)</title>', html).group(1)
    desc = re.search(r'<meta name="description" content="(.*?)">', html).group(1)
    fonts = re.search(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>', html).group(0)
    body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
    body = body.replace('<script type="module" src="js/main.js"></script>', '')
    out = f'''<title>{title}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
{fonts}
<style>
{css}
</style>
{body.strip()}
<script type="module" src="js/main.js"></script>
'''
    os.makedirs(out_dir, exist_ok=True)
    open(os.path.join(out_dir, 'index.html'), 'w', encoding='utf-8').write(out)
    files = {}
    for sub in ('js', 'vendor'):
        for dirpath, _, names in os.walk(os.path.join(ROOT, sub)):
            for n in names:
                full = os.path.join(dirpath, n)
                rel = os.path.relpath(full, ROOT).replace(os.sep, '/')
                files[rel] = os.path.relpath(full, os.getcwd()).replace(os.sep, '/')
    print(json.dumps(files, indent=1))

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'artifact')
