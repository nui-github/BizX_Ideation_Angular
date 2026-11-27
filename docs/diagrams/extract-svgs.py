#!/usr/bin/env python3
"""Extract the <svg> of the /docs diagrams from their standalone HTML sources.

The HTML files in this folder are the source of truth (drawn with the diagram-design skill, profile
"bizx"). The /docs page imports plain SVG files, so after editing a diagram run:

    python3 docs/diagrams/extract-svgs.py

Screenshots referenced by the user flow are served from prototype/public/docs/shots/; the HTML sources
point at them with a relative path so they open from disk, and this script rewrites that to /docs/shots.
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'docs' / 'diagrams'
OUT = ROOT / 'prototype' / 'components' / 'docs'
MAP = {
    'data-comparison-flow.html': 'data-comparison-flow.svg',
    'job-status.html': 'job-status.svg',
    'doc-status.html': 'doc-status.svg',
    'user-flow-shipment-export.html': 'user-flow.svg',
}
REL = '../../prototype/public/docs/shots'
OUT.mkdir(parents=True, exist_ok=True)
for html, svg in MAP.items():
    text = (SRC / html).read_text(encoding='utf-8')
    m = re.search(r'<svg\b.*?</svg>', text, re.S)
    if not m:
        raise SystemExit(f'no <svg> in {html}')
    (OUT / svg).write_text(m.group(0).replace(REL, '/docs/shots') + '\n', encoding='utf-8')
    print('wrote', (OUT / svg).relative_to(ROOT))
