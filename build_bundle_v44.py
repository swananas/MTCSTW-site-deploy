#!/usr/bin/env python3
"""Bundle v4.4 builder: v4.3 bundle + wave44-verified picks ->
ugc-feed-v4.4-bank-20261027.

Modeled on build_bundle_v43.py: hard asserts on the input bundle, abort
rather than guess. The wave picks come from select_v44.py (gates verbatim
from select_bank.py) and pull_v44.py (every original MD5-verified against
the photo-lib census before it reaches this script).

New content cards:
- derivative: width cap 1080, JPEG quality 82 (the prior waves' recipe),
  written to website-feed-build/site-feed-media/ and copied into the
  deploy repo's site/feed-media/;
- date + date_basis: census creation_date when non-empty ('created'),
  else the wave date 2026-10-27 ('ingest'). Never an invented date.
Author spotlight cards and SLR network post cards pass through untouched.

Output bundle (mirrored pair, as every prior build):
website-feed-build/ugc-feed.json + mtcstw-site-deploy/site/feed/ugc-feed.json.
Wave audit: website-feed-build/ugc-feed-audit-v44.json.
Download twins in site/feed-media-dl/ are regenerated afterwards with the
deploy repo's build-feed-downloads.py (the standing PFN pipeline step).
"""
import json, os, re, shutil, sys, unicodedata, collections
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.expanduser('~/workspace/mtcstw-site-deploy')
IN_BUNDLE = os.path.join(HERE, 'ugc-feed.json')
OUT_BUNDLE_SITE = os.path.join(SITE, 'site/feed/ugc-feed.json')
VERIFIED = os.path.join(HERE, 'wave44-verified.json')
MASTERS = os.path.join(HERE, 'media-v44')
NAMED = os.path.join(HERE, 'media-v44-named')
DERIV_STAGE = os.path.join(HERE, 'site-feed-media')
DERIV_SITE = os.path.join(SITE, 'site/feed-media')
WAVE_DATE = '2026-10-27'


def slugify(s, maxlen=44):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()
    s = re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-').lower()
    return s[:maxlen].strip('-') or 'card'


def trim_headline(d):
    d = (d or '').strip()
    return d if len(d) <= 180 else d[:177].rsplit(' ', 1)[0] + '…'


def main():
    bundle = json.load(open(IN_BUNDLE))
    assert bundle['version'] == 'ugc-feed-v4.3-ranked-20261026', bundle['version']
    cards = bundle['cards']
    authors = [c for c in cards if c['type'] == 'author']
    network = [c for c in cards if c.get('provenance') == 'slr-network']
    content = [c for c in cards
               if c['type'] != 'author' and c.get('provenance') != 'slr-network']
    assert len(authors) == 61 and len(network) == 24 and len(content) == 791, \
        (len(authors), len(network), len(content))
    existing_ids = {c['id'] for c in cards}
    existing_images = {os.path.basename(c['image']) for c in content if c.get('image')}

    picks = json.load(open(VERIFIED))
    os.makedirs(NAMED, exist_ok=True)
    os.makedirs(DERIV_STAGE, exist_ok=True)
    new_cards, audit_cards, failures = [], [], []
    for i, p in enumerate(picks):
        slug = 'w%04d-%s-%s' % (i, p['feed_type'],
                                slugify(os.path.splitext(p['filename'])[0]))
        dname = slug + '.jpg'
        assert 'ugc-' + slug not in existing_ids, 'id collision ' + slug
        assert dname not in existing_images, 'image collision ' + dname
        ext = os.path.splitext(p['filename'])[1].lower()
        named_master = os.path.join(NAMED, slug + ext)
        shutil.copyfile(p['local_path'], named_master)
        try:
            im = Image.open(named_master).convert('RGB')
        except Exception as e:
            failures.append((p['filename'], 'image open fail: %s' % e))
            continue
        if im.width > 1080:
            im = im.resize((1080, int(im.height * 1080 / im.width)), Image.LANCZOS)
        staged = os.path.join(DERIV_STAGE, dname)
        im.save(staged, 'JPEG', quality=82, optimize=True)
        shutil.copyfile(staged, os.path.join(DERIV_SITE, dname))
        cd = (p.get('creation_date') or '')[:10]
        if cd:
            date, basis = cd, 'created'
        else:
            date, basis = WAVE_DATE, 'ingest'
        card = {'id': 'ugc-' + slug, 'type': p['feed_type'],
                'headline': trim_headline(p['description']),
                'image': '/feed-media/' + dname,
                'width': im.width, 'height': im.height,
                'date': date, 'date_basis': basis,
                'source': 'MTCSTW UGC Vault — ' + p['category'],
                'provenance': 'shane-ugc'}
        new_cards.append(card)
        audit_cards.append({'filename': p['filename'], 'md5': p['md5_verified'],
                            'category': p['category'], 'id': card['id'],
                            'feed_type': p['feed_type']})

    out_cards = content + new_cards + network + authors
    out = {
        'version': 'ugc-feed-v4.4-bank-20261027',
        'generated': WAVE_DATE,
        'source': ('Shane UGC only — UGC Vault Sorted (SSD) + Drive Memes + '
                   'Canva waves + v4.4 SSD wave (2026-10-27); plus SLR network '
                   'posts (build-time aggregation index, display-only) and '
                   'SLR author spotlights'),
        'count': len(out_cards),
        'cards': out_cards,
    }
    for path in (IN_BUNDLE, OUT_BUNDLE_SITE):
        json.dump(out, open(path, 'w'), indent=1)
    json.dump({'version': out['version'], 'generated': WAVE_DATE,
               'count_new': len(audit_cards), 'cards': audit_cards},
              open(os.path.join(HERE, 'ugc-feed-audit-v44.json'), 'w'), indent=1)
    json.dump(failures, open(os.path.join(HERE, 'wave44-build-failures.json'), 'w'), indent=1)
    print('bundle v4.4 written:', out['count'], 'cards')
    print('  prior content:', len(content), '| new:', len(new_cards),
          '| network:', len(network), '| authors:', len(authors))
    print('  new by type:', dict(collections.Counter(c['type'] for c in new_cards)))
    print('  new dating:', dict(collections.Counter(c['date_basis'] for c in new_cards)))
    print('  derivative failures:', failures)


if __name__ == '__main__':
    main()
