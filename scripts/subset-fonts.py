#!/usr/bin/env python3
"""Rebuild the small WOFF2 fonts in src/fonts/subset from the originals in src/fonts.

The site only needs the characters its catalogue and interface actually use, plus the letters
most European names need. Full Latin-1 stays, so French, German, Spanish or Portuguese names in
a future story still render; Latin Extended-A is trimmed to the characters in use plus the common
Central European ones. Cyrillic is trimmed to the names currently in the catalogue.

Run after adding stories or credits with characters the fonts don't have yet:

    pip install fonttools brotli
    python3 scripts/subset-fonts.py

The generated files are committed; the site build itself doesn't need Python.
"""
from pathlib import Path
import subprocess
import sys
import tempfile

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "src" / "fonts"
OUT = FONTS / "subset"
SOURCES = [
    "catalog/stories.json", "catalog/versions.json", "catalog/sources.json",
    "catalog/collections.json", "catalog/wiki.json", "catalog/wiki-manual.json",
    "src/i18n.js", "index.html", "CHANGELOG.md", "CHANGELOG.en.md",
]

# Latin-1 printable, all of it: Western European names keep working.
LATIN = {chr(c) for c in range(0x20, 0x7F)} | {chr(c) for c in range(0xA0, 0x100)} | set("Œœ")
# punctuation, dashes and symbols the interface or summaries use
LATIN |= set("–—‘’‚“”„«»…•·×÷≈€№©®™←→↑↓")
# common Polish, Czech, Slovak, Hungarian, Croatian, Baltic letters
COMMON_EXT = "ĄąĆćĘęŁłŃńŚśŹźŻżČčĎďĚěŇňŘřŠšŤťŮůŽžŐőŰűĀāĒēĪīŌōŪū"
CYRILLIC_EXTRA = "№"


def catalogue_text():
    text = ""
    for name in SOURCES:
        text += (ROOT / name).read_text(encoding="utf-8")
    return text


def files_for(text):
    latin, ext, cyr = set(LATIN), set(COMMON_EXT), set()
    for ch in text:
        cp = ord(ch)
        if cp < 0x100:
            latin.add(ch)
        elif (0x100 <= cp <= 0x17F and cp not in (0x152, 0x153)) or 0x218 <= cp <= 0x21B or 0x1E00 <= cp <= 0x1EFF or 0x2C60 <= cp <= 0x2C7F:
            ext.add(ch)
        elif 0x400 <= cp <= 0x4FF:
            cyr.add(ch)
    cyr |= set(CYRILLIC_EXTRA)
    return {"latin": "".join(sorted(latin)), "ext": "".join(sorted(ext)), "cyr": "".join(sorted(cyr))}


def main():
    text = files_for(catalogue_text())
    OUT.mkdir(parents=True, exist_ok=True)
    before = after = 0
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        for kind, chars in text.items():
            (tmp / (kind + ".txt")).write_text(chars, encoding="utf-8")
        for font in sorted(FONTS.glob("*.woff2")):
            kind = "ext" if "latin-ext" in font.name else "cyr" if "cyrillic" in font.name else "latin"
            target = OUT / font.name
            subprocess.run([
                sys.executable, "-m", "fontTools.subset", str(font),
                "--text-file=" + str(tmp / (kind + ".txt")),
                "--flavor=woff2", "--output-file=" + str(target),
                "--layout-features=*",
            ], check=True)
            before += font.stat().st_size
            after += target.stat().st_size
            missing = []
            try:
                cmap = TTFont(target).getBestCmap() or {}
                missing = [ch for ch in text[kind] if ord(ch) not in cmap]
            except Exception as e:  # a broken subset must not pass silently
                print(f"  {font.name}: cannot read the result: {e}")
            print(f"{font.name:32} {font.stat().st_size:7} -> {target.stat().st_size:7}"
                  + (f"  fallback: {''.join(missing)}" if missing else ""))
    print(f"total {before} -> {after} bytes (-{(before - after) / before * 100:.0f}%)")


if __name__ == "__main__":
    main()
