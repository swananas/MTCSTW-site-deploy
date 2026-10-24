#!/usr/bin/env python3
"""verify-feed-downloads.py — proof pass for the PFN download bank.

Checks, for the build made by build-feed-downloads.py:

  1. Every file in site/feed-media-dl/ opens with PIL and decodes fully.
  2. Its pixel dimensions equal its site/feed-media/ source.
  3. EXIF Artist and Copyright are present and exact (ImageDescription,
     Software, XPComment presence also counted and reported).
  4. The JPEG COM segment parses and contains all stamp fields:
     Title / Author / Description / Copyright / Software / Source /
     Comment / Item.
  5. sha256 manifest of site/feed-media/ is IDENTICAL to the manifest
     captured before the build (display bank untouched).

Usage:
  python3 verify-feed-downloads.py [--before-manifest PATH]
Default --before-manifest: /tmp/feed-media-before.sha256
(a sha256sum-format file: "<hash>  <filename>" per line, basenames).

Exits 0 only if every check passes.
"""
import argparse
import hashlib
import os
import struct
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, 'site', 'feed-media')
OUT_DIR = os.path.join(ROOT, 'site', 'feed-media-dl')

AUTHOR = 'Propaganda Factory Network'
COPYRIGHT = 'Copyright 2026 Propaganda Factory Network. Property of the working class.'
DESCRIPTION = 'Seize the memes of production. Forged at mtcstw.com - workers of the feed, unite.'
COMMENT = 'EAT THE RICH - solidarity forever.'
SOURCE = 'https://www.mtcstw.com'
SOFTWARE = 'PFN UGC Distribution'


def parse_com_payloads(raw):
    """Walk JPEG segments up to SOS; return decoded COM payloads."""
    if raw[:2] != b'\xff\xd8':
        raise ValueError('no SOI')
    payloads = []
    i = 2
    while i < len(raw) - 1:
        if raw[i] != 0xFF:
            raise ValueError('segment walk desync at %d' % i)
        marker = raw[i + 1]
        if marker == 0xDA:  # SOS: entropy data follows
            break
        if marker == 0xD9:  # EOI
            break
        if marker == 0xD8 or 0xD0 <= marker <= 0xD7:  # no length field
            i += 2
            continue
        ln = struct.unpack('>H', raw[i + 2:i + 4])[0]
        if marker == 0xFE:  # COM
            payloads.append(raw[i + 4:i + 2 + ln].decode('utf-8', 'replace'))
        i += 2 + ln
    return payloads


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def load_manifest(path):
    out = {}
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            digest, name = line.split(None, 1)
            out[os.path.basename(name.strip())] = digest
    return out


def xp_decode(v):
    if isinstance(v, bytes):
        try:
            return v.decode('utf-16-le').rstrip('\x00')
        except Exception:
            return ''
    return v or ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--before-manifest', default='/tmp/feed-media-before.sha256')
    args = ap.parse_args()

    srcs = sorted(f for f in os.listdir(SRC_DIR) if f.lower().endswith('.jpg'))
    outs = sorted(f for f in os.listdir(OUT_DIR) if f.lower().endswith('.jpg'))
    print('sources: %d | download copies: %d' % (len(srcs), len(outs)))
    if srcs != outs:
        print('FAIL: filename sets differ (missing=%s extra=%s)'
              % (sorted(set(srcs) - set(outs))[:5], sorted(set(outs) - set(srcs))[:5]))
        return 1

    n_decode = n_dims = n_exif = n_com = 0
    exif_fields = {270: 0, 305: 0, 40092: 0}
    failures = []
    for name in outs:
        try:
            with Image.open(os.path.join(SRC_DIR, name)) as sim:
                src_size = sim.size
            with Image.open(os.path.join(OUT_DIR, name)) as im:
                im.load()  # full decode
                out_size = im.size
                ex = im.getexif()
            n_decode += 1
            if out_size == src_size:
                n_dims += 1
            else:
                failures.append('%s: dims %s != source %s' % (name, out_size, src_size))
            if ex.get(315) == AUTHOR and ex.get(33432) == COPYRIGHT:
                n_exif += 1
            else:
                failures.append('%s: EXIF Artist/Copyright mismatch (%r / %r)'
                                % (name, ex.get(315), ex.get(33432)))
            for t in exif_fields:
                v = ex.get(t)
                if t == 40092:
                    if xp_decode(v) == COMMENT:
                        exif_fields[t] += 1
                elif v:
                    exif_fields[t] += 1
            with open(os.path.join(OUT_DIR, name), 'rb') as f:
                payloads = parse_com_payloads(f.read())
            stamp = next((p for p in payloads if p.startswith('PFN-TRACKING')), '')
            need = ['Title: ', 'Author: %s' % AUTHOR, 'Description: %s' % DESCRIPTION,
                    'Copyright: %s' % COPYRIGHT, 'Software: %s' % SOFTWARE,
                    'Source: %s' % SOURCE, 'Comment: %s' % COMMENT, 'Item: ']
            if stamp and all(s in stamp for s in need):
                n_com += 1
            else:
                failures.append('%s: COM stamp incomplete' % name)
        except Exception as e:
            failures.append('%s: %s' % (name, e))

    total = len(outs)
    print('check 1 decode fully:        %d/%d' % (n_decode, total))
    print('check 2 dimensions == source: %d/%d' % (n_dims, total))
    print('check 3 EXIF Artist+Copyright exact: %d/%d' % (n_exif, total))
    print('        EXIF ImageDescription present: %d/%d' % (exif_fields[270], total))
    print('        EXIF Software present:         %d/%d' % (exif_fields[305], total))
    print('        EXIF XPComment == Comment:     %d/%d' % (exif_fields[40092], total))
    print('check 4 COM stamp complete:  %d/%d' % (n_com, total))

    before = load_manifest(args.before_manifest)
    after = {name: sha256_file(os.path.join(SRC_DIR, name)) for name in srcs}
    manifest_same = (before == after)
    print('check 5 source manifest identical (before build == now): %s (%d entries)'
          % ('YES' if manifest_same else 'NO', len(after)))
    if not manifest_same:
        diff = [k for k in after if before.get(k) != after[k]]
        failures.append('manifest drift on: %s' % ', '.join(diff[:5]))

    if failures:
        print('FAILURES (%d):' % len(failures))
        for f in failures[:20]:
            print('  !! %s' % f)
        return 1
    print('ALL CHECKS PASS')
    return 0


if __name__ == '__main__':
    sys.exit(main())
