#!/usr/bin/env python3
"""Génère docs/KAMISSA_Logo.svg — emblème piste A + mot-symbole Baloo 2 800
tracé + devise Lexend 500 tracée. Les glyphes sont convertis en chemins pour
un rendu identique sans dépendre de la fonte installée."""
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[2]  # racine du projet (tools/logo/ → kamissa/)

def load(path, wght):
    f = TTFont(path)
    instantiateVariableFont(f, {"wght": wght})
    return f

def layout(font, text, tracking_units=0):
    """Retourne [(char, path_d, x_offset)], largeur_totale (unités fonte)."""
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font["hmtx"]
    items, x = [], 0
    for ch in text:
        gname = cmap.get(ord(ch))
        if gname is None:
            raise SystemExit(f"glyph manquant: {ch!r} (U+{ord(ch):04X})")
        pen = SVGPathPen(gs)
        gs[gname].draw(pen)
        items.append((ch, pen.getCommands(), x))
        x += hmtx[gname][0] + tracking_units
    return items, x - tracking_units

def emit(items, width_units, size_px, upm, cx, baseline, fill, accent=None):
    """Groupe SVG : glyphes tracés, centrés sur cx, ligne de base à baseline."""
    s = size_px / upm
    x0 = cx - (width_units * s) / 2
    lines = [f'<g transform="translate({x0:.3f},{baseline}) scale({s:.6f},{-s:.6f})">']
    for ch, d, x in items:
        if not d:  # espace
            continue
        f = accent if accent and ch in accent[0] else fill
        lines.append(f'<path transform="translate({x},0)" d="{d}" fill="{f}"/>')
    lines.append('</g>')
    return "\n".join(lines)

# --- mot-symbole : Baloo 2 ExtraBold, corps 52 px, chasse 0,5 px ---
baloo = load(f"{ROOT}/public/fonts/baloo2-latin.woff2", 800)
upm_b = baloo["head"].unitsPerEm
track_b = round(0.5 / 52 * upm_b)  # letter-spacing 0,5 px à 52 px
wm, wm_w = layout(baloo, "kamissa", track_b)

# --- devise : Lexend 500, capitales, corps 12,5 px, chasse 2,2 px ---
lexend = load(f"{ROOT}/public/fonts/lexend-latin.woff2", 500)
upm_l = lexend["head"].unitsPerEm
tag = "L’ÉCOLE DANS LA POCHE"
track_l = round(2.2 / 12.5 * upm_l)
tg, tg_w = layout(lexend, tag, track_l)

EMBLEM = """<g transform="translate(116,10)">
<rect width="128" height="128" rx="30" fill="#2E3D96"/>
<path d="M24 80 C38 70 52 70 64 80 C76 70 90 70 104 80 L104 93 C90 83 76 83 64 93 C52 83 38 83 24 93 Z" fill="#FDF8EF"/>
<path d="M64 80 L64 64" stroke="#1FA05C" stroke-width="7" stroke-linecap="round" fill="none"/>
<path d="M64 66 C62 55 56 48 44 45 C45 57 52 65 64 66 Z M64 66 C66 55 72 48 84 45 C83 57 76 65 64 66 Z" fill="#1FA05C"/>
<circle cx="64" cy="41" r="11" fill="#FFB81C"/>
<path d="M78 30 a13 13 0 0 1 8 10" stroke="#E8482B" stroke-width="6.5" stroke-linecap="round" fill="none"/>
<path d="M85 21 a21 21 0 0 1 13 17" stroke="#E8482B" stroke-width="6.5" stroke-linecap="round" fill="none"/>
</g>"""

wordmark = emit(wm, wm_w, 52, upm_b, cx=180, baseline=196, fill="#2E3D96", accent=({"i"}, "#E8482B"))
tagline = emit(tg, tg_w, 12.5, upm_l, cx=180, baseline=226, fill="#6B6053")

svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 244">
<!-- KAMISSA — logo vertical (charte 2026, piste A). Emblème : livre, pousse de
     manguier, mangue-soleil, ondes de la voix. Mot-symbole Baloo 2 ExtraBold et
     devise Lexend 500 convertis en tracés — ne pas éditer le texte, régénérer
     via tools/logo/trace_logo.py. -->
{EMBLEM}
{wordmark}
{tagline}
</svg>
"""

with open(f"{ROOT}/docs/KAMISSA_Logo.svg", "w") as fh:
    fh.write(svg)
print(f"ok — mot-symbole {wm_w} unités (upm {upm_b}), devise {tg_w} unités (upm {upm_l})")
