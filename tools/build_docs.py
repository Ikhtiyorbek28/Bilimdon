"""Copy the shared front-end files from public/ into docs/ (the GitHub Pages demo).

The demo (docs/index.html + docs/demo.js) runs without the server, but uses the real site's
look: its stylesheet, helpers and avatar characters. Run this after changing any of them:

    python tools/build_docs.py
"""
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHARED = ["style.css", "common.js", "avatars.js", "avatar3d.js"]

for name in SHARED:
    shutil.copyfile(os.path.join(ROOT, "public", name), os.path.join(ROOT, "docs", name))
    print("docs/" + name)
