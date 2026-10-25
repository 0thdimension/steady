"""Draws the Steady icon (a spirit-level pill with a centered bubble).
Writes assets/icon.ico (for shortcuts) and public/icon.png (for the window). Needs Pillow."""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
S = 1024
img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
# Rounded square tile, neutral charcoal like the dark theme
d.rounded_rectangle([40, 40, S - 40, S - 40], radius=220, fill=(30, 31, 34, 255))
# The level: an outlined pill
d.rounded_rectangle([170, 380, S - 170, S - 380], radius=132, outline=(246, 245, 243, 255), width=40)
# The bubble, in the dark theme's green accent
r = 92
d.ellipse([S // 2 - r, S // 2 - r, S // 2 + r, S // 2 + r], fill=(74, 222, 128, 255))

(ROOT / "assets").mkdir(exist_ok=True)
img.save(ROOT / "assets" / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
img.resize((256, 256), Image.LANCZOS).save(ROOT / "public" / "icon.png")
print("wrote assets/icon.ico and public/icon.png")
