#!/usr/bin/env python3
"""Builds the game's two self-hosted fonts (Playgama's checklist: nothing loaded from outside but the Bridge).

  assets/fonts/vt323.woff2        VT323, the type for Latin text: ASCII, Latin-1 and Latin Extended-A (es, pt) and punctuation
  assets/fonts/dotgothic16.woff2  DotGothic16 for Japanese, cut down to the characters the game's texts use, and ASCII

Run it again whenever a Japanese text changes: it reads the characters from src/*.js and index.html.
Both fonts are SIL OFL 1.1 (their licences are copied next to them). The full fonts are kept in assets/_raw/fonts
(not in git), downloaded from the Google Fonts repository the first time.
Needs fontTools and brotli (pip install fonttools brotli).
Usage: python3 tools/fonts.py
"""
import os, re, shutil, sys, urllib.request
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW, OUT = os.path.join(ROOT, 'assets/_raw/fonts'), os.path.join(ROOT, 'assets/fonts')
REPO = 'https://github.com/google/fonts/raw/main/ofl/'
FONTS = {   # name: (repo folder, file)
    'vt323': ('vt323', 'VT323-Regular.ttf'),
    'dotgothic16': ('dotgothic16', 'DotGothic16-Regular.ttf'),
}
JA = re.compile('[　-ヿ㐀-鿿＀-￯]')   # kana, CJK punctuation and ideographs, full-width forms


def fetch(name):
    folder, file = FONTS[name]
    os.makedirs(RAW, exist_ok=True)
    for f, local in ((file, f'{name}-{file}'), ('OFL.txt', f'{name}-OFL.txt')):
        path = os.path.join(RAW, local)
        if not os.path.exists(path):
            print('downloading', REPO + folder + '/' + f)
            urllib.request.urlretrieve(REPO + folder + '/' + f, path)
    return os.path.join(RAW, f'{name}-{file}'), os.path.join(RAW, f'{name}-OFL.txt')


def cut(src, dst, unicodes):
    opts = subset.Options()
    opts.flavor, opts.layout_features, opts.name_IDs, opts.notdef_outline = 'woff2', ['*'], ['*'], True
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=unicodes)
    sub.subset(font)
    subset.save_font(font, dst, opts)


def main():
    os.makedirs(OUT, exist_ok=True)
    text = ''.join(open(os.path.join(ROOT, p), encoding='utf-8').read() for p in ('src/game.js', 'src/world.js', 'index.html'))
    ja = sorted(set(JA.findall(text)) | set('・ー、。！？「」'))
    for name, uni in (('vt323', list(range(0x20, 0x7f)) + list(range(0xa0, 0x180)) + list(range(0x2010, 0x2060)) + [0x20ac]),
                      ('dotgothic16', [ord(c) for c in ja] + list(range(0x20, 0x7f)) + [0xb7, 0xd7])):   # its Latin and digits too: in the Japanese game they stand by kana
        src, lic = fetch(name)
        have = TTFont(src).getBestCmap()
        missing = [chr(u) for u in uni if u not in have and (name != 'vt323')]
        if missing: print(f'{name}: no glyph for', ''.join(missing), file=sys.stderr)
        dst = os.path.join(OUT, name + '.woff2')
        cut(src, dst, [u for u in uni if u in have])
        shutil.copy(lic, os.path.join(OUT, name + '-OFL.txt'))
        print(f'{dst}: {os.path.getsize(dst)} bytes, {sum(1 for u in uni if u in have)} characters')


if __name__ == '__main__':
    main()
