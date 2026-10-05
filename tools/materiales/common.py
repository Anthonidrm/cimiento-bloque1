"""Utilidades comunes de los generadores de materiales de CIMIENTO."""
import os
from PIL import Image, ImageDraw
import math
import cairosvg

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
PUB = os.path.join(ROOT, "public")
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(OUT, "cache")
os.makedirs(CACHE, exist_ok=True)

NAVY = "#12304D"; NAVY_DARK = "#0E2338"; GOLD = "#D9A13F"; PAPER = "#FAF7F0"; INK = "#2B2620"


def character(who, pose="stand", height=900):
    """PNG transparente del personaje oficial ('nina' | 'nino') a partir del SVG de la app."""
    dst = os.path.join(CACHE, f"{who}_{pose}_{height}.png")
    if not os.path.exists(dst):
        cairosvg.svg2png(url=os.path.join(PUB, "personajes", f"{who}-{pose}.svg"), write_to=dst, output_height=height)
    return dst


def logo_cimiento():
    dst = os.path.join(CACHE, "logo-cimiento-small.png")
    if not os.path.exists(dst):
        im = Image.open(os.path.join(ROOT, "src", "assets", "logo-cimiento.png")).convert("RGBA")
        im.thumbnail((500, 400)); im.save(dst)
    return dst


def logo_ieoh():
    dst = os.path.join(CACHE, "logo-ieoh-badge.png")
    if not os.path.exists(dst):
        im = Image.open(os.path.join(ROOT, "src", "assets", "logo-ieoh-badge.png")).convert("RGBA")
        im.thumbnail((300, 300)); im.save(dst)
    return dst


def aspect(path):
    w, h = Image.open(path).size
    return w / h


# ---------- Ilustraciones de apoyo (sol, árbol, pájaro, espejo, corazón, tesoro) ----------
def _canvas(size):
    return Image.new("RGBA", size, (0, 0, 0, 0))


def illustrations():
    """Genera (si no existen) las ilustraciones simples usadas en presentaciones y tarjetas."""
    def out(n): return os.path.join(CACHE, n)
    if os.path.exists(out("ill_treasure.png")):
        return
    img = _canvas((500, 500)); d = ImageDraw.Draw(img); cx = cy = 250; r = 110
    for i in range(12):
        a = math.radians(i * 30)
        d.line([(cx + (r + 15) * math.cos(a), cy + (r + 15) * math.sin(a)), (cx + (r + 70) * math.cos(a), cy + (r + 70) * math.sin(a))], fill=(255, 183, 3, 255), width=18)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 209, 102, 255), outline=(230, 150, 20, 255), width=6); img.save(out("ill_sun.png"))
    img = _canvas((500, 500)); d = ImageDraw.Draw(img); d.rounded_rectangle([220, 320, 280, 470], radius=14, fill=(122, 79, 43, 255))
    for (x, y, rr, c) in [(190, 270, 95, (96, 163, 88, 255)), (310, 270, 95, (96, 163, 88, 255)), (250, 220, 110, (120, 190, 110, 255)), (250, 300, 90, (76, 140, 72, 255))]:
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=c)
    img.save(out("ill_tree.png"))
    img = _canvas((500, 300)); d = ImageDraw.Draw(img)
    d.polygon([(60, 150), (180, 90), (250, 140), (180, 130), (140, 180), (120, 140), (60, 150)], fill=(74, 144, 226, 255))
    d.polygon([(250, 140), (320, 90), (440, 150), (380, 140), (360, 180), (320, 130), (250, 140)], fill=(74, 144, 226, 255))
    d.ellipse([225, 120, 275, 165], fill=(247, 148, 29, 255)); img.save(out("ill_bird.png"))
    img = _canvas((500, 600)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([90, 40, 410, 520], radius=60, outline=(120, 150, 190, 255), width=22); d.rounded_rectangle([120, 70, 380, 490], radius=45, fill=(214, 232, 245, 255))
    d.rounded_rectangle([220, 520, 280, 560], fill=(120, 150, 190, 255)); d.rounded_rectangle([160, 555, 340, 585], radius=12, fill=(120, 150, 190, 255))
    for (x, y) in [(140, 110), (360, 140), (150, 460)]:
        d.line([(x - 14, y), (x + 14, y)], fill=(255, 209, 102, 255), width=6); d.line([(x, y - 14), (x, y + 14)], fill=(255, 209, 102, 255), width=6)
    img.save(out("ill_mirror.png"))
    img = _canvas((600, 600)); d = ImageDraw.Draw(img)
    pts = []
    for t in range(0, 360, 4):
        rad = math.radians(t); x = 16 * math.sin(rad) ** 3
        y = 13 * math.cos(rad) - 5 * math.cos(2 * rad) - 2 * math.cos(3 * rad) - math.cos(4 * rad)
        pts.append((300 + x * 11, 270 - y * 11))
    d.polygon(pts, fill=(235, 127, 61, 255))
    for (x, y) in [(120, 150), (470, 140), (500, 380), (110, 400)]:
        d.line([(x - 12, y), (x + 12, y)], fill=(255, 209, 102, 255), width=6); d.line([(x, y - 12), (x, y + 12)], fill=(255, 209, 102, 255), width=6)
    d.arc([160, 360, 300, 520], start=200, end=340, fill=(224, 172, 128, 255), width=26); d.arc([300, 360, 440, 520], start=200, end=340, fill=(224, 172, 128, 255), width=26)
    img.save(out("ill_heart_hands.png"))
    img = _canvas((600, 500)); d = ImageDraw.Draw(img)
    d.rounded_rectangle([120, 220, 480, 420], radius=18, fill=(157, 107, 53, 255), outline=(90, 58, 26, 255), width=8)
    d.pieslice([120, 140, 480, 300], start=180, end=360, fill=(184, 132, 66, 255), outline=(90, 58, 26, 255), width=8)
    d.rectangle([280, 220, 320, 300], fill=(255, 209, 102, 255), outline=(90, 58, 26, 255), width=6)
    for x in (150, 200, 400, 450): d.rectangle([x, 220, x + 14, 420], fill=(90, 58, 26, 255))
    for (x, y, rr) in [(150, 440, 26), (210, 455, 22), (270, 445, 24), (330, 455, 20)]:
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=(255, 209, 102, 255), outline=(200, 150, 20, 255), width=4)
    img.save(out("ill_treasure.png"))


def ill(name):
    illustrations()
    return os.path.join(CACHE, name)
