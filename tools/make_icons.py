#!/usr/bin/env python3
"""Renders the 별이 비서실 app icons (same geometry as icon.svg, 512 grid)."""
from PIL import Image, ImageDraw

S = 512


def lerp(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def make(size, rounded):
    k = size / S
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    top, bottom = (0x8B, 0xA7, 0xFF), (0x5B, 0x7B, 0xF0)
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=int(112 * k), fill=255)
    else:
        mask = Image.new("L", (size, size), 255)

    grad = Image.new("RGBA", (1, size))
    gd = ImageDraw.Draw(grad)
    for y in range(size):
        gd.point((0, y), lerp(top, bottom, y / max(1, size - 1)))
    grad = grad.resize((size, size))
    img.paste(grad, (0, 0), mask)
    d = ImageDraw.Draw(img)

    # soft highlight at the top
    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.ellipse([int(26 * k), int(-94 * k), int(486 * k), int(146 * k)],
               fill=(255, 255, 255, 36))
    img.alpha_composite(Image.composite(hi, Image.new("RGBA", (size, size), (0, 0, 0, 0)), mask))

    d = ImageDraw.Draw(img)
    bars = [
        (146, 136, 194, 376),   # left stroke
        (318, 136, 366, 376),   # right stroke
        (146, 136, 366, 184),   # top bar
        (146, 232, 366, 280),   # middle bar
        (146, 328, 366, 376),   # bottom bar
    ]
    for x0, y0, x1, y1 in bars:
        d.rounded_rectangle(
            [x0 * k, y0 * k, x1 * k, y1 * k],
            radius=24 * k, fill=(255, 255, 255, 255))

    star = [(430, 60), (438, 84), (462, 92), (438, 100),
            (430, 124), (422, 100), (398, 92), (422, 84)]
    d.polygon([(x * k, y * k) for x, y in star], fill=(0xFF, 0xE0, 0x7A, 255))
    return img


make(512, True).resize((192, 192), Image.LANCZOS).save("icon-192.png")
make(512, True).save("icon-512.png")
# iOS masks the corners itself: keep the touch icon fully opaque, edge to edge.
make(180, False).convert("RGB").save("apple-touch-icon.png", quality=95)
print("icons written")
