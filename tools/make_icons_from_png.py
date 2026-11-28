#!/usr/bin/env python3
"""별이 비서실 앱 아이콘을 GPT 시안 PNG에서 뽑는다.

원본 시안(tools/icon-source-gpt.png, 1254x1254)은 모서리가 둥근 카드 위에
젤리 캐릭터가 그려져 있고, 카드 바깥 네 모서리는 흰색으로 남아 있다.
앱 아이콘은 정사각형 꽉 찬 그림이어야 하므로(안드로이드·iOS 모두 모서리를
스스로 깎는다) 흰 모서리 자리를 카드 안쪽 하늘색으로 이어 채운 뒤,
그 정사각 마스터에서 필요한 크기를 줄여 낸다.

사용법 (저장소 루트에서):
  python3 tools/make_icons_from_png.py [원본.png]

결과:
  assets/app-icon.png   512x512  헤더 로고·아이콘 기준본
  icon-192.png          192x192  PWA / 안드로이드
  icon-512.png          512x512  큰 아이콘
  apple-touch-icon.png  180x180  iOS 홈 화면 (불투명 RGB)
"""
import sys

import numpy as np
from PIL import Image

WHITE = 245          # 이보다 밝으면 카드 바깥 흰 여백으로 본다
EDGE_SKIP = 8        # 모서리 안티에일리어싱 띠를 건너뛰고 단단한 색을 집는 거리


def square_master(img: Image.Image) -> Image.Image:
    """둥근 카드 바깥의 흰 네 모서리를 행마다 카드 안쪽 색으로 이어 채운다."""
    a = np.asarray(img.convert("RGB")).astype(np.uint8).copy()
    h, w, _ = a.shape
    light = a.min(axis=2) > WHITE
    for y in range(h):
        row = light[y]
        if row.all():
            continue
        xs = np.flatnonzero(~row)
        first, last = int(xs[0]), int(xs[-1])
        if first > 0:
            a[y, : first + EDGE_SKIP] = a[y, min(first + EDGE_SKIP, last)]
        if last < w - 1:
            a[y, max(last - EDGE_SKIP, first) :] = a[y, max(last - EDGE_SKIP, first)]
    return Image.fromarray(a, "RGB")


def main() -> None:
    src = sys.argv[1] if len(sys.argv) > 1 else "tools/icon-source-gpt.png"
    master = square_master(Image.open(src))
    master.resize((512, 512), Image.LANCZOS).save("assets/app-icon.png")
    master.resize((512, 512), Image.LANCZOS).save("icon-512.png")
    master.resize((192, 192), Image.LANCZOS).save("icon-192.png")
    master.resize((180, 180), Image.LANCZOS).convert("RGB").save("apple-touch-icon.png")
    print("icons written from", src)


if __name__ == "__main__":
    main()
