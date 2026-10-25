"""Builds portable/Steady (and a zip of it): just what a Windows PC needs to run Steady.
Run with: npm run portable"""

import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_PARENT = ROOT / "portable"
OUT = OUT_PARENT / "Steady"

README = """Steady, portable copy
=====================

To set up Steady on this computer:

1. Install Python 3 from python.org if it isn't installed (the standard installer is fine).
2. Put this Steady folder somewhere it can stay, for example Documents\\Steady.
3. Double-click "Set up Steady.pyw". It makes a "Steady app" shortcut on the Desktop and opens Steady.

Your data stays on this computer, in %APPDATA%\\Steady.
To update later, replace the dist and launcher folders with newer ones.
"""


def main() -> None:
    if not (ROOT / "dist" / "index.html").exists():
        raise SystemExit("Build first: npm run build")
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "launcher").mkdir(parents=True)
    shutil.copytree(ROOT / "dist", OUT / "dist")
    shutil.copy2(ROOT / "launcher" / "steady.pyw", OUT / "launcher" / "steady.pyw")
    shutil.copy2(ROOT / "launcher" / "setup_steady.pyw", OUT / "Set up Steady.pyw")
    shutil.copy2(ROOT / "assets" / "icon.ico", OUT / "icon.ico")
    (OUT / "READ ME.txt").write_text(README, encoding="utf-8")
    zpath = OUT_PARENT / "Steady-portable.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(OUT.rglob("*")):
            if f.is_file():
                z.write(f, Path("Steady") / f.relative_to(OUT))
    print(f"wrote {OUT} and {zpath} ({zpath.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
