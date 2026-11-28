#!/usr/bin/env python3
"""Renders the 별이 비서실 app icons: a 36-dot pixel ㅂ face with a gold sparkle.

Design: planned by ChatGPT, reviewed by Claude, art direction by Gemini
(icon-option-1-pixel -> 3사 심플 픽셀 아이콘). Kept on one strict 36x36 logical
grid so it stays crisp at 36px, 180px and 512px.

Outputs (run from the repo root):
  icon.svg              36x36 vector, used by the header logo and the favicon
  icon-192.png          PWA / Android
  icon-512.png          large / store
  apple-touch-icon.png  iOS home screen (opaque, iOS masks the corners itself)
  assets/app-icon.png   512 master copy
"""
from PIL import Image, ImageDraw

N = 36
BG = (220, 233, 242)
BLUE = (77, 147, 209)
NAVY = (36, 59, 89)
GOLD = (244, 201, 93)
COLORS = {0: BG, 1: BLUE, 2: NAVY, 3: GOLD}
HEX = {0: "#DCEAF5", 1: "#4A91D4", 2: "#243B59", 3: "#F4C95D"}

BX0, BY0, BX1, BY1 = 3, 7, 32, 31      # body block
TOWER = 10                              # width of each vertical stroke
NOTCH = 10                              # top opening between the strokes
DEPTH = 9                               # how deep the opening runs down
EYE, EYE_GAP = 3, 12
STAR = ["..#..", ".###.", "#####", ".###.", "..#.."]
STAR_XY = (27, 1)


def mask():
    m = [[False] * N for _ in range(N)]
    for y in range(BY0, BY1 + 1):
        for x in range(BX0, BX1 + 1):
            m[y][x] = True
    for y in range(BY0, BY0 + DEPTH):
        for x in range(BX0 + TOWER, BX1 - TOWER + 1):
            m[y][x] = False
    # two-step rounded outer corners
    for cx, cy, sx, sy in [(BX0, BY0, 1, 1), (BX1, BY0, -1, 1),
                           (BX0, BY1, 1, -1), (BX1, BY1, -1, -1)]:
        m[cy][cx] = False
        m[cy][cx + sx] = False
        m[cy + sy][cx] = False
    return m


def grid():
    m = mask()
    g = [[0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            if not m[y][x]:
                continue
            edge = any(
                not (0 <= y + dy < N and 0 <= x + dx < N) or not m[y + dy][x + dx]
                for dy in (-1, 0, 1) for dx in (-1, 0, 1)
            )
            g[y][x] = 2 if edge else 1

    top = BY0 + DEPTH + 3
    ey = top + (BY1 - 1 - top) // 2 - EYE // 2 + 1
    c = 17.5                       # centre of the 36-dot canvas
    d = EYE_GAP / 2
    ex_l = int(c - d - (EYE - 1) / 2)
    ex_r = (N - 1) - (ex_l + EYE - 1)     # mirror of the left eye
    for y in range(ey, ey + EYE):
        for x in range(ex_l, ex_l + EYE):
            g[y][x] = 2
        for x in range(ex_r, ex_r + EYE):
            g[y][x] = 2

    for dy, row in enumerate(STAR):
        for dx, ch in enumerate(row):
            if ch == "#":
                g[STAR_XY[1] + dy][STAR_XY[0] + dx] = 3
    return g


def png(g, size):
    img = Image.new("RGB", (N, N))
    img.putdata([COLORS[v] for row in g for v in row])
    if size % N == 0:
        return img.resize((size, size), Image.NEAREST)
    # non-multiple size: upscale by the largest integer factor, then centre on a flat bg
    k = size // N
    big = img.resize((N * k, N * k), Image.NEAREST)
    out = Image.new("RGB", (size, size), BG)
    out.paste(big, ((size - N * k) // 2, (size - N * k) // 2))
    return out


def svg(g):
    parts = []
    for color, name in ((0, "bg"), (1, "body"), (2, "ink"), (3, "star")):
        rects = []
        for y in range(N):
            x = 0
            while x < N:
                if g[y][x] != color:
                    x += 1
                    continue
                x0 = x
                while x < N and g[y][x] == color:
                    x += 1
                rects.append(f"M{x0} {y}h{x - x0}v1h-{x - x0}z")
        if rects:
            parts.append(f'  <path class="{name}" d="{"".join(rects)}"/>')
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" '
        'width="36" height="36" shape-rendering="crispEdges" role="img" '
        'aria-label="별이 비서실">\n'
        "  <style>\n"
        f"    .bg{{fill:{HEX[0]}}}.body{{fill:{HEX[1]}}}.ink{{fill:{HEX[2]}}}.star{{fill:{HEX[3]}}}\n"
        "  </style>\n"
        + "\n".join(parts)
        + "\n</svg>\n"
    )


if __name__ == "__main__":
    g = grid()
    print("\n".join("".join(".#@*"[v] for v in row) for row in g))
    open("icon.svg", "w").write(svg(g))
    png(g, 180).save("apple-touch-icon.png")
    png(g, 192).save("icon-192.png")
    png(g, 512).save("icon-512.png")
    png(g, 512).save("assets/app-icon.png")
    print("icons written")
