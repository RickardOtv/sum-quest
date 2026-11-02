"""Builds the app icons in public/icons/ from the hero sprite (run: python3 scripts/make_icons.py)."""
from PIL import Image, ImageDraw

HERO = Image.open('src/game/art/adventurer/attack1_right.png').crop((2 * 96 + 41, 26, 2 * 96 + 84, 58))  # mid-swing frame

# 5x5 pixel glyphs for the four operations
GLYPH = {
    '+': ["..#..", "..#..", "#####", "..#..", "..#.."],
    '-': [".....", ".....", "#####", ".....", "....."],
    'x': ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
    '/': ["..#..", ".....", "#####", ".....", "..#.."],
}

def glyph(d, ch, x, y, s, col):
    for r, row in enumerate(GLYPH[ch]):
        for c, v in enumerate(row):
            if v == '#': d.rectangle((x + c * s, y + r * s, x + c * s + s - 1, y + r * s + s - 1), fill=col)

def icon(size, pad):
    """Square icon; `pad` = empty share around the art (iOS/Android round the corners themselves)."""
    n = 512
    im = Image.new('RGBA', (n, n))
    d = ImageDraw.Draw(im)
    for y in range(n):  # night-sky gradient, the game's own colours
        t = y / n
        d.line((0, y, n, y), fill=(int(0x2a + (0x0d - 0x2a) * t), int(0x22 + (0x0b - 0x22) * t), int(0x3c + (0x12 - 0x3c) * t)))
    k = 1 - 2 * pad
    d.ellipse((n / 2 - 170 * k, n * 0.5 + 120 * k, n / 2 + 170 * k, n * 0.5 + 180 * k), fill=(0x4f, 0x6a, 0x35))  # a patch of grass
    d.ellipse((n / 2 - 140 * k, n * 0.5 + 128 * k, n / 2 + 140 * k, n * 0.5 + 170 * k), fill=(0x6f, 0x8c, 0x48))
    s = max(1, round(8 * k))
    hero = HERO.resize((HERO.width * s, HERO.height * s), Image.NEAREST)
    im.alpha_composite(hero, (int(n / 2 - hero.width / 2 + 10 * k), int(n * 0.5 + 150 * k - hero.height)))
    gs = max(2, round(11 * k)); gold = (0xf2, 0xc9, 0x4c)
    glyph(d, 'x', int(n / 2 - 2.5 * gs - 120 * k), int(n * 0.5 - 175 * k), gs, gold)
    glyph(d, '+', int(n / 2 - 2.5 * gs + 120 * k), int(n * 0.5 - 175 * k), gs, (0xec, 0xdc, 0xbc))
    return im.resize((size, size), Image.LANCZOS if size < n else Image.NEAREST).convert('RGB')

icon(512, 0.06).save('public/icons/icon-512.png')
icon(192, 0.06).save('public/icons/icon-192.png')
icon(180, 0.06).save('public/icons/apple-touch-icon.png')
icon(512, 0.16).save('public/icons/maskable-512.png')  # Android crops these to a circle
icon(64, 0.02).save('public/icons/favicon-64.png')
