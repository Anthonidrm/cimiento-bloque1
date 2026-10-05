"""Hojas de trabajo del estudiante (5–10 años): actividades reales para completar."""
import os, math
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import common as C

NAVY = (14/255, 35/255, 56/255); GOLD = (217/255, 161/255, 63/255); GOLD_BG = (250/255, 241/255, 222/255)
INK = (28/255, 28/255, 26/255); LINE = (180/255, 180/255, 170/255)
W, H = LETTER
GIRL = C.character("nina", "stand"); BOY = C.character("nino", "wave")
R = 200 / 300


def img(c, p, x, y, h):
    c.drawImage(ImageReader(p), x, y, width=h * R, height=h, mask="auto")


def header(c, week, title):
    c.setFillColorRGB(*NAVY); c.rect(0, H - 1.15*inch, W, 1.15*inch, fill=1, stroke=0)
    c.drawImage(ImageReader(C.logo_cimiento()), 0.45*inch, H - 1.0*inch, width=1.15*inch, height=0.78*inch, mask="auto", preserveAspectRatio=True)
    c.drawImage(ImageReader(C.logo_ieoh()), 1.7*inch, H - 0.94*inch, width=0.52*inch, height=0.52*inch, mask="auto", preserveAspectRatio=True)
    c.setFillColorRGB(*GOLD); c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(W/2 + 0.2*inch, H - 0.48*inch, f"SEMANA {week} · HOJA DE TRABAJO DEL ESTUDIANTE (5–10 años)")
    c.setFillColorRGB(1, 1, 1); c.setFont("Helvetica-Bold", 19); c.drawCentredString(W/2 + 0.2*inch, H - 0.88*inch, title)
    img(c, GIRL, W - 1.75*inch, H - 1.12*inch, 1.0*inch); img(c, BOY, W - 1.0*inch, H - 1.12*inch, 1.0*inch)


def footer(c):
    c.setFillColorRGB(*GOLD); c.rect(0, 0, W, 0.12*inch, fill=1, stroke=0)
    c.setFillColorRGB(0.55, 0.55, 0.5); c.setFont("Helvetica", 8); c.drawCentredString(W/2, 0.22*inch, "CIMIENTO · Construyendo vidas sobre Cristo.")


def banner(c):
    top = 0.72*inch; h = 0.5*inch
    c.setFillColorRGB(*GOLD_BG); c.rect(0.5*inch, top - h, 7.4*inch, h, fill=1, stroke=0)
    img(c, GIRL, 0.55*inch, top - h + 0.02*inch, 0.46*inch); img(c, BOY, 0.88*inch, top - h + 0.02*inch, 0.46*inch)
    c.setFillColorRGB(*NAVY); c.setFont("Helvetica-Bold", 11); c.drawString(1.5*inch, top - 0.21*inch, "¡Excelente trabajo!")
    c.setFillColorRGB(*INK); c.setFont("Helvetica", 9); c.drawString(3.0*inch, top - 0.21*inch, "Comparte esta hoja con tu maestro o tu familia.")


# --- iconos simples por tipo de actividad ---
def i_pencil(c, x, y):
    c.saveState(); c.translate(x, y); c.rotate(45); c.setFillColorRGB(*GOLD); c.rect(-3, 0, 6, 22, fill=1, stroke=0)
    c.setFillColorRGB(*INK); p = c.beginPath(); p.moveTo(-3, 22); p.lineTo(3, 22); p.lineTo(0, 30); p.close(); c.drawPath(p, fill=1, stroke=0); c.restoreState()
def i_check(c, x, y):
    c.setStrokeColorRGB(*GOLD); c.setLineWidth(2.4); c.line(x-7, y, x-2, y-7); c.line(x-2, y-7, x+9, y+9)
def i_link(c, x, y):
    c.setStrokeColorRGB(*GOLD); c.setLineWidth(2.2); c.ellipse(x-9, y-6, x+3, y+6); c.ellipse(x-3, y-6, x+9, y+6)
def i_star(c, x, y):
    c.setFillColorRGB(*GOLD); p = c.beginPath()
    pts = [(x + (9 if i % 2 == 0 else 4) * math.cos(math.pi/2 + i*math.pi/5), y + (9 if i % 2 == 0 else 4) * math.sin(math.pi/2 + i*math.pi/5)) for i in range(10)]
    p.moveTo(*pts[0]); [p.lineTo(*q) for q in pts[1:]]; p.close(); c.drawPath(p, fill=1, stroke=0)
ICON = {"fill": i_pencil, "tf": i_check, "match": i_link, "write": i_pencil, "mc": i_star, "draw": i_pencil}


def title(c, y, n, text, kind):
    c.setFillColorRGB(*GOLD_BG); c.circle(0.72*inch, y + 16, 15, fill=1, stroke=0); ICON[kind](c, 0.72*inch, y + 16)
    c.setFillColorRGB(*GOLD); c.setFont("Helvetica-Bold", 9); c.drawString(1.0*inch, y, f"ACTIVIDAD {n}")
    c.setFillColorRGB(*NAVY); c.setFont("Helvetica-Bold", 13); c.drawString(1.0*inch, y - 18, text)
    return y - 36


def build(week, name, acts):
    out = os.path.join(C.OUT, f"hoja-trabajo-semana-{week}.pdf")
    c = canvas.Canvas(out, pagesize=LETTER); header(c, week, name)
    y = H - 1.45*inch
    c.setFont("Helvetica", 11); c.setFillColorRGB(*INK); c.drawString(0.6*inch, y, "Nombre:"); c.setStrokeColorRGB(*LINE)
    c.line(1.3*inch, y - 2, 5.6*inch, y - 2); c.drawString(5.8*inch, y, "Edad:"); c.line(6.3*inch, y - 2, 7.9*inch, y - 2)
    y -= 0.5*inch
    for n, a in enumerate(acts, 1):
        y = title(c, y, n, a["t"], a["k"])
        if a.get("i"):
            c.setFillColorRGB(*INK); c.setFont("Helvetica-Oblique", 10); c.drawString(0.6*inch, y, a["i"]); y -= 20
        k = a["k"]
        if k == "fill":
            c.setFillColorRGB(*NAVY); c.setFont("Helvetica-Bold", 10); c.drawString(0.6*inch, y, "Banco de palabras: " + " · ".join(a["bank"])); y -= 24
            for line in a["lines"]:
                c.setFillColorRGB(*INK); c.setFont("Helvetica", 11); c.drawString(0.6*inch, y, line); y -= 22
            y -= 2
        elif k == "tf":
            for s in a["items"]:
                c.setFillColorRGB(*INK); c.setFont("Helvetica", 11); c.drawString(0.6*inch, y, "• " + s); c.setStrokeColorRGB(*NAVY)
                c.rect(6.3*inch, y - 11, 0.32*inch, 0.32*inch); c.rect(6.9*inch, y - 11, 0.32*inch, 0.32*inch)
                c.setFont("Helvetica-Bold", 8); c.drawCentredString(6.46*inch, y - 22, "V"); c.drawCentredString(7.06*inch, y - 22, "F"); y -= 40
        elif k == "match":
            c.setFillColorRGB(*NAVY); c.setFont("Helvetica-Bold", 9); c.drawString(0.8*inch, y, "COLUMNA A"); c.drawRightString(7.5*inch, y, "COLUMNA B"); y -= 18
            for l, r in a["pairs"]:
                c.setFillColorRGB(*INK); c.setFont("Helvetica", 11); c.drawString(0.8*inch, y, l); c.circle(0.68*inch, y + 3, 3, fill=1)
                c.drawRightString(7.5*inch, y, r); c.circle(7.62*inch, y + 3, 3, fill=1); y -= 30
        elif k == "write":
            c.setStrokeColorRGB(*LINE)
            for _ in range(a.get("n", 3)): c.line(0.6*inch, y, 7.9*inch, y); y -= 22
        elif k == "mc":
            c.setFillColorRGB(*INK); c.setFont("Helvetica-Bold", 11); c.drawString(0.6*inch, y, a["p"]); y -= 20; c.setFont("Helvetica", 10.5)
            for lab, t in a["opts"]:
                c.circle(0.75*inch, y + 3, 5); c.drawString(0.95*inch, y, f"{lab}) {t}"); y -= 20
            y -= 6
        elif k == "draw":
            c.setFillColorRGB(*NAVY); c.setFont("Helvetica-Oblique", 9); c.drawString(0.6*inch, y, "Dibuja aquí:")
            c.setStrokeColorRGB(*LINE); c.rect(0.6*inch, y - a["h"]*inch - 6, 7.3*inch, a["h"]*inch); y -= a["h"]*inch + 26
        y -= 12 if k in ("match", "mc", "tf") else 3
    banner(c); footer(c); c.showPage(); c.save()
    print(f"hoja-trabajo-semana-{week}.pdf  (contenido termina en {y/inch:.2f} in; banner en 0.72 in)")
    assert y / inch > 0.75, "el contenido invade el banner de cierre"


build(1, "Dios me creó", [
    dict(k="fill", t="Completa la frase", i="Usa el banco de palabras para completar.", bank=["creó", "propósito", "accidente"],
         lines=["Dios me ______________ a mí, con ______________.", "No fui hecho por ______________."]),
    dict(k="tf", t="Marca V (Verdadero) o F (Falso)", i="Lee cada frase y marca con una X.",
         items=["Dios hizo el sol, el mar y los árboles.", "Dios me creó por accidente.", "Génesis 2:7 dice que Dios formó al hombre del polvo."]),
    dict(k="write", t="¿Qué te gusta de cómo Dios te hizo?", i="Escribe una o dos frases."),
    dict(k="draw", t="Dibújate a ti mismo", i="Dios te hizo a propósito — ¡dibújate sonriendo!", h=0.55)])
build(2, "Fui creado a imagen de Dios", [
    dict(k="fill", t="Completa la frase", i="Usa el banco de palabras.", bank=["imagen", "reflejo", "todas"],
         lines=["Fui creado a ______________ de Dios.", "______________ las personas llevan la imagen de Dios."]),
    dict(k="match", t="Relaciona cada columna", i="Une con una línea (o escribe el número) lo que Dios hace con lo que tú puedes hacer.",
         pairs=[("Dios ama", "Yo puedo amar a otros"), ("Dios piensa", "Yo puedo pensar"), ("Dios crea", "Yo puedo dibujar y crear"), ("Dios cuida", "Yo puedo cuidar a otros")]),
    dict(k="mc", t="Marca la respuesta correcta", p="Ser imagen de Dios significa que soy:",
         opts=[("a", "Igual a Dios en poder"), ("b", "Parecido a Dios, sin ser Dios"), ("c", "Un animal más")]),
    dict(k="draw", t="Dibújate frente a un espejo", i="Recuerda: llevas la imagen de Dios.", h=0.55)])
build(3, "Dios me conoce", [
    dict(k="fill", t="Completa la frase", i="Usa el banco de palabras.", bank=["naciera", "cuidado", "pensamientos"],
         lines=["Dios me conoce desde antes de que yo ______________.", "Dios formó mis entrañas con ______________.", "Dios conoce mis ______________ antes de que los diga."]),
    dict(k="write", t="Escribe 3 cosas que te gustan", i="Dios ya las sabía, aun antes de que las dijeras.", n=3),
    dict(k="tf", t="Marca V (Verdadero) o F (Falso)", items=["Dios solo conoce a los adultos.", "El Salmo 139 fue escrito por el rey David.", "Dios me conoce con cuidado y cercanía."]),
    dict(k="match", t="Relaciona cada palabra con su significado", pairs=[("Formidable", "Algo asombroso y admirable"), ("Entretejer", "Formar con cuidado, como hilos")])])
build(4, "Mi vida tiene valor", [
    dict(k="fill", t="Completa la frase", i="Usa el banco de palabras.", bank=["creó", "conoce", "pajarillos"],
         lines=["Tengo valor porque Dios me ______________ y me ______________.", "Jesús dijo que valgo más que muchos ______________."]),
    dict(k="tf", t="Marca V (Verdadero) o F (Falso)", items=["Mi valor depende de mis calificaciones.", "Jesús enseñó que valemos más que los pajarillos.", "Mi valor viene de que Dios me creó."]),
    dict(k="write", t="¿Qué le dirías a un amigo que siente que 'no vale nada'?", n=3),
    dict(k="match", t="Repaso del Módulo 1 — relaciona cada semana con su verdad",
         pairs=[("Semana 1", "Dios me creó"), ("Semana 2", "Llevo la imagen de Dios"), ("Semana 3", "Dios me conoce"), ("Semana 4", "Tengo valor")])])
