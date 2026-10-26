#!/usr/bin/env python3
"""Tier 1 post aggregator fetcher (Creator Studio concept §10 Fleet Aggregation).

   Reads the curated registry src/data/creator-sources.json, fetches each
   verified public source ONCE, and writes src/data/creator-posts.json for
   build-portfolios.py to render. Sources (Tier 1 only): Substack RSS,
   Bluesky public API (unauthenticated), podcast RSS (Buzzsprout).

   Rules (design: ~/workspace/website-feed-build/POST-AGGREGATOR-DESIGN.md §3):
   - Every post in the output comes from a live fetch made by THIS script.
     Nothing is invented, cached from research notes, or hand-entered.
   - Stale-while-error: if a fetch fails, that source's last-good posts from
     the previous creator-posts.json are kept and flagged; a source that has
     never succeeded contributes nothing. One bad feed never fails the build.
   - Aggregation is a display layer only — it NEVER becomes a Content Bank
     deposit, and only public posts are fetched (no accounts, no keys, no D1).
   - Top 5 posts per creator are kept, merged across that creator's sources,
     newest first. build-portfolios.py renders the top 3.
   Run from ~/workspace/mtcstw-site-deploy. Refresh cadence: weekly, manual,
   inside the normal ship cycle (no cron in Tier 1).
"""
import json, os, re, sys, html, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
REGISTRY = os.path.join(ROOT, 'src', 'data', 'creator-sources.json')
OUT = os.path.join(ROOT, 'src', 'data', 'creator-posts.json')
UA = 'MTCSTW-Portfolio-Aggregator/1.0 (+https://www.mtcstw.com; weekly public-feed fetch)'
TIMEOUT = 30
KEEP_PER_CREATOR = 5

PLATFORM_LABEL = {'substack': 'Substack', 'bluesky': 'Bluesky', 'podcast': 'Podcast'}

def now_iso():
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

def clean_text(s):
    s = html.unescape(str(s or ''))
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA,
                                                 'Accept': 'application/rss+xml, application/json, */*'})
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.status, r.read()

def parse_rfc822(s):
    try:
        d = parsedate_to_datetime(s)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.astimezone(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
    except Exception:
        return None

def fetch_rss(entry):
    """Substack + podcast RSS 2.0. Podcast items may carry no <link>
    (Buzzsprout) — fall back to the channel's declared show page."""
    status, body = fetch(entry['locator'])
    root = ET.fromstring(body)
    chan = root.find('channel')
    if chan is None:
        raise ValueError('no <channel> in feed')
    show_link = (chan.findtext('link') or '').strip()
    posts = []
    for item in chan.findall('item'):
        title = clean_text(item.findtext('title'))
        date = parse_rfc822(item.findtext('pubDate') or '')
        link = (item.findtext('link') or '').strip() or show_link
        if not title or not date or not link:
            continue
        posts.append({'platform': entry['platform'], 'title': title, 'date': date,
                      'url': link,
                      'action': 'LISTEN' if entry['kind'] == 'podcast-rss' else 'READ'})
    return status, posts

def fetch_bluesky(entry):
    handle = entry['locator'].lstrip('@')
    url = ('https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed'
           '?actor=%s&limit=30&filter=posts_no_replies' % handle)
    status, body = fetch(url)
    data = json.loads(body.decode('utf-8'))
    posts = []
    for item in (data.get('feed') or []):
        if item.get('reason'):
            continue  # a repost is not this creator's own post
        post = item.get('post') or {}
        author = (post.get('author') or {}).get('handle') or ''
        if author.lower() != handle.lower():
            continue
        rec = post.get('record') or {}
        text = clean_text(rec.get('text'))
        created = rec.get('createdAt') or post.get('indexedAt') or ''
        uri = post.get('uri') or ''
        rkey = uri.rsplit('/', 1)[-1] if uri else ''
        if not text or not created or not rkey:
            continue
        posts.append({'platform': entry['platform'], 'title': text, 'date': created,
                      'url': 'https://bsky.app/profile/%s/post/%s' % (handle, rkey),
                      'action': 'READ'})
    return status, posts

FETCHERS = {'substack': fetch_rss, 'podcast-rss': fetch_rss, 'bluesky': fetch_bluesky}

def main():
    registry = json.load(open(REGISTRY))
    prev = {}
    if os.path.exists(OUT):
        try:
            prev = (json.load(open(OUT)).get('creators') or {})
        except Exception:
            prev = {}
    # Index previous posts by (slug, platform) for stale-while-error.
    prev_by_source = {}
    for slug, cdata in prev.items():
        for p in (cdata.get('posts') or []):
            prev_by_source.setdefault((slug, p.get('platform')), []).append(p)

    creators = {}
    fetch_log = []
    failures = []
    for entry in registry['sources']:
        slug, kind = entry['slug'], entry['kind']
        label = PLATFORM_LABEL.get(entry['platform'], entry['platform'])
        rec = {'slug': slug, 'platform': entry['platform'], 'kind': kind,
               'locator': entry['locator'], 'fetched_at': now_iso()}
        try:
            status, posts = FETCHERS[kind](entry)
            posts.sort(key=lambda p: p['date'], reverse=True)
            rec.update({'status': 'ok', 'http': status, 'items_returned': len(posts)})
            kept = posts
            note = 'live fetch'
        except Exception as e:
            kept = prev_by_source.get((slug, entry['platform']), [])
            rec.update({'status': 'stale-kept' if kept else 'error',
                        'items_returned': len(kept),
                        'error': '%s: %s' % (type(e).__name__, e)})
            note = ('fetch FAILED (%s); kept %d last-good post(s)' % (e, len(kept))) if kept \
                else ('fetch FAILED (%s); no last-good posts — source contributes nothing' % e)
            failures.append('%s/%s: %s' % (slug, entry['platform'], e))
        bucket = creators.setdefault(slug, {'posts': [], 'sources': []})
        bucket['posts'].extend(kept)
        bucket['sources'].append(rec)
        line = ('[%s] %s · %s · %s -> %d post(s) — %s'
                % (rec['status'], slug, label, entry['locator'], len(kept), note))
        fetch_log.append(line)
        print(line)
        if kept:
            top = kept[0]
            print('         latest: %s · %s · %s' % (top['date'], top['title'][:110], top['url']))

    for slug, bucket in creators.items():
        merged = sorted(bucket['posts'], key=lambda p: p['date'], reverse=True)
        bucket['posts'] = merged[:KEEP_PER_CREATOR]

    out = {'generated': now_iso(),
           '_note': ('Build-time fetch output of build-post-aggregator.py from the curated '
                     'registry src/data/creator-sources.json. Every post here came from a live '
                     'public fetch (see fetch_log). Display-only aggregation (concept §10): '
                     'never a Content Bank deposit. Delete this file and regenerate portfolios '
                     'to roll the section back — pages return to byte-identical.'),
           'creators': creators, 'fetch_log': fetch_log}
    with open(OUT, 'w') as f:
        json.dump(out, f, indent=1, ensure_ascii=False, sort_keys=True)
    lit = [s for s, b in creators.items() if b['posts']]
    print('\nwrote %s' % OUT)
    print('creators with posts: %d (%s)' % (len(lit), ', '.join(sorted(lit))))
    if failures:
        print('FETCH FAILURES (%d): %s' % (len(failures), ' | '.join(failures)))
    return 0

if __name__ == '__main__':
    sys.exit(main())
