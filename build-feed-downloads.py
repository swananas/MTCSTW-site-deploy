#!/usr/bin/env python3
"""build-feed-downloads.py — PFN-stamped download copies of the UGC feed bank.

Pipeline step (sibling of build-portfolios.py). For every JPEG in
site/feed-media/ it writes a download twin to site/feed-media-dl/ carrying:

  1. A visible watermark: the letters "PFN", centered in the photo,
     translucent white (~30% alpha) over a soft dark shadow copy (~18%
     alpha), text width ~14% of image width. (CEO order 2026-10-24:
     downloads of the CEO's UGC carry the mark; display images stay clean.)
  2. The network metadata tracking stamp (adapted from the 2026-09-26
     Poster Forge tEXt scheme): EXIF fields in IFD0 plus a JPEG COM
     segment (marker FFFE) spliced immediately after SOI carrying the
     full plain-text stamp, per-item Title/Item from the feed bundle.

The display bank (site/feed-media/) and the feed bundle are read-only
inputs — this script never writes to them. Zero backend, zero D1: the
tracking lives inside the files.

Rerunnable: outputs are regenerated wholesale from the sources.

Font: Anton (brand display face, OFL) at tools/fonts/Anton-Regular.ttf —
build-only, fetched from the official google/fonts GitHub raw URL when
missing; fallback is DejaVu Sans Bold. The font is never served from site/.
"""
import io
import json
import os
import struct
import sys
import urllib.request

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, 'site', 'feed-media')
OUT_DIR = os.path.join(ROOT, 'site', 'feed-media-dl')
BUNDLE = os.path.join(ROOT, 'site', 'feed', 'ugc-feed.json')
FONT_PATH = os.path.join(ROOT, 'tools', 'fonts', 'Anton-Regular.ttf')
FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf'
FALLBACK_FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

AUTHOR = 'Propaganda Factory Network'
COPYRIGHT = 'Copyright 2026 Propaganda Factory Network. Property of the working class.'
DESCRIPTION = 'Seize the memes of production. Forged at mtcstw.com - workers of the feed, unite.'
COMMENT = 'EAT THE RICH - solidarity forever.'
SOURCE = 'https://www.mtcstw.com'
SOFTWARE = 'PFN UGC Distribution'
BANK_LINE = 'UGC Feed Bank (site/feed-media)'
PAGE_LINE = 'https://www.mtcstw.com/'

JPEG_QUALITY = 88
WATERMARK_TEXT = 'PFN'
WATERMARK_WIDTH_FRACTION = 0.14   # text width as a fraction of image width
WATERMARK_FILL = (255, 255, 255, 77)    # white, ~30% alpha
WATERMARK_SHADOW = (0, 0, 0, 46)        # black, ~18% alpha


def resolve_font():
    """Return (path, label). Fetch Anton into tools/fonts/ if absent."""
    if not os.path.exists(FONT_PATH):
        try:
            os.makedirs(os.path.dirname(FONT_PATH), exist_ok=True)
            urllib.request.urlretrieve(FONT_URL, FONT_PATH)
            print('font: fetched Anton from %s' % FONT_URL)
        except Exception as e:
            print('font: Anton fetch failed (%s); will fall back' % e)
    if os.path.exists(FONT_PATH):
        return FONT_PATH, 'Anton (tools/fonts/Anton-Regular.ttf)'
    if os.path.exists(FALLBACK_FONT):
        return FALLBACK_FONT, 'DejaVu Sans Bold (fallback)'
    raise SystemExit('FATAL: no usable font (Anton missing, no DejaVu fallback)')


def load_cards():
    """filename -> (card id, headline) from the feed bundle."""
    with open(BUNDLE, encoding='utf-8') as f:
        bundle = json.load(f)
    cards = {}
    for c in bundle.get('cards', []):
        img = c.get('image') or ''
        if '/feed-media/' in img:
            cards[os.path.basename(img)] = (c.get('id') or '', c.get('headline') or '')
    return cards


def scaled_font(font_path, image_width):
    """Font sized so 'PFN' spans ~WATERMARK_WIDTH_FRACTION of the width."""
    probe_size = 200
    probe = ImageFont.truetype(font_path, probe_size)
    w = probe.getlength(WATERMARK_TEXT)
    if w <= 0:
        raise ValueError('font measures zero-width watermark text')
    size = int(round(probe_size * (WATERMARK_WIDTH_FRACTION * image_width) / w))
    return ImageFont.truetype(font_path, max(8, size))


def watermark(base_rgb, font_path):
    w, h = base_rgb.size
    font = scaled_font(font_path, w)
    overlay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = w // 2, h // 2
    shadow_off = max(2, round(font.size * 0.02))
    d.text((cx + shadow_off, cy + shadow_off), WATERMARK_TEXT,
           font=font, fill=WATERMARK_SHADOW, anchor='mm')
    d.text((cx, cy), WATERMARK_TEXT,
           font=font, fill=WATERMARK_FILL, anchor='mm')
    return Image.alpha_composite(base_rgb.convert('RGBA'), overlay).convert('RGB')


def build_exif(title):
    ex = Image.Exif()
    ex[270] = title.encode('utf-8')        # ImageDescription = Title
    ex[315] = AUTHOR                       # Artist = Author
    ex[33432] = COPYRIGHT                  # Copyright
    ex[305] = SOFTWARE                     # Software
    ex[40092] = COMMENT.encode('utf-16-le')  # XPComment (UCS-2 per XP convention)
    return ex.tobytes()


def com_payload(title, item):
    lines = [
        'PFN-TRACKING',
        'Title: %s' % title,
        'Author: %s' % AUTHOR,
        'Description: %s' % DESCRIPTION,
        'Copyright: %s' % COPYRIGHT,
        'Software: %s' % SOFTWARE,
        'Source: %s' % SOURCE,
        'Comment: %s' % COMMENT,
        'Item: %s' % item,
        'Bank: %s' % BANK_LINE,
        'Page: %s' % PAGE_LINE,
    ]
    return ('\n'.join(lines)).encode('utf-8')


def splice_com(jpeg_bytes, payload):
    """Insert a COM segment (FFFE) immediately after SOI (FFD8)."""
    if jpeg_bytes[:2] != b'\xff\xd8':
        raise ValueError('not a JPEG (no SOI)')
    if len(payload) + 2 > 0xFFFF:
        raise ValueError('COM payload too large')
    seg = b'\xff\xfe' + struct.pack('>H', len(payload) + 2) + payload
    return jpeg_bytes[:2] + seg + jpeg_bytes[2:]


def main():
    font_path, font_label = resolve_font()
    print('font in use: %s' % font_label)
    cards = load_cards()
    print('bundle cards mapped by filename: %d' % len(cards))

    os.makedirs(OUT_DIR, exist_ok=True)
    srcs = sorted(f for f in os.listdir(SRC_DIR) if f.lower().endswith('.jpg'))
    print('source JPEGs: %d' % len(srcs))

    written, failures, total_bytes, unmatched = 0, [], 0, []
    for name in srcs:
        src_path = os.path.join(SRC_DIR, name)
        out_path = os.path.join(OUT_DIR, name)
        stem = os.path.splitext(name)[0]
        card_id, headline = cards.get(name, ('', ''))
        item = card_id if card_id else stem
        title = headline if headline else 'PFN Agitprop \u2014 %s' % stem
        if not card_id:
            unmatched.append(name)
        try:
            with Image.open(src_path) as im:
                base = im.convert('RGB')
            marked = watermark(base, font_path)
            buf = io.BytesIO()
            marked.save(buf, 'JPEG', quality=JPEG_QUALITY, exif=build_exif(title))
            data = splice_com(buf.getvalue(), com_payload(title, item))
            with open(out_path, 'wb') as f:
                f.write(data)
            written += 1
            total_bytes += len(data)
        except Exception as e:
            failures.append('%s: %s' % (name, e))

    print('---')
    print('written: %d files to %s' % (written, OUT_DIR))
    print('total download-bank bytes: %d (%.1f MB)' % (total_bytes, total_bytes / 1e6))
    if unmatched:
        print('no bundle card matched (fallback title/item used): %d -> %s'
              % (len(unmatched), ', '.join(unmatched[:10])))
    if failures:
        print('FAILURES (%d):' % len(failures))
        for f in failures:
            print('  !! %s' % f)
        return 1
    print('failures: 0')
    return 0


if __name__ == '__main__':
    sys.exit(main())
