#!/usr/bin/env python3
"""Merge researcher output (research-group-a/b.json) into creators-db.json.
Run after both research agents report back. Idempotent."""
import json, os

BASE = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(BASE, 'creators-db.json')

db = json.load(open(DB))
by_slug = {c['slug']: c for c in db['creators']}

merged = 0
for grp in ('research-group-a.json', 'research-group-b.json'):
    p = os.path.join(BASE, grp)
    if not os.path.exists(p):
        print('missing:', grp); continue
    for r in json.load(open(p)):
        c = by_slug.get(r.get('slug'))
        if not c:
            print('unknown slug:', r.get('slug')); continue
        c['links'] = r.get('links', {}) or {}
        c['followers'] = r.get('followers', {}) or {}
        c['followers_as_of'] = r.get('followers_as_of')
        if r.get('notes'): c['notes'] = r['notes']
        merged += 1

# MTCSTW (user's own brand) — filled from verified standing facts, not research.
mtc = by_slug.get('mtcstw')
if mtc:
    mtc['links'] = {
        'instagram': 'https://www.instagram.com/mtcstw',
        'facebook': 'https://www.facebook.com/mtcstw',
    }
    mtc['followers'] = {'combined': 380000}
    mtc['followers_as_of'] = '2026-09-28'
    mtc['notes'] = 'User-confirmed 380K+ combined; real name never on site.'

db['meta']['research_merged'] = merged
db['meta']['status'] = 'STAGING — research merged %d/41. Not wired into the site.' % merged
json.dump(db, open(DB, 'w'), indent=1)
print('merged', merged, 'research records into', DB)

# Coverage report
no_links = [c['slug'] for c in db['creators'] if not c['links']]
no_counts = [c['slug'] for c in db['creators'] if not c['followers']]
no_pic = [c['slug'] for c in db['creators'] if not c['picture']]
print('missing links:', len(no_links), no_links)
print('missing follower counts:', len(no_counts), no_counts)
print('missing pictures:', len(no_pic), no_pic)
