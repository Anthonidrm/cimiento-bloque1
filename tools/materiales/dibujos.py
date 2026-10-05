"""Biblioteca de dibujos en línea (SVG) para las hojas para colorear. Trazo grueso y formas grandes."""
import math, os
from PIL import Image, ImageChops, ImageFilter, ImageDraw
import common as C

SW = 8                      # grosor de línea base
ST = f'stroke="#000" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round"'
FW = f'{ST} fill="#fff"'    # relleno blanco: tapa lo que queda detrás
FN = f'{ST} fill="none"'


def fw(s):
    """Relleno blanco con grosor compensado por la escala: todas las líneas se ven igual de gruesas."""
    return f'stroke="#000" stroke-width="{SW/max(s, 0.35):.1f}" stroke-linecap="round" stroke-linejoin="round" fill="#fff"'


def fn(s):
    return fw(s).replace('fill="#fff"', 'fill="none"')


def sun(cx, cy, r, face=False):
    rays = "".join(f'<line x1="{cx+(r+16)*math.cos(math.radians(a)):.1f}" y1="{cy+(r+16)*math.sin(math.radians(a)):.1f}" x2="{cx+(r+r*0.55)*math.cos(math.radians(a)):.1f}" y2="{cy+(r+r*0.55)*math.sin(math.radians(a)):.1f}" {FN}/>' for a in range(0, 360, 30))
    f = ""
    if face:
        f = (f'<circle cx="{cx-r*0.3}" cy="{cy-r*0.15}" r="{r*0.09}" fill="#000"/><circle cx="{cx+r*0.3}" cy="{cy-r*0.15}" r="{r*0.09}" fill="#000"/>'
             f'<path d="M {cx-r*0.4} {cy+r*0.2} Q {cx} {cy+r*0.65} {cx+r*0.4} {cy+r*0.2}" {FN}/>')
    return f'{rays}<circle cx="{cx}" cy="{cy}" r="{r}" {FW}/>{f}'


def moon(cx, cy, R):
    d, r = R * 0.62, R * 0.86
    x = (d * d + R * R - r * r) / (2 * d); y = math.sqrt(R * R - x * x)
    return f'<path d="M {cx+x:.1f} {cy-y:.1f} A {R} {R} 0 1 0 {cx+x:.1f} {cy+y:.1f} A {r} {r} 0 0 1 {cx+x:.1f} {cy-y:.1f} Z" {FW}/>'


def star(cx, cy, r):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5; rr = r if i % 2 == 0 else r * 0.45
        pts.append(f"{cx+rr*math.cos(a):.1f},{cy+rr*math.sin(a):.1f}")
    return f'<polygon points="{" ".join(pts)}" {FW}/>'


def cloud(x, y, s=1):
    return f'<path transform="translate({x},{y}) scale({s})" d="M 0 60 a 34 34 0 0 1 20 -62 a 44 44 0 0 1 84 -8 a 36 36 0 0 1 22 70 Z" {fw(s)}/>'


def tree(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})"><rect x="-16" y="-10" width="32" height="110" rx="6" {fw(s)}/>'
            f'<circle cx="-46" cy="-26" r="52" {fw(s)}/><circle cx="46" cy="-26" r="52" {fw(s)}/><circle cx="0" cy="-78" r="58" {fw(s)}/></g>')


def flower(x, y, s=1):
    pet = "".join(f'<circle cx="{26*math.cos(math.radians(a)):.1f}" cy="{-26*math.sin(math.radians(a)):.1f}" r="18" {fw(s)}/>' for a in range(90, 450, 72))
    return (f'<g transform="translate({x},{y}) scale({s})"><line x1="0" y1="0" x2="0" y2="90" {fn(s)}/>'
            f'<path d="M 0 60 q 38 -28 56 -4 q -30 26 -56 4 Z" {fw(s)}/>{pet}<circle cx="0" cy="0" r="14" {fw(s)}/></g>')


def fish(x, y, s=1, flip=False):
    fx = -1 if flip else 1
    return (f'<g transform="translate({x},{y}) scale({s*fx},{s})"><path d="M -70 0 Q -20 -52 40 -10 L 78 -42 L 78 42 L 40 10 Q -20 52 -70 0 Z" {fw(s)}/>'
            f'<circle cx="-38" cy="-8" r="7" fill="#000"/><path d="M -2 -22 q 14 22 0 44" {fn(s)}/><path d="M 20 -14 q 10 14 0 28" {fn(s)}/></g>')


def bird(x, y, s=1, flip=False):
    fx = -1 if flip else 1
    return (f'<g transform="translate({x},{y}) scale({s*fx},{s})"><path d="M -60 0 Q -40 -42 10 -40 Q 50 -38 62 -8 L 92 -22 L 76 8 Q 50 40 0 34 Q -40 30 -60 0 Z" {fw(s)}/>'
            f'<path d="M -60 0 L -88 -6 L -62 12 Z" {fw(s)}/><path d="M -10 -4 q 24 -34 52 -14 q -16 30 -52 14 Z" {fw(s)}/><circle cx="38" cy="-20" r="6" fill="#000"/></g>')


def butterfly(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})"><ellipse cx="-34" cy="-22" rx="34" ry="28" {fw(s)}/><ellipse cx="34" cy="-22" rx="34" ry="28" {fw(s)}/>'
            f'<ellipse cx="-26" cy="26" rx="24" ry="22" {fw(s)}/><ellipse cx="26" cy="26" rx="24" ry="22" {fw(s)}/><rect x="-6" y="-34" width="12" height="76" rx="6" {fw(s)}/>'
            f'<path d="M -3 -34 q -12 -26 -22 -30 M 3 -34 q 12 -26 22 -30" {fn(s)}/></g>')


def mountains(x0, x1, base, h):
    w = (x1 - x0) / 3
    return (f'<path d="M {x0} {base} L {x0+w*0.7} {base-h} L {x0+w*1.4} {base-h*0.35} L {x0+w*1.9} {base-h*0.8} L {x0+w*2.6} {base-h*0.25} L {x0+w*3} {base-h*0.55} L {x1} {base} Z" {FW}/>'
            f'<path d="M {x0+w*0.7-40} {base-h+54} l 40 -20 l 38 22" {FN}/>')


def waves(x0, x1, y, rows=3):
    out = ""
    for r in range(rows):
        yy = y + r * 44; w = 60; xx = x0 + (r % 2) * 30
        d = f"M {xx} {yy}"
        while xx + w <= x1: d += f" q {w/4} -26 {w/2} 0 t {w/2} 0"; xx += w
        out += f'<path d="{d}" {FN}/>'
    return out


def turtle(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})"><ellipse cx="-70" cy="-8" rx="26" ry="22" {fw(s)}/><circle cx="-76" cy="-12" r="4" fill="#000"/>'
            f'<rect x="-44" y="14" width="28" height="30" rx="10" {fw(s)}/><rect x="28" y="14" width="28" height="30" rx="10" {fw(s)}/>'
            f'<path d="M -60 20 Q -50 -70 10 -70 Q 70 -70 80 20 Z" {fw(s)}/><path d="M -20 20 L -20 -48 M 30 20 L 30 -48 M -52 -16 L 62 -16" {fn(s)}/></g>')


def rabbit(x, y, s=1):
    return (f'<g transform="translate({x},{y}) scale({s})"><ellipse cx="0" cy="0" rx="54" ry="42" {fw(s)}/><circle cx="-4" cy="-62" r="32" {fw(s)}/>'
            f'<ellipse cx="-18" cy="-122" rx="11" ry="34" {fw(s)}/><ellipse cx="14" cy="-122" rx="11" ry="34" {fw(s)}/><circle cx="-14" cy="-66" r="5" fill="#000"/><circle cx="8" cy="-66" r="5" fill="#000"/>'
            f'<ellipse cx="-3" cy="-52" rx="5" ry="3.5" fill="#000"/><circle cx="56" cy="8" r="14" {fw(s)}/></g>')


def heart(cx, cy, s=1):
    return f'<path transform="translate({cx},{cy}) scale({s})" d="M 0 40 C -70 -10 -50 -62 -2 -34 C 0 -32 0 -32 2 -34 C 50 -62 70 -10 0 40 Z" {fw(s)}/>'


def heart_band(cx, cy, s=1):
    return heart(cx, cy, s) + f'<g transform="translate({cx},{cy}) rotate(-30) scale({s})"><rect x="-34" y="-12" width="68" height="24" rx="6" {fw(s)}/><circle cx="-12" cy="0" r="3" fill="#000"/><circle cx="0" cy="0" r="3" fill="#000"/><circle cx="12" cy="0" r="3" fill="#000"/></g>'


def crown(cx, cy, w=160):
    s = w / 160
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M -80 40 L -90 -30 L -42 4 L 0 -52 L 42 4 L 90 -30 L 80 40 Z" {fw(s)}/>'
            f'<rect x="-82" y="40" width="164" height="22" rx="8" {fw(s)}/><circle cx="-90" cy="-36" r="11" {fw(s)}/><circle cx="0" cy="-60" r="11" {fw(s)}/><circle cx="90" cy="-36" r="11" {fw(s)}/>'
            f'<circle cx="-40" cy="26" r="7" {fw(s)}/><circle cx="0" cy="26" r="7" {fw(s)}/><circle cx="40" cy="26" r="7" {fw(s)}/></g>')


def gem(cx, cy, s=1):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M -50 -14 L -28 -46 L 28 -46 L 50 -14 L 0 50 Z" {fw(s)}/>'
            f'<path d="M -50 -14 L 50 -14 M -28 -46 L -12 -14 L 0 50 M 28 -46 L 12 -14 L 0 50" {fn(s)}/></g>')


def medal(cx, cy, s=1):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M -34 -70 L -4 -20 L -30 -20 L -52 -62 Z" {fw(s)}/><path d="M 34 -70 L 4 -20 L 30 -20 L 52 -62 Z" {fw(s)}/>'
            f'<circle cx="0" cy="20" r="46" {fw(s)}/><circle cx="0" cy="20" r="30" {fn(s)}/>{star(0, 20, 22)}</g>')


def apple_halves(cx, cy, s=1):
    half = (f'<path d="M 0 -46 A 46 48 0 0 0 0 50 Z" {fw(s)}/><ellipse cx="-14" cy="2" rx="5" ry="9" fill="#000"/>'
            f'<path d="M 0 -46 q -6 -18 -16 -24 M -14 -64 q 22 -8 28 8 q -20 6 -28 -8 Z" {fn(s)}/>')
    return f'<g transform="translate({cx},{cy}) scale({s})"><g transform="translate(-10,0)">{half}</g><g transform="translate(10,0) scale(-1,1)">{half}</g></g>'


def watering_can(cx, cy, s=1):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M -50 -20 L 40 -20 L 46 46 L -44 46 Z" {fw(s)}/><path d="M 40 0 L 92 -46 L 104 -34 L 46 24" {fw(s)}/>'
            f'<path d="M -50 -4 q -48 -34 -22 -62 q 10 -8 22 8" {fn(s)}/><path d="M 96 -18 q 12 12 4 26 M 110 -4 q 8 18 -2 30 M 84 -2 q 10 16 2 30" {fn(s)}/></g>')


def plant(cx, cy, s=1):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M -34 20 L 34 20 L 26 80 L -26 80 Z" {fw(s)}/><line x1="0" y1="20" x2="0" y2="-44" {fn(s)}/>'
            f'<path d="M 0 -10 q -52 -6 -50 -52 q 46 -2 50 52 Z" {fw(s)}/><path d="M 0 -30 q 52 -4 52 -52 q -48 0 -52 52 Z" {fw(s)}/></g>')


def glass(cx, cy, s=1):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M -38 -56 L 38 -56 L 28 56 L -28 56 Z" {fw(s)}/><path d="M -33 -22 L 33 -22" {fn(s)}/>'
            f'<path d="M -16 -2 q 6 12 0 20 q -6 -8 0 -20 Z M 12 14 q 6 12 0 20 q -6 -8 0 -20 Z" {fw(s)}/></g>')


def magnifier(cx, cy, s=1):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><circle cx="0" cy="0" r="62" {fw(s)}/><circle cx="0" cy="0" r="46" {fn(s)}/>'
            f'<path d="M 44 44 L 98 98" stroke="#000" stroke-width="22" stroke-linecap="round"/><path d="M 44 44 L 98 98" stroke="#fff" stroke-width="8" stroke-linecap="round"/></g>')


def fingerprint(cx, cy, s=1):
    arcs = "".join(f'<path d="M {-r} 20 A {r} {r*1.15} 0 0 1 {r} 20" {fn(s)}/>' for r in (14, 28, 42, 56))
    return f'<g transform="translate({cx},{cy}) scale({s})"><circle cx="0" cy="0" r="72" {fw(s)}/>{arcs}<path d="M -56 20 q 0 40 20 52 M 56 20 q 0 40 -20 52 M -28 20 q 0 24 10 36 M 28 20 q 0 24 -10 36" {fn(s)}/></g>'


def name_card(x, y, w, h, label="Mi nombre:"):
    return (f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="26" {FW}/><circle cx="{x+w/2}" cy="{y+30}" r="11" {FN}/>'
            f'<text x="{x+34}" y="{y+h*0.50}" font-family="DejaVu Serif" font-weight="bold" font-size="40" fill="#000">{label}</text>'
            f'<path d="M {x+34} {y+h*0.80} L {x+w-34} {y+h*0.80}" {FN} stroke-dasharray="4 18"/>')


def open_book(cx, cy, s=1):
    return (f'<g transform="translate({cx},{cy}) scale({s})"><path d="M 0 -30 Q -60 -54 -110 -34 L -110 40 Q -60 20 0 46 Z" {fw(s)}/><path d="M 0 -30 Q 60 -54 110 -34 L 110 40 Q 60 20 0 46 Z" {fw(s)}/>'
            f'<path d="M -88 -20 q 30 -8 70 8 M -88 2 q 30 -8 70 8 M 88 -20 q -30 -8 -70 8 M 88 2 q -30 -8 -70 8" {fn(s)}/></g>')


def sparkles(cx, cy, s=1):
    return f'<g transform="translate({cx},{cy}) scale({s})"><path d="M 0 -26 L 0 26 M -26 0 L 26 0" {fn(s)}/></g>'


def circle_frame(cx, cy, r):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" {FW} stroke-dasharray="1 0"/>'


def mirror_frame(cx, cy, rx, ry):
    return f'<ellipse cx="{cx}" cy="{cy}" rx="{rx}" ry="{ry}" {FW}/><ellipse cx="{cx}" cy="{cy}" rx="{rx-26}" ry="{ry-26}" {FN}/><rect x="{cx-30}" y="{cy+ry-4}" width="60" height="30" rx="8" {FW}/>'


# ---------- Personajes en línea (derivados de los SVG oficiales) ----------
S_H = 900
Y0, H_VIEW = -8, 300


def lineart(who, pose, height=S_H):
    """PNG de contorno (línea negra gruesa sobre transparente) del personaje oficial, con rostro simplificado."""
    dst = os.path.join(C.CACHE, f"linev2_{who}_{pose}_{height}.png")
    if os.path.exists(dst):
        return dst
    im = Image.open(C.character(who, pose, height)).convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
    rgb = bg.convert("RGB"); e = Image.new("L", im.size, 0)
    for ch in rgb.split():
        e = ImageChops.lighter(e, ImageChops.lighter(ImageChops.difference(ch, ImageChops.offset(ch, 1, 0)), ImageChops.difference(ch, ImageChops.offset(ch, 0, 1))))
    mask = e.point(lambda v: 255 if v > 10 else 0)
    S = height / H_VIEW
    hd = lambda x, y: ((100 + (x - 100) * 1.1) * S, (118 + (y - 118) * 1.1 - Y0) * S)     # cabeza
    bd = lambda x, y: (x * S, (128 + (y - 128) * 0.8 - Y0) * S)                            # cuerpo
    g = who == "nina"
    cx, cy, rx, ry = (100, 87, 40, 27) if g else (100, 89, 36, 25)
    (x0, y0), (x1, y1) = hd(cx - rx, cy - ry), hd(cx + rx, cy + ry)
    d = ImageDraw.Draw(mask); d.ellipse([x0, y0, x1, y1], fill=0)
    if g:
        (a, b), (c2, d2) = bd(105, 250), bd(126, 274); d.rectangle([a, b, c2, d2], fill=0)   # parche del jean: solo contorno
    k = max(7, int(height * 0.012))
    mask = mask.filter(ImageFilter.MaxFilter(k | 1)); d = ImageDraw.Draw(mask)
    if g:
        (a, b), (c2, d2) = bd(108, 252), bd(123, 271); d.rectangle([a, b, c2, d2], outline=255, width=int(2.6 * S))
    ey, dx, er = (78, 19, 7.2) if g else (80, 17, 6.0)
    for sx in (-1, 1):
        px, py = hd(100 + sx * dx, ey); d.ellipse([px - er * S, py - er * 1.25 * S, px + er * S, py + er * 1.25 * S], fill=255)
    mx, my = hd(100, 98 if g else 99); w = (18 if g else 15) * S * 1.1
    d.arc([mx - w, my - w * 0.55, mx + w, my + w * 0.75], start=20, end=160, fill=255, width=int(2.8 * S))
    res = Image.new("RGBA", im.size, (255, 255, 255, 0)); res.paste(Image.new("RGBA", im.size, (0, 0, 0, 255)), mask=mask)
    d2 = ImageDraw.Draw(res)
    for sx in (-1, 1):
        px, py = hd(100 + sx * dx + sx * 1.5, ey - 3); d2.ellipse([px - 2 * S, py - 2 * S, px + 2 * S, py + 2 * S], fill=(255, 255, 255, 255))
    # silueta blanca: lo que queda detrás del personaje se tapa y los solapes quedan limpios
    sil = im.split()[3].point(lambda v: 255 if v > 20 else 0).filter(ImageFilter.MaxFilter(5))
    base = Image.new("RGBA", im.size, (255, 255, 255, 0)); base.paste(Image.new("RGBA", im.size, (255, 255, 255, 255)), mask=sil)
    base.alpha_composite(res); base.save(dst)
    return dst
