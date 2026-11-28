# Builds design/mascots.html, the audition page, with every mascot inlined
# (so it opens straight from disk, no server). Run: python3 design/build.py
#
# The mascots live in src/mascots/ (the app uses the same files): <key>.svg is the drawing,
# <key>.json its faces, actions and framing, and mascot.css the shared animations.
# design/reference/<key>/ holds the original pictures they were drawn from.
import json
from pathlib import Path

ORDER = ['fable', 'noir', 'major', 'pulse']
here = Path(__file__).parent
src = here.parent / 'src' / 'mascots'
mascots = {}
for key in ORDER:
    svg, meta = src / f'{key}.svg', src / f'{key}.json'
    if svg.exists() and meta.exists():
        mascots[key] = {**json.loads(meta.read_text()), 'svg': svg.read_text()}

page = (here / 'mascots.template.html').read_text()
data = json.dumps(mascots).replace('</', '<\\/')
page = page.replace('/*MASCOTS*/{}', data).replace('/*MASCOT_CSS*/', (src / 'mascot.css').read_text())
(here / 'mascots.html').write_text(page)
print('wrote design/mascots.html with', ', '.join(mascots) or 'no mascots')
