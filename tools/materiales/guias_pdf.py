"""Guía del Maestro en PDF (23 apartados), generada desde los mismos datos que la pantalla."""
import os, json
from xml.sax.saxutils import escape
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle, ListFlowable, ListItem, KeepTogether, Image
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
import common as C

D = "/usr/share/fonts/truetype/dejavu/"
for n, f in [("DV", "DejaVuSans"), ("DV-B", "DejaVuSans-Bold"), ("DV-I", "DejaVuSans-Oblique"), ("DVS", "DejaVuSerif"), ("DVS-B", "DejaVuSerif-Bold"), ("DVS-I", "DejaVuSerif-Italic")]:
    pdfmetrics.registerFont(TTFont(n, D + f + ".ttf"))
registerFontFamily("DV", normal="DV", bold="DV-B", italic="DV-I", boldItalic="DV-B")
NAVY = colors.HexColor("#12304D"); GOLD = colors.HexColor("#B9832A"); GOLD_BG = colors.HexColor("#FAF1DE"); INK = colors.HexColor("#1B1B1B"); GREY = colors.HexColor("#555555")
body = ParagraphStyle("b", fontName="DV", fontSize=9.6, leading=13.4, textColor=INK, spaceAfter=4)
h3 = ParagraphStyle("h3", parent=body, fontName="DV-B", fontSize=9.2, textColor=NAVY, spaceBefore=6, spaceAfter=2)
sec = ParagraphStyle("s", parent=body, fontName="DV-B", fontSize=11.5, textColor=NAVY, spaceBefore=10, spaceAfter=4)
quote = ParagraphStyle("q", parent=body, fontName="DVS-I", fontSize=10.8, leading=15)
cite = ParagraphStyle("c", parent=body, fontName="DV-B", fontSize=8, textColor=GOLD)
note = ParagraphStyle("n", parent=body, fontSize=8.8, leading=12, textColor=GREY)
ttl = ParagraphStyle("t", parent=body, fontName="DVS-B", fontSize=19, leading=23, textColor=NAVY, spaceAfter=2)
brand = ParagraphStyle("br", parent=body, fontSize=7.8, textColor=GREY, spaceAfter=2)
P = lambda t, st=body: Paragraph(escape(t), st)
lst = lambda items, o: ListFlowable([ListItem(P(i), leftIndent=14) for i in items], bulletType="1" if o else "bullet", start=1 if o else "•", leftIndent=16, bulletFontName="DV", bulletFontSize=9)


def block(b):
    t = b["t"]
    if t == "p": return [P(b["text"])]
    if t == "h": return [P(b["text"], h3)]
    if t in ("ul", "ol"): return [lst(b["items"], t == "ol"), Spacer(1, 3)]
    if t == "kv":
        tb = Table([[P(k, ParagraphStyle("k", parent=body, fontName="DV-B")), P(v)] for k, v in b["pairs"]], colWidths=[1.0*inch, 5.9*inch])
        tb.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("BOTTOMPADDING", (0, 0), (-1, -1), 2), ("TOPPADDING", (0, 0), (-1, -1), 2)])); return [tb, Spacer(1, 3)]
    if t == "quote":
        inner = [P("“" + b["text"] + "”", quote)] + ([P(b["cite"], cite)] if b.get("cite") else [])
        tb = Table([[inner]], colWidths=[6.9*inch]); tb.setStyle(TableStyle([("LINEBEFORE", (0, 0), (0, -1), 2.5, GOLD), ("BACKGROUND", (0, 0), (-1, -1), GOLD_BG), ("LEFTPADDING", (0, 0), (-1, -1), 10), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)])); return [tb, Spacer(1, 4)]
    if t == "note":
        tb = Table([[P(b["text"], note)]], colWidths=[6.9*inch]); tb.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CCCCCC")), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7F7F7")), ("LEFTPADDING", (0, 0), (-1, -1), 7), ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)])); return [tb, Spacer(1, 4)]
    if t == "links": return [lst(["Recurso: " + l["label"] for l in b["links"]], False)]
    return []


R = 200 / 300
for g in json.load(open(os.path.join(C.OUT, "datos.json"))):
    out = os.path.join(C.OUT, f"guia-semana-{g['week']}.pdf")
    def foot(c, doc, g=g):
        c.saveState(); c.setFont("DV", 7.5); c.setFillColor(GREY)
        c.drawString(0.75*inch, 0.45*inch, f"CIMIENTO — Construyendo vidas sobre Cristo. · Semana {g['week']}: {g['title']}"); c.drawRightString(LETTER[0] - 0.75*inch, 0.45*inch, f"Página {doc.page}"); c.restoreState()
    doc = BaseDocTemplate(out, pagesize=LETTER, leftMargin=0.8*inch, rightMargin=0.8*inch, topMargin=0.7*inch, bottomMargin=0.8*inch, title=f"Guía del Maestro — Semana {g['week']}: {g['title']}", author="CIMIENTO")
    doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height)], onPage=foot)])
    ch = 0.9 * inch
    head = Table([[Image(C.logo_cimiento(), width=1.25*inch, height=0.83*inch), Image(C.logo_ieoh(), width=0.42*inch, height=0.69*inch), "",
                   Image(C.character("nina", "wave"), width=ch*R, height=ch), Image(C.character("nino", "cheer"), width=ch*R, height=ch)]],
                 colWidths=[1.35*inch, 0.55*inch, 3.2*inch, 0.75*inch, 0.75*inch])
    head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "BOTTOM"), ("LEFTPADDING", (0, 0), (-1, -1), 0)]))
    story = [head, Spacer(1, 6), P(f"CIMIENTO · GUÍA DEL MAESTRO · PLAN ANUAL · MÓDULO {g['module']} — {g['moduleTitle'].upper()}", brand), P(f"Semana {g['week']} — {g['title']}", ttl),
             P(f"«{g['phrase']}»", ParagraphStyle("ph", parent=body, fontName="DVS-I", textColor=GREY))]
    rule = Table([[""]], colWidths=[6.9*inch], rowHeights=[2]); rule.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 1.5, NAVY)])); story += [rule, Spacer(1, 4)]
    for s in g["sections"]:
        hp = Paragraph(f'<font color="#B9832A">{s["number"]:02d}</font>&nbsp;&nbsp;{escape(s["title"])}', sec)
        bl = [x for b in s["blocks"] for x in block(b)]
        story.append(KeepTogether([hp, bl[0]] if bl else [hp])); story += bl[1:]
    doc.build(story); print(os.path.basename(out))
