"""Hojas para colorear (blanco y negro, líneas gruesas): una escena distinta por semana."""
import base64, os
import cairosvg
import common as C
import dibujos as D
from dibujos import *

W, H = 850, 1100
ASPECT = 200 / 300


def kid(who, pose, x, y, h):
    b64 = base64.b64encode(open(D.lineart(who, pose), "rb").read()).decode()
    return f'<image x="{x}" y="{y}" width="{h*ASPECT:.0f}" height="{h}" href="data:image/png;base64,{b64}"/>'


def label(x, y, text, size=34, anchor="middle"):
    return f'<text x="{x}" y="{y}" text-anchor="{anchor}" font-family="DejaVu Serif" font-weight="bold" font-size="{size}" fill="#000">{text}</text>'


def page(body, caption, sub=None, size=62):
    cap = label(W / 2, 1018, caption, size)
    if sub: cap += label(W / 2, 1060, sub, 26)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}"><rect width="{W}" height="{H}" fill="#fff"/>'
            f'<rect x="22" y="22" width="{W-44}" height="{H-44}" rx="36" {FN}/>{body}{cap}</svg>')


# ---------------- Semana 1 — Dios me creó (escena de la creación) ----------------
def semana1():
    b = "".join([
        sun(665, 175, 68), moon(150, 170, 62),
        "".join(star(x, y, r) for x, y, r in [(300, 100, 20), (405, 170, 15), (500, 90, 18), (255, 215, 13), (95, 285, 15), (775, 310, 15)]),
        cloud(290, 215, 1.0), cloud(500, 232, 0.8), bird(420, 135, 0.7), bird(575, 105, 0.5, True),
        mountains(40, 810, 500, 190),
        waves(50, 300, 545, 4), fish(115, 610, 0.95), fish(160, 715, 0.85, True),
        tree(715, 835, 0.9), tree(625, 868, 0.55), butterfly(690, 600, 0.6),
        flower(70, 830, 0.8), flower(165, 800, 0.7), flower(630, 840, 0.7),
        turtle(110, 895, 0.8), rabbit(690, 905, 0.65),
        f'<path d="M 50 936 Q 425 912 800 936" {FN}/>',
        kid("nina", "wave", 215, 545, 390), kid("nino", "wave", 385, 545, 390),
    ])
    return page(b, "Dios me creó", "Génesis 1:27")


# ---------------- Semana 2 — Fui creado a imagen de Dios ----------------
def semana2():
    def burbuja(cx, cy, icono, texto, fs=26):
        return f'<circle cx="{cx}" cy="{cy}" r="80" {FW}/>{icono}{label(cx, cy+114, texto, fs)}'
    b = "".join([
        mirror_frame(425, 215, 118, 140), sparkles(300, 120, 0.7), sparkles(560, 130, 0.8), sparkles(545, 335, 0.6), star(425, 215, 34),
        burbuja(112, 215, heart(112, 218, 0.85), "AMAR"),
        burbuja(112, 505, heart_band(112, 508, 0.8), "MISERICORDIA", 19),
        burbuja(112, 795, apple_halves(112, 800, 0.8), "COMPARTIR", 22),
        burbuja(738, 215, sun(738, 217, 34, face=True), "ALEGRÍA", 24),
        burbuja(738, 505, f'{plant(718, 512, 0.5)}{watering_can(756, 486, 0.36)}', "CUIDAR"),
        burbuja(738, 795, glass(738, 800, 0.85), "SERVIR"),
        f'<path d="M 215 880 Q 425 862 640 880" {FN}/>',
        kid("nina", "cheer", 205, 480, 400), kid("nino", "cheer", 385, 480, 400),
    ])
    return page(b, "Llevo la imagen de Dios", "Génesis 1:26-27", 50)


# ---------------- Semana 3 — Dios me conoce ----------------
def semana3():
    b = "".join([
        name_card(160, 70, 530, 190), label(425, 306, "¡Escribe tu nombre!", 30),
        magnifier(140, 470, 1.0), heart(122, 458, 0.4), fingerprint(725, 470, 1.0),
        heart(300, 380, 0.6), heart(560, 372, 0.7), heart(430, 420, 0.38),
        star(60, 640, 17), star(790, 650, 17), star(95, 760, 12), star(760, 770, 12),
        open_book(150, 885, 0.95), heart(725, 880, 0.75),
        f'<path d="M 190 925 Q 440 905 690 925" {FN}/>',
        kid("nina", "stand", 205, 495, 430), kid("nino", "wave", 400, 495, 430),
    ])
    return page(b, "Dios me conoce", "Salmo 139:1", 62)


# ---------------- Semana 4 — Mi vida tiene valor ----------------
def semana4():
    rays = "".join(f'<line x1="{425+150*math.cos(math.radians(a)):.0f}" y1="{200-150*math.sin(math.radians(a))*0.8:.0f}" x2="{425+210*math.cos(math.radians(a)):.0f}" y2="{200-210*math.sin(math.radians(a))*0.8:.0f}" {FN}/>' for a in range(20, 170, 25))
    kh = 400; kw = kh * ASPECT
    b = "".join([
        rays, crown(425, 205, 280),
        star(130, 130, 28), star(720, 130, 28), star(60, 240, 17), star(790, 240, 17), star(200, 60, 14), star(650, 60, 14),
        gem(110, 360, 0.9), gem(740, 360, 0.9),
        medal(425, 560, 0.9), heart(425, 730, 0.95), star(425, 850, 20),
        f'<path d="M 70 872 Q 425 852 780 872" {FN}/>',
        crown(85 + kw / 2, 428, 100), crown(498 + kw / 2, 428, 100),
        kid("nina", "stand", 85, 470, kh), kid("nino", "stand", 498, 470, kh),
        heart(150, 940, 0.45), heart(425, 945, 0.4), heart(700, 940, 0.45),
    ])
    return page(b, "Mi vida tiene valor", "Salmo 8:5", 58)


if __name__ == "__main__":
    for n, fn in enumerate((semana1, semana2, semana3, semana4), 1):
        svg = fn()
        open(os.path.join(C.OUT, f"colorear-{n}.svg"), "w").write(svg)
        cairosvg.svg2pdf(bytestring=svg.encode(), write_to=os.path.join(C.OUT, f"colorear-semana-{n}.pdf"), scale=0.96)
        cairosvg.svg2png(bytestring=svg.encode(), write_to=os.path.join(C.OUT, f"colorear-{n}.png"), output_width=560)
        print(f"colorear-semana-{n}.pdf")
